import {
    AddFulfillmentToOrderResult,
    CancelOrderResult,
    CancelPaymentResult,
    MutationAddFulfillmentToOrderArgs,
    MutationAddManualPaymentToOrderArgs,
    MutationAddNoteToOrderArgs,
    MutationCancelOrderArgs,
    MutationCancelPaymentArgs,
    MutationDeleteOrderNoteArgs,
    MutationModifyOrderArgs,
    MutationRefundOrderArgs,
    MutationSetOrderCustomerArgs,
    MutationSetOrderCustomFieldsArgs,
    MutationSettlePaymentArgs,
    MutationSettleRefundArgs,
    MutationTransitionFulfillmentToStateArgs,
    MutationTransitionOrderToStateArgs,
    MutationTransitionPaymentToStateArgs,
    MutationUpdateOrderNoteArgs,
    QueryOrderArgs,
    QueryOrdersArgs,
    RefundOrderResult,
    SettlePaymentResult,
    TransitionPaymentToStateResult,
} from '@vendure/common/lib/generated-types';
import { PaginatedList } from '@vendure/common/lib/shared-types';
import { ErrorResultUnion } from '../../../common/error/error-result';
import { TransactionalConnection } from '../../../connection';
import { Fulfillment } from '../../../entity/fulfillment/fulfillment.entity';
import { Order } from '../../../entity/order/order.entity';
import { Payment } from '../../../entity/payment/payment.entity';
import { Refund } from '../../../entity/refund/refund.entity';
import { OrderService } from '../../../service/services/order.service';
import { RequestContext } from '../../common/request-context';
import { RelationPaths } from '../../decorators/relations.decorator';
export declare class OrderResolver {
    private orderService;
    private connection;
    constructor(orderService: OrderService, connection: TransactionalConnection);
    orders(
        ctx: RequestContext,
        args: QueryOrdersArgs,
        relations: RelationPaths<Order>,
    ): Promise<PaginatedList<Order>>;
    order(
        ctx: RequestContext,
        args: QueryOrderArgs,
        relations: RelationPaths<Order>,
    ): Promise<Order | undefined>;
    settlePayment(
        ctx: RequestContext,
        args: MutationSettlePaymentArgs,
    ): Promise<ErrorResultUnion<SettlePaymentResult, Payment>>;
    cancelPayment(
        ctx: RequestContext,
        args: MutationCancelPaymentArgs,
    ): Promise<ErrorResultUnion<CancelPaymentResult, Payment>>;
    addFulfillmentToOrder(
        ctx: RequestContext,
        args: MutationAddFulfillmentToOrderArgs,
    ): Promise<ErrorResultUnion<AddFulfillmentToOrderResult, Fulfillment>>;
    cancelOrder(
        ctx: RequestContext,
        args: MutationCancelOrderArgs,
    ): Promise<ErrorResultUnion<CancelOrderResult, Order>>;
    refundOrder(
        ctx: RequestContext,
        args: MutationRefundOrderArgs,
    ): Promise<ErrorResultUnion<RefundOrderResult, Refund>>;
    settleRefund(ctx: RequestContext, args: MutationSettleRefundArgs): Promise<Refund>;
    addNoteToOrder(ctx: RequestContext, args: MutationAddNoteToOrderArgs): Promise<Order>;
    updateOrderNote(
        ctx: RequestContext,
        args: MutationUpdateOrderNoteArgs,
    ): Promise<import('../../../entity/history-entry/history-entry.entity').HistoryEntry>;
    deleteOrderNote(
        ctx: RequestContext,
        args: MutationDeleteOrderNoteArgs,
    ): Promise<import('@vendure/common/lib/generated-types').DeletionResponse>;
    setOrderCustomFields(ctx: RequestContext, args: MutationSetOrderCustomFieldsArgs): Promise<Order>;
    setOrderCustomer(ctx: RequestContext, { input }: MutationSetOrderCustomerArgs): Promise<Order>;
    transitionOrderToState(
        ctx: RequestContext,
        args: MutationTransitionOrderToStateArgs,
    ): Promise<
        Order | import('../../../common/error/generated-graphql-shop-errors').OrderStateTransitionError
    >;
    transitionFulfillmentToState(
        ctx: RequestContext,
        args: MutationTransitionFulfillmentToStateArgs,
    ): Promise<import('../../..').FulfillmentStateTransitionError | Fulfillment>;
    transitionPaymentToState(
        ctx: RequestContext,
        args: MutationTransitionPaymentToStateArgs,
    ): Promise<ErrorResultUnion<TransitionPaymentToStateResult, Payment>>;
    modifyOrder(
        ctx: RequestContext,
        args: MutationModifyOrderArgs,
    ): Promise<ErrorResultUnion<import('@vendure/common/lib/generated-types').ModifyOrderResult, Order>>;
    addManualPaymentToOrder(
        ctx: RequestContext,
        args: MutationAddManualPaymentToOrderArgs,
    ): Promise<
        ErrorResultUnion<import('@vendure/common/lib/generated-types').AddManualPaymentToOrderResult, Order>
    >;
}
