import {
    AddPaymentToOrderResult,
    ApplyCouponCodeResult,
    PaymentInput,
    PaymentMethodQuote,
    RemoveOrderItemsResult,
    SetOrderShippingMethodResult,
    UpdateOrderItemsResult,
} from '@vendure/common/lib/generated-shop-types';
import {
    AddFulfillmentToOrderResult,
    AddManualPaymentToOrderResult,
    AddNoteToOrderInput,
    CancelOrderInput,
    CancelOrderResult,
    CancelPaymentResult,
    CreateAddressInput,
    DeletionResponse,
    FulfillOrderInput,
    ManualPaymentInput,
    ModifyOrderInput,
    ModifyOrderResult,
    OrderListOptions,
    OrderProcessState,
    RefundOrderInput,
    RefundOrderResult,
    SetOrderCustomerInput,
    SettlePaymentResult,
    SettleRefundInput,
    ShippingMethodQuote,
    TransitionPaymentToStateResult,
    UpdateOrderNoteInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { RelationPaths } from '../../api/decorators/relations.decorator';
import { RequestContextCacheService } from '../../cache/request-context-cache.service';
import { ErrorResultUnion } from '../../common/error/error-result';
import {
    FulfillmentStateTransitionError,
    RefundStateTransitionError,
} from '../../common/error/generated-graphql-admin-errors';
import { OrderStateTransitionError } from '../../common/error/generated-graphql-shop-errors';
import { ListQueryOptions } from '../../common/types/common-types';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Channel } from '../../entity/channel/channel.entity';
import { Customer } from '../../entity/customer/customer.entity';
import { Fulfillment } from '../../entity/fulfillment/fulfillment.entity';
import { HistoryEntry } from '../../entity/history-entry/history-entry.entity';
import { Order } from '../../entity/order/order.entity';
import { OrderLine } from '../../entity/order-line/order-line.entity';
import { OrderModification } from '../../entity/order-modification/order-modification.entity';
import { Payment } from '../../entity/payment/payment.entity';
import { Promotion } from '../../entity/promotion/promotion.entity';
import { Refund } from '../../entity/refund/refund.entity';
import { Surcharge } from '../../entity/surcharge/surcharge.entity';
import { User } from '../../entity/user/user.entity';
import { EventBus } from '../../event-bus/event-bus';
import { CustomFieldRelationService } from '../helpers/custom-field-relation/custom-field-relation.service';
import { FulfillmentState } from '../helpers/fulfillment-state-machine/fulfillment-state';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { OrderCalculator } from '../helpers/order-calculator/order-calculator';
import { OrderMerger } from '../helpers/order-merger/order-merger';
import { OrderModifier } from '../helpers/order-modifier/order-modifier';
import { OrderState } from '../helpers/order-state-machine/order-state';
import { OrderStateMachine } from '../helpers/order-state-machine/order-state-machine';
import { PaymentState } from '../helpers/payment-state-machine/payment-state';
import { RefundState } from '../helpers/refund-state-machine/refund-state';
import { RefundStateMachine } from '../helpers/refund-state-machine/refund-state-machine';
import { ShippingCalculator } from '../helpers/shipping-calculator/shipping-calculator';
import { TranslatorService } from '../helpers/translator/translator.service';
import { ChannelService } from './channel.service';
import { CountryService } from './country.service';
import { CustomerService } from './customer.service';
import { FulfillmentService } from './fulfillment.service';
import { HistoryService } from './history.service';
import { PaymentMethodService } from './payment-method.service';
import { PaymentService } from './payment.service';
import { ProductVariantService } from './product-variant.service';
import { PromotionService } from './promotion.service';
import { StockLevelService } from './stock-level.service';
/**
 * @description
 * Contains methods relating to {@link Order} entities.
 *
 * @docsCategory services
 */
export declare class OrderService {
    private connection;
    private configService;
    private productVariantService;
    private customerService;
    private countryService;
    private orderCalculator;
    private shippingCalculator;
    private orderStateMachine;
    private orderMerger;
    private paymentService;
    private paymentMethodService;
    private fulfillmentService;
    private listQueryBuilder;
    private refundStateMachine;
    private historyService;
    private promotionService;
    private eventBus;
    private channelService;
    private orderModifier;
    private customFieldRelationService;
    private requestCache;
    private translator;
    private stockLevelService;
    constructor(
        connection: TransactionalConnection,
        configService: ConfigService,
        productVariantService: ProductVariantService,
        customerService: CustomerService,
        countryService: CountryService,
        orderCalculator: OrderCalculator,
        shippingCalculator: ShippingCalculator,
        orderStateMachine: OrderStateMachine,
        orderMerger: OrderMerger,
        paymentService: PaymentService,
        paymentMethodService: PaymentMethodService,
        fulfillmentService: FulfillmentService,
        listQueryBuilder: ListQueryBuilder,
        refundStateMachine: RefundStateMachine,
        historyService: HistoryService,
        promotionService: PromotionService,
        eventBus: EventBus,
        channelService: ChannelService,
        orderModifier: OrderModifier,
        customFieldRelationService: CustomFieldRelationService,
        requestCache: RequestContextCacheService,
        translator: TranslatorService,
        stockLevelService: StockLevelService,
    );
    /**
     * @description
     * Returns an array of all the configured states and transitions of the order process. This is
     * based on the default order process plus all configured {@link OrderProcess} objects
     * defined in the {@link OrderOptions} `process` array.
     */
    getOrderProcessStates(): OrderProcessState[];
    findAll(
        ctx: RequestContext,
        options?: OrderListOptions,
        relations?: RelationPaths<Order>,
    ): Promise<PaginatedList<Order>>;
    findOne(ctx: RequestContext, orderId: ID, relations?: RelationPaths<Order>): Promise<Order | undefined>;
    findOneByCode(
        ctx: RequestContext,
        orderCode: string,
        relations?: RelationPaths<Order>,
    ): Promise<Order | undefined>;
    findOneByOrderLineId(
        ctx: RequestContext,
        orderLineId: ID,
        relations?: RelationPaths<Order>,
    ): Promise<Order | undefined>;
    findByCustomerId(
        ctx: RequestContext,
        customerId: ID,
        options?: ListQueryOptions<Order>,
        relations?: RelationPaths<Order>,
    ): Promise<PaginatedList<Order>>;
    /**
     * @description
     * Returns all {@link Payment} entities associated with the Order.
     */
    getOrderPayments(ctx: RequestContext, orderId: ID): Promise<Payment[]>;
    /**
     * @description
     * Returns an array of any {@link OrderModification} entities associated with the Order.
     */
    getOrderModifications(ctx: RequestContext, orderId: ID): Promise<OrderModification[]>;
    /**
     * @description
     * Returns any {@link Refund}s associated with a {@link Payment}.
     */
    getPaymentRefunds(ctx: RequestContext, paymentId: ID): Promise<Refund[]>;
    getSellerOrders(ctx: RequestContext, order: Order): Promise<Order[]>;
    getAggregateOrder(ctx: RequestContext, order: Order): Promise<Order | undefined>;
    getOrderChannels(ctx: RequestContext, order: Order): Promise<Channel[]>;
    /**
     * @description
     * Returns any Order associated with the specified User's Customer account
     * that is still in the `active` state.
     */
    getActiveOrderForUser(ctx: RequestContext, userId: ID): Promise<Order | undefined>;
    /**
     * @description
     * Creates a new, empty Order. If a `userId` is passed, the Order will get associated with that
     * User's Customer account.
     */
    create(ctx: RequestContext, userId?: ID): Promise<Order>;
    createDraft(ctx: RequestContext): Promise<Order>;
    private createEmptyOrderEntity;
    /**
     * @description
     * Updates the custom fields of an Order.
     */
    updateCustomFields(ctx: RequestContext, orderId: ID, customFields: any): Promise<Order>;
    /**
     * @description
     * Updates the Customer which is assigned to a given Order. The target Customer must be assigned to the same
     * Channels as the Order, otherwise an error will be thrown.
     *
     * @since 2.2.0
     */
    updateOrderCustomer(
        ctx: RequestContext,
        { customerId, orderId, note }: SetOrderCustomerInput,
    ): Promise<Order>;
    /**
     * @description
     * Adds an item to the Order, either creating a new OrderLine or
     * incrementing an existing one.
     */
    addItemToOrder(
        ctx: RequestContext,
        orderId: ID,
        productVariantId: ID,
        quantity: number,
        customFields?: {
            [key: string]: any;
        },
        relations?: RelationPaths<Order>,
    ): Promise<ErrorResultUnion<UpdateOrderItemsResult, Order>>;
    /**
     * @description
     * Adjusts the quantity and/or custom field values of an existing OrderLine.
     */
    adjustOrderLine(
        ctx: RequestContext,
        orderId: ID,
        orderLineId: ID,
        quantity: number,
        customFields?: {
            [key: string]: any;
        },
        relations?: RelationPaths<Order>,
    ): Promise<ErrorResultUnion<UpdateOrderItemsResult, Order>>;
    /**
     * @description
     * Removes the specified OrderLine from the Order.
     */
    removeItemFromOrder(
        ctx: RequestContext,
        orderId: ID,
        orderLineId: ID,
    ): Promise<ErrorResultUnion<RemoveOrderItemsResult, Order>>;
    /**
     * @description
     * Removes all OrderLines from the Order.
     */
    removeAllItemsFromOrder(
        ctx: RequestContext,
        orderId: ID,
    ): Promise<ErrorResultUnion<RemoveOrderItemsResult, Order>>;
    /**
     * @description
     * Adds a {@link Surcharge} to the Order.
     */
    addSurchargeToOrder(
        ctx: RequestContext,
        orderId: ID,
        surchargeInput: Partial<Omit<Surcharge, 'id' | 'createdAt' | 'updatedAt' | 'order'>>,
    ): Promise<Order>;
    /**
     * @description
     * Removes a {@link Surcharge} from the Order.
     */
    removeSurchargeFromOrder(ctx: RequestContext, orderId: ID, surchargeId: ID): Promise<Order>;
    /**
     * @description
     * Applies a coupon code to the Order, which should be a valid coupon code as specified in the configuration
     * of an active {@link Promotion}.
     */
    applyCouponCode(
        ctx: RequestContext,
        orderId: ID,
        couponCode: string,
    ): Promise<ErrorResultUnion<ApplyCouponCodeResult, Order>>;
    /**
     * @description
     * Removes a coupon code from the Order.
     */
    removeCouponCode(ctx: RequestContext, orderId: ID, couponCode: string): Promise<Order>;
    /**
     * @description
     * Returns all {@link Promotion}s associated with an Order.
     */
    getOrderPromotions(ctx: RequestContext, orderId: ID): Promise<Promotion[]>;
    /**
     * @description
     * Returns the next possible states that the Order may transition to.
     */
    getNextOrderStates(order: Order): readonly OrderState[];
    /**
     * @description
     * Sets the shipping address for the Order.
     */
    setShippingAddress(ctx: RequestContext, orderId: ID, input: CreateAddressInput): Promise<Order>;
    /**
     * @description
     * Sets the billing address for the Order.
     */
    setBillingAddress(ctx: RequestContext, orderId: ID, input: CreateAddressInput): Promise<Order>;
    /**
     * @description
     * Returns an array of quotes stating which {@link ShippingMethod}s may be applied to this Order.
     * This is determined by the configured {@link ShippingEligibilityChecker} of each ShippingMethod.
     *
     * The quote also includes a price for each method, as determined by the configured
     * {@link ShippingCalculator} of each eligible ShippingMethod.
     */
    getEligibleShippingMethods(ctx: RequestContext, orderId: ID): Promise<ShippingMethodQuote[]>;
    /**
     * @description
     * Returns an array of quotes stating which {@link PaymentMethod}s may be used on this Order.
     */
    getEligiblePaymentMethods(ctx: RequestContext, orderId: ID): Promise<PaymentMethodQuote[]>;
    /**
     * @description
     * Sets the ShippingMethod to be used on this Order.
     */
    setShippingMethod(
        ctx: RequestContext,
        orderId: ID,
        shippingMethodIds: ID[],
    ): Promise<ErrorResultUnion<SetOrderShippingMethodResult, Order>>;
    /**
     * @description
     * Transitions the Order to the given state.
     */
    transitionToState(
        ctx: RequestContext,
        orderId: ID,
        state: OrderState,
    ): Promise<Order | OrderStateTransitionError>;
    /**
     * @description
     * Transitions a Fulfillment to the given state and then transitions the Order state based on
     * whether all Fulfillments of the Order are shipped or delivered.
     */
    transitionFulfillmentToState(
        ctx: RequestContext,
        fulfillmentId: ID,
        state: FulfillmentState,
    ): Promise<Fulfillment | FulfillmentStateTransitionError>;
    /**
     * @description
     * Transitions a Refund to the given state
     */
    transitionRefundToState(
        ctx: RequestContext,
        refundId: ID,
        state: RefundState,
        transactionId?: string,
    ): Promise<Refund | RefundStateTransitionError>;
    /**
     * @description
     * Allows the Order to be modified, which allows several aspects of the Order to be changed:
     *
     * * Changes to OrderLine quantities
     * * New OrderLines being added
     * * Arbitrary {@link Surcharge}s being added
     * * Shipping or billing address changes
     *
     * Setting the `dryRun` input property to `true` will apply all changes, including updating the price of the
     * Order, except history entry and additional payment actions.
     *
     * __Using dryRun option, you must wrap function call in transaction manually.__
     *
     */
    modifyOrder(
        ctx: RequestContext,
        input: ModifyOrderInput,
    ): Promise<ErrorResultUnion<ModifyOrderResult, Order>>;
    /**
     * @description
     * Transitions the given {@link Payment} to a new state. If the order totalWithTax price is then
     * covered by Payments, the Order state will be automatically transitioned to `PaymentSettled`
     * or `PaymentAuthorized`.
     */
    transitionPaymentToState(
        ctx: RequestContext,
        paymentId: ID,
        state: PaymentState,
    ): Promise<ErrorResultUnion<TransitionPaymentToStateResult, Payment>>;
    /**
     * @description
     * Adds a new Payment to the Order. If the Order totalWithTax is covered by Payments, then the Order
     * state will get automatically transitioned to the `PaymentSettled` or `PaymentAuthorized` state.
     */
    addPaymentToOrder(
        ctx: RequestContext,
        orderId: ID,
        input: PaymentInput,
    ): Promise<ErrorResultUnion<AddPaymentToOrderResult, Order>>;
    /**
     * @description
     * We can add a Payment to the order if:
     * 1. the Order is in the `ArrangingPayment` state or
     * 2. the Order's current state can transition to `PaymentAuthorized` and `PaymentSettled`
     */
    private canAddPaymentToOrder;
    /**
     * @description
     * This method is used after modifying an existing completed order using the `modifyOrder()` method. If the modifications
     * cause the order total to increase (such as when adding a new OrderLine), then there will be an outstanding charge to
     * pay.
     *
     * This method allows you to add a new Payment and assumes the actual processing has been done manually, e.g. in the
     * dashboard of your payment provider.
     */
    addManualPaymentToOrder(
        ctx: RequestContext,
        input: ManualPaymentInput,
    ): Promise<ErrorResultUnion<AddManualPaymentToOrderResult, Order>>;
    /**
     * @description
     * Settles a payment by invoking the {@link PaymentMethodHandler}'s `settlePayment()` method. Automatically
     * transitions the Order state if all Payments are settled.
     */
    settlePayment(
        ctx: RequestContext,
        paymentId: ID,
    ): Promise<ErrorResultUnion<SettlePaymentResult, Payment>>;
    /**
     * @description
     * Cancels a payment by invoking the {@link PaymentMethodHandler}'s `cancelPayment()` method (if defined), and transitions the Payment to
     * the `Cancelled` state.
     */
    cancelPayment(
        ctx: RequestContext,
        paymentId: ID,
    ): Promise<ErrorResultUnion<CancelPaymentResult, Payment>>;
    /**
     * @description
     * Creates a new Fulfillment associated with the given Order and OrderItems.
     */
    createFulfillment(
        ctx: RequestContext,
        input: FulfillOrderInput,
    ): Promise<ErrorResultUnion<AddFulfillmentToOrderResult, Fulfillment>>;
    private requestedFulfillmentQuantityExceedsLineQuantity;
    private ensureSufficientStockForFulfillment;
    /**
     * @description
     * Returns an array of all Fulfillments associated with the Order.
     */
    getOrderFulfillments(ctx: RequestContext, order: Order): Promise<Fulfillment[]>;
    /**
     * @description
     * Returns an array of all Surcharges associated with the Order.
     */
    getOrderSurcharges(ctx: RequestContext, orderId: ID): Promise<Surcharge[]>;
    /**
     * @description
     * Cancels an Order by transitioning it to the `Cancelled` state. If stock is being tracked for the ProductVariants
     * in the Order, then new {@link StockMovement}s will be created to correct the stock levels.
     */
    cancelOrder(
        ctx: RequestContext,
        input: CancelOrderInput,
    ): Promise<ErrorResultUnion<CancelOrderResult, Order>>;
    private cancelOrderById;
    /**
     * @description
     * Creates a {@link Refund} against the order and in doing so invokes the `createRefund()` method of the
     * {@link PaymentMethodHandler}.
     */
    refundOrder(
        ctx: RequestContext,
        input: RefundOrderInput,
    ): Promise<ErrorResultUnion<RefundOrderResult, Refund>>;
    /**
     * @description
     * Settles a Refund by transitioning it to the `Settled` state.
     */
    settleRefund(ctx: RequestContext, input: SettleRefundInput): Promise<Refund>;
    /**
     * @description
     * Associates a Customer with the Order.
     */
    addCustomerToOrder(ctx: RequestContext, orderIdOrOrder: ID | Order, customer: Customer): Promise<Order>;
    /**
     * @description
     * Creates a new "ORDER_NOTE" type {@link OrderHistoryEntry} in the Order's history timeline.
     */
    addNoteToOrder(ctx: RequestContext, input: AddNoteToOrderInput): Promise<Order>;
    updateOrderNote(ctx: RequestContext, input: UpdateOrderNoteInput): Promise<HistoryEntry>;
    deleteOrderNote(ctx: RequestContext, id: ID): Promise<DeletionResponse>;
    /**
     * @description
     * Deletes an Order, ensuring that any Sessions that reference this Order are dereferenced before deletion.
     *
     * @since 1.5.0
     */
    deleteOrder(ctx: RequestContext, orderOrId: ID | Order): Promise<void>;
    /**
     * @description
     * When a guest user with an anonymous Order signs in and has an existing Order associated with that Customer,
     * we need to reconcile the contents of the two orders.
     *
     * The logic used to do the merging is specified in the {@link OrderOptions} `mergeStrategy` config setting.
     */
    mergeOrders(
        ctx: RequestContext,
        user: User,
        guestOrder?: Order,
        existingOrder?: Order,
    ): Promise<Order | undefined>;
    private getOrderOrThrow;
    private getOrderLineOrThrow;
    /**
     * Returns error if quantity is negative.
     */
    private assertQuantityIsPositive;
    /**
     * Returns error if the Order is not in the "AddingItems" or "Draft" state.
     */
    private assertAddingItemsState;
    /**
     * Throws if adding the given quantity would take the total order items over the
     * maximum limit specified in the config.
     */
    private assertNotOverOrderItemsLimit;
    /**
     * Throws if adding the given quantity would exceed the maximum allowed
     * quantity for one order line.
     */
    private assertNotOverOrderLineItemsLimit;
    /**
     * @description
     * Applies promotions, taxes and shipping to the Order. If the `updatedOrderLines` argument is passed in,
     * then all of those OrderLines will have their prices re-calculated using the configured {@link OrderItemPriceCalculationStrategy}.
     */
    applyPriceAdjustments(
        ctx: RequestContext,
        order: Order,
        updatedOrderLines?: OrderLine[],
        relations?: RelationPaths<Order>,
    ): Promise<Order>;
    /**
     * Applies changes to the shipping lines of an order, adding or removing the relations
     * in the database.
     */
    private applyChangesToShippingLines;
}
