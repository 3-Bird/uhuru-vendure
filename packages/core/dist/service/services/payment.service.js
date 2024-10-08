"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const typeorm_1 = require("typeorm");
const errors_1 = require("../../common/error/errors");
const generated_graphql_admin_errors_1 = require("../../common/error/generated-graphql-admin-errors");
const generated_graphql_shop_errors_1 = require("../../common/error/generated-graphql-shop-errors");
const utils_1 = require("../../common/utils");
const vendure_logger_1 = require("../../config/logger/vendure-logger");
const transactional_connection_1 = require("../../connection/transactional-connection");
const fulfillment_entity_1 = require("../../entity/fulfillment/fulfillment.entity");
const order_entity_1 = require("../../entity/order/order.entity");
const order_line_entity_1 = require("../../entity/order-line/order-line.entity");
const refund_line_entity_1 = require("../../entity/order-line-reference/refund-line.entity");
const payment_entity_1 = require("../../entity/payment/payment.entity");
const refund_entity_1 = require("../../entity/refund/refund.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const payment_state_transition_event_1 = require("../../event-bus/events/payment-state-transition-event");
const refund_state_transition_event_1 = require("../../event-bus/events/refund-state-transition-event");
const payment_state_machine_1 = require("../helpers/payment-state-machine/payment-state-machine");
const refund_state_machine_1 = require("../helpers/refund-state-machine/refund-state-machine");
const payment_method_service_1 = require("./payment-method.service");
/**
 * @description
 * Contains methods relating to {@link Payment} entities.
 *
 * @docsCategory services
 */
let PaymentService = class PaymentService {
    constructor(connection, paymentStateMachine, refundStateMachine, paymentMethodService, eventBus) {
        this.connection = connection;
        this.paymentStateMachine = paymentStateMachine;
        this.refundStateMachine = refundStateMachine;
        this.paymentMethodService = paymentMethodService;
        this.eventBus = eventBus;
    }
    async create(ctx, input) {
        const newPayment = new payment_entity_1.Payment(Object.assign(Object.assign({}, input), { state: this.paymentStateMachine.getInitialState() }));
        return this.connection.getRepository(ctx, payment_entity_1.Payment).save(newPayment);
    }
    async findOneOrThrow(ctx, id, relations = ['order']) {
        return await this.connection.getEntityOrThrow(ctx, payment_entity_1.Payment, id, {
            relations,
        });
    }
    /**
     * @description
     * Transitions a Payment to the given state.
     *
     * When updating a Payment in the context of an Order, it is
     * preferable to use the {@link OrderService} `transitionPaymentToState()` method, which will also handle
     * updating the Order state too.
     */
    async transitionToState(ctx, paymentId, state) {
        if (state === 'Settled') {
            return this.settlePayment(ctx, paymentId);
        }
        if (state === 'Cancelled') {
            return this.cancelPayment(ctx, paymentId);
        }
        const payment = await this.findOneOrThrow(ctx, paymentId);
        const fromState = payment.state;
        return this.transitionStateAndSave(ctx, payment, fromState, state);
    }
    getNextStates(payment) {
        return this.paymentStateMachine.getNextStates(payment);
    }
    /**
     * @description
     * Creates a new Payment.
     *
     * When creating a Payment in the context of an Order, it is
     * preferable to use the {@link OrderService} `addPaymentToOrder()` method, which will also handle
     * updating the Order state too.
     */
    async createPayment(ctx, order, amount, method, metadata) {
        const { paymentMethod, handler, checker } = await this.paymentMethodService.getMethodAndOperations(ctx, method);
        if (paymentMethod.checker && checker) {
            const eligible = await checker.check(ctx, order, paymentMethod.checker.args, paymentMethod);
            if (eligible === false || typeof eligible === 'string') {
                return new generated_graphql_shop_errors_1.IneligiblePaymentMethodError({
                    eligibilityCheckerMessage: typeof eligible === 'string' ? eligible : undefined,
                });
            }
        }
        const result = await handler.createPayment(ctx, order, amount, paymentMethod.handler.args, metadata || {}, paymentMethod);
        const initialState = 'Created';
        const payment = await this.connection
            .getRepository(ctx, payment_entity_1.Payment)
            .save(new payment_entity_1.Payment(Object.assign(Object.assign({}, result), { method, state: initialState })));
        const { finalize } = await this.paymentStateMachine.transition(ctx, order, payment, result.state);
        await this.connection.getRepository(ctx, payment_entity_1.Payment).save(payment, { reload: false });
        await this.connection
            .getRepository(ctx, order_entity_1.Order)
            .createQueryBuilder()
            .relation('payments')
            .of(order)
            .add(payment);
        await this.eventBus.publish(new payment_state_transition_event_1.PaymentStateTransitionEvent(initialState, result.state, ctx, payment, order));
        await finalize();
        return payment;
    }
    /**
     * @description
     * Settles a Payment.
     *
     * When settling a Payment in the context of an Order, it is
     * preferable to use the {@link OrderService} `settlePayment()` method, which will also handle
     * updating the Order state too.
     */
    async settlePayment(ctx, paymentId) {
        const payment = await this.connection.getEntityOrThrow(ctx, payment_entity_1.Payment, paymentId, {
            relations: ['order'],
        });
        const { paymentMethod, handler } = await this.paymentMethodService.getMethodAndOperations(ctx, payment.method);
        const settlePaymentResult = await handler.settlePayment(ctx, payment.order, payment, paymentMethod.handler.args, paymentMethod);
        const fromState = payment.state;
        let toState;
        payment.metadata = this.mergePaymentMetadata(payment.metadata, settlePaymentResult.metadata);
        if (settlePaymentResult.success) {
            toState = 'Settled';
        }
        else {
            toState = settlePaymentResult.state || 'Error';
            payment.errorMessage = settlePaymentResult.errorMessage;
        }
        return this.transitionStateAndSave(ctx, payment, fromState, toState);
    }
    async cancelPayment(ctx, paymentId) {
        const payment = await this.connection.getEntityOrThrow(ctx, payment_entity_1.Payment, paymentId, {
            relations: ['order'],
        });
        const { paymentMethod, handler } = await this.paymentMethodService.getMethodAndOperations(ctx, payment.method);
        const cancelPaymentResult = await handler.cancelPayment(ctx, payment.order, payment, paymentMethod.handler.args, paymentMethod);
        const fromState = payment.state;
        let toState;
        payment.metadata = this.mergePaymentMetadata(payment.metadata, cancelPaymentResult === null || cancelPaymentResult === void 0 ? void 0 : cancelPaymentResult.metadata);
        if (cancelPaymentResult == null || cancelPaymentResult.success) {
            toState = 'Cancelled';
        }
        else {
            toState = cancelPaymentResult.state || 'Error';
            payment.errorMessage = cancelPaymentResult.errorMessage;
        }
        return this.transitionStateAndSave(ctx, payment, fromState, toState);
    }
    async transitionStateAndSave(ctx, payment, fromState, toState) {
        if (fromState === toState) {
            // in case metadata was changed
            await this.connection.getRepository(ctx, payment_entity_1.Payment).save(payment, { reload: false });
            return payment;
        }
        let finalize;
        try {
            const result = await this.paymentStateMachine.transition(ctx, payment.order, payment, toState);
            finalize = result.finalize;
        }
        catch (e) {
            const transitionError = ctx.translate(e.message, { fromState, toState });
            return new generated_graphql_admin_errors_1.PaymentStateTransitionError({ transitionError, fromState, toState });
        }
        await this.connection.getRepository(ctx, payment_entity_1.Payment).save(payment, { reload: false });
        await this.eventBus.publish(new payment_state_transition_event_1.PaymentStateTransitionEvent(fromState, toState, ctx, payment, payment.order));
        await finalize();
        return payment;
    }
    /**
     * @description
     * Creates a Payment from the manual payment mutation in the Admin API
     *
     * When creating a manual Payment in the context of an Order, it is
     * preferable to use the {@link OrderService} `addManualPaymentToOrder()` method, which will also handle
     * updating the Order state too.
     */
    async createManualPayment(ctx, order, amount, input) {
        const initialState = 'Created';
        const endState = 'Settled';
        const payment = await this.connection.getRepository(ctx, payment_entity_1.Payment).save(new payment_entity_1.Payment({
            amount,
            order,
            transactionId: input.transactionId,
            metadata: input.metadata,
            method: input.method,
            state: initialState,
        }));
        const { finalize } = await this.paymentStateMachine.transition(ctx, order, payment, endState);
        await this.connection.getRepository(ctx, payment_entity_1.Payment).save(payment, { reload: false });
        await this.connection
            .getRepository(ctx, order_entity_1.Order)
            .createQueryBuilder()
            .relation('payments')
            .of(order)
            .add(payment);
        await this.eventBus.publish(new payment_state_transition_event_1.PaymentStateTransitionEvent(initialState, endState, ctx, payment, order));
        await finalize();
        return payment;
    }
    /**
     * @description
     * Creates a Refund against the specified Payment. If the amount to be refunded exceeds the value of the
     * specified Payment (in the case of multiple payments on a single Order), then the remaining outstanding
     * refund amount will be refunded against the next available Payment from the Order.
     *
     * When creating a Refund in the context of an Order, it is
     * preferable to use the {@link OrderService} `refundOrder()` method, which performs additional
     * validation.
     */
    async createRefund(ctx, input, order, selectedPayment) {
        var _a, _b;
        const orderWithRefunds = await this.connection.getEntityOrThrow(ctx, order_entity_1.Order, order.id, {
            relations: ['payments', 'payments.refunds'],
        });
        if (input.amount) {
            const paymentToRefund = orderWithRefunds.payments.find(p => (0, utils_1.idsAreEqual)(p.id, selectedPayment.id));
            if (!paymentToRefund) {
                throw new errors_1.InternalServerError('Could not find a Payment to refund');
            }
            const refundableAmount = paymentToRefund.amount - this.getPaymentRefundTotal(paymentToRefund);
            if (refundableAmount < input.amount) {
                return new generated_graphql_admin_errors_1.RefundAmountError({ maximumRefundable: refundableAmount });
            }
        }
        const refundsCreated = [];
        const refundablePayments = orderWithRefunds.payments.filter(p => {
            return this.getPaymentRefundTotal(p) < p.amount;
        });
        let primaryRefund;
        const refundedPaymentIds = [];
        const { total, orderLinesTotal } = await this.getRefundAmount(ctx, input);
        const refundMax = (_b = (_a = orderWithRefunds.payments) === null || _a === void 0 ? void 0 : _a.map(p => p.amount - this.getPaymentRefundTotal(p)).reduce((sum, amount) => sum + amount, 0)) !== null && _b !== void 0 ? _b : 0;
        let refundOutstanding = Math.min(total, refundMax);
        do {
            const paymentToRefund = (refundedPaymentIds.length === 0 &&
                refundablePayments.find(p => (0, utils_1.idsAreEqual)(p.id, selectedPayment.id))) ||
                refundablePayments.find(p => !refundedPaymentIds.includes(p.id));
            if (!paymentToRefund) {
                throw new errors_1.InternalServerError('Could not find a Payment to refund');
            }
            const amountNotRefunded = paymentToRefund.amount - this.getPaymentRefundTotal(paymentToRefund);
            const constrainedTotal = Math.min(amountNotRefunded, refundOutstanding);
            let refund = new refund_entity_1.Refund({
                payment: paymentToRefund,
                total: constrainedTotal,
                reason: input.reason,
                method: selectedPayment.method,
                state: 'Pending',
                metadata: {},
                items: orderLinesTotal, // deprecated
                adjustment: input.adjustment, // deprecated
                shipping: input.shipping, // deprecated
            });
            let paymentMethod;
            let handler;
            try {
                const methodAndHandler = await this.paymentMethodService.getMethodAndOperations(ctx, paymentToRefund.method);
                paymentMethod = methodAndHandler.paymentMethod;
                handler = methodAndHandler.handler;
            }
            catch (e) {
                vendure_logger_1.Logger.warn('Could not find a corresponding PaymentMethodHandler ' +
                    `when creating a refund for the Payment with method "${paymentToRefund.method}"`);
            }
            const createRefundResult = paymentMethod && handler
                ? await handler.createRefund(ctx, input, constrainedTotal, order, paymentToRefund, paymentMethod.handler.args, paymentMethod)
                : false;
            if (createRefundResult) {
                refund.transactionId = createRefundResult.transactionId || '';
                refund.metadata = createRefundResult.metadata || {};
            }
            refund = await this.connection.getRepository(ctx, refund_entity_1.Refund).save(refund);
            const refundLines = [];
            for (const { orderLineId, quantity } of input.lines) {
                const refundLine = await this.connection.getRepository(ctx, refund_line_entity_1.RefundLine).save(new refund_line_entity_1.RefundLine({
                    refund,
                    orderLineId,
                    quantity,
                }));
                refundLines.push(refundLine);
            }
            await this.connection
                .getRepository(ctx, fulfillment_entity_1.Fulfillment)
                .createQueryBuilder()
                .relation('lines')
                .of(refund)
                .add(refundLines);
            if (createRefundResult) {
                let finalize;
                const fromState = refund.state;
                try {
                    const result = await this.refundStateMachine.transition(ctx, order, refund, createRefundResult.state);
                    finalize = result.finalize;
                }
                catch (e) {
                    return new generated_graphql_admin_errors_1.RefundStateTransitionError({
                        transitionError: e.message,
                        fromState,
                        toState: createRefundResult.state,
                    });
                }
                await this.connection.getRepository(ctx, refund_entity_1.Refund).save(refund, { reload: false });
                await finalize();
                await this.eventBus.publish(new refund_state_transition_event_1.RefundStateTransitionEvent(fromState, createRefundResult.state, ctx, refund, order));
            }
            if (primaryRefund == null) {
                primaryRefund = refund;
            }
            refundsCreated.push(refund);
            refundedPaymentIds.push(paymentToRefund.id);
            refundOutstanding = total - (0, shared_utils_1.summate)(refundsCreated, 'total');
        } while (0 < refundOutstanding);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return primaryRefund;
    }
    /**
     * @description
     * Returns the total amount of all Refunds against the given Payment.
     */
    getPaymentRefundTotal(payment) {
        var _a, _b;
        const nonFailedRefunds = (_b = (_a = payment.refunds) === null || _a === void 0 ? void 0 : _a.filter(refund => refund.state !== 'Failed')) !== null && _b !== void 0 ? _b : [];
        return (0, shared_utils_1.summate)(nonFailedRefunds, 'total');
    }
    async getRefundAmount(ctx, input) {
        if (input.amount) {
            // This is the new way of getting the refund amount
            // after v2.2.0. It allows full control over the refund.
            return { orderLinesTotal: 0, total: input.amount };
        }
        // This is the pre-v2.2.0 way of getting the refund amount.
        // It calculates the refund amount based on the order lines to be refunded
        // plus shipping and adjustment amounts. It is complex and prevents full
        // control over refund amounts, especially when multiple payment methods
        // are involved.
        // It is deprecated and will be removed in a future version.
        let refundOrderLinesTotal = 0;
        const orderLines = await this.connection
            .getRepository(ctx, order_line_entity_1.OrderLine)
            .find({ where: { id: (0, typeorm_1.In)(input.lines.map(l => l.orderLineId)) } });
        for (const line of input.lines) {
            const orderLine = orderLines.find(l => (0, utils_1.idsAreEqual)(l.id, line.orderLineId));
            if (orderLine && 0 < orderLine.orderPlacedQuantity) {
                refundOrderLinesTotal += line.quantity * orderLine.proratedUnitPriceWithTax;
            }
        }
        const total = refundOrderLinesTotal + input.shipping + input.adjustment;
        return { orderLinesTotal: refundOrderLinesTotal, total };
    }
    mergePaymentMetadata(m1, m2) {
        if (!m2) {
            return m1;
        }
        const merged = Object.assign(Object.assign({}, m1), m2);
        if (m1.public && m1.public) {
            merged.public = Object.assign(Object.assign({}, m1.public), m2.public);
        }
        return merged;
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        payment_state_machine_1.PaymentStateMachine,
        refund_state_machine_1.RefundStateMachine,
        payment_method_service_1.PaymentMethodService,
        event_bus_1.EventBus])
], PaymentService);
//# sourceMappingURL=payment.service.js.map