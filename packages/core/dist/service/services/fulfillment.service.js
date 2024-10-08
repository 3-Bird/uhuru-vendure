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
exports.FulfillmentService = void 0;
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const unique_1 = require("@vendure/common/lib/unique");
const typeorm_1 = require("typeorm");
const generated_graphql_admin_errors_1 = require("../../common/error/generated-graphql-admin-errors");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const fulfillment_entity_1 = require("../../entity/fulfillment/fulfillment.entity");
const order_entity_1 = require("../../entity/order/order.entity");
const order_line_entity_1 = require("../../entity/order-line/order-line.entity");
const fulfillment_line_entity_1 = require("../../entity/order-line-reference/fulfillment-line.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const fulfillment_event_1 = require("../../event-bus/events/fulfillment-event");
const fulfillment_state_transition_event_1 = require("../../event-bus/events/fulfillment-state-transition-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const fulfillment_state_machine_1 = require("../helpers/fulfillment-state-machine/fulfillment-state-machine");
/**
 * @description
 * Contains methods relating to {@link Fulfillment} entities.
 *
 * @docsCategory services
 */
let FulfillmentService = class FulfillmentService {
    constructor(connection, fulfillmentStateMachine, eventBus, configService, customFieldRelationService) {
        this.connection = connection;
        this.fulfillmentStateMachine = fulfillmentStateMachine;
        this.eventBus = eventBus;
        this.configService = configService;
        this.customFieldRelationService = customFieldRelationService;
    }
    /**
     * @description
     * Creates a new Fulfillment for the given Orders and OrderItems, using the specified
     * {@link FulfillmentHandler}.
     */
    async create(ctx, orders, lines, handler) {
        const fulfillmentHandler = this.configService.shippingOptions.fulfillmentHandlers.find(h => h.code === handler.code);
        if (!fulfillmentHandler) {
            return new generated_graphql_admin_errors_1.InvalidFulfillmentHandlerError();
        }
        let fulfillmentPartial;
        try {
            fulfillmentPartial = await fulfillmentHandler.createFulfillment(ctx, orders, lines, handler.arguments);
        }
        catch (e) {
            let message = 'No error message';
            if ((0, shared_utils_1.isObject)(e)) {
                message = e.message || e.toString();
            }
            return new generated_graphql_admin_errors_1.CreateFulfillmentError({ fulfillmentHandlerError: message });
        }
        const orderLines = await this.connection
            .getRepository(ctx, order_line_entity_1.OrderLine)
            .find({ where: { id: (0, typeorm_1.In)(lines.map(l => l.orderLineId)) } });
        const newFulfillment = await this.connection.getRepository(ctx, fulfillment_entity_1.Fulfillment).save(new fulfillment_entity_1.Fulfillment(Object.assign(Object.assign({ method: '', trackingCode: '' }, fulfillmentPartial), { lines: [], state: this.fulfillmentStateMachine.getInitialState(), handlerCode: fulfillmentHandler.code })));
        const fulfillmentLines = [];
        for (const { orderLineId, quantity } of lines) {
            const fulfillmentLine = await this.connection.getRepository(ctx, fulfillment_line_entity_1.FulfillmentLine).save(new fulfillment_line_entity_1.FulfillmentLine({
                orderLineId,
                quantity,
            }));
            fulfillmentLines.push(fulfillmentLine);
        }
        await this.connection
            .getRepository(ctx, fulfillment_entity_1.Fulfillment)
            .createQueryBuilder()
            .relation('lines')
            .of(newFulfillment)
            .add(fulfillmentLines);
        const fulfillmentWithRelations = await this.customFieldRelationService.updateRelations(ctx, fulfillment_entity_1.Fulfillment, fulfillmentPartial, newFulfillment);
        await this.eventBus.publish(new fulfillment_event_1.FulfillmentEvent(ctx, fulfillmentWithRelations, {
            orders,
            lines,
            handler,
        }));
        return newFulfillment;
    }
    async getFulfillmentLines(ctx, id) {
        return this.connection
            .getEntityOrThrow(ctx, fulfillment_entity_1.Fulfillment, id, {
            relations: ['lines'],
        })
            .then(fulfillment => fulfillment.lines);
    }
    async getFulfillmentsLinesForOrderLine(ctx, orderLineId, relations = []) {
        const defaultRelations = ['fulfillment'];
        return this.connection.getRepository(ctx, fulfillment_line_entity_1.FulfillmentLine).find({
            relations: Array.from(new Set([...defaultRelations, ...relations])),
            where: {
                fulfillment: {
                    state: (0, typeorm_1.Not)('Cancelled'),
                },
                orderLineId,
            },
        });
    }
    /**
     * @description
     * Transitions the specified Fulfillment to a new state and upon successful transition
     * publishes a {@link FulfillmentStateTransitionEvent}.
     */
    async transitionToState(ctx, fulfillmentId, state) {
        const fulfillment = await this.connection.getEntityOrThrow(ctx, fulfillment_entity_1.Fulfillment, fulfillmentId, {
            relations: ['lines'],
        });
        const orderLinesIds = (0, unique_1.unique)(fulfillment.lines.map(lines => lines.orderLineId));
        const orders = await this.connection
            .getRepository(ctx, order_entity_1.Order)
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.lines', 'line')
            .where('line.id IN (:...lineIds)', { lineIds: orderLinesIds })
            .getMany();
        const fromState = fulfillment.state;
        let finalize;
        try {
            const result = await this.fulfillmentStateMachine.transition(ctx, fulfillment, orders, state);
            finalize = result.finalize;
        }
        catch (e) {
            const transitionError = ctx.translate(e.message, { fromState, toState: state });
            return new generated_graphql_admin_errors_1.FulfillmentStateTransitionError({ transitionError, fromState, toState: state });
        }
        await this.connection.getRepository(ctx, fulfillment_entity_1.Fulfillment).save(fulfillment, { reload: false });
        await this.eventBus.publish(new fulfillment_state_transition_event_1.FulfillmentStateTransitionEvent(fromState, state, ctx, fulfillment));
        await finalize();
        return { fulfillment, orders, fromState, toState: state };
    }
    /**
     * @description
     * Returns an array of the next valid states for the Fulfillment.
     */
    getNextStates(fulfillment) {
        return this.fulfillmentStateMachine.getNextStates(fulfillment);
    }
};
exports.FulfillmentService = FulfillmentService;
exports.FulfillmentService = FulfillmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        fulfillment_state_machine_1.FulfillmentStateMachine,
        event_bus_1.EventBus,
        config_service_1.ConfigService,
        custom_field_relation_service_1.CustomFieldRelationService])
], FulfillmentService);
//# sourceMappingURL=fulfillment.service.js.map