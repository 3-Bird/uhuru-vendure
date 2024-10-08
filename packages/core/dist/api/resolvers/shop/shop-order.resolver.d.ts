import {
    ActiveOrderResult,
    AddPaymentToOrderResult,
    ApplyCouponCodeResult,
    MutationAddItemToOrderArgs,
    MutationAddPaymentToOrderArgs,
    MutationAdjustOrderLineArgs,
    MutationApplyCouponCodeArgs,
    MutationRemoveOrderLineArgs,
    MutationSetCustomerForOrderArgs,
    MutationSetOrderBillingAddressArgs,
    MutationSetOrderCustomFieldsArgs,
    MutationSetOrderShippingAddressArgs,
    MutationSetOrderShippingMethodArgs,
    MutationTransitionOrderToStateArgs,
    PaymentMethodQuote,
    QueryOrderArgs,
    QueryOrderByCodeArgs,
    RemoveOrderItemsResult,
    SetCustomerForOrderResult,
    SetOrderShippingMethodResult,
    ShippingMethodQuote,
    TransitionOrderToStateResult,
    UpdateOrderItemsResult,
} from '@vendure/common/lib/generated-shop-types';
import { QueryCountriesArgs } from '@vendure/common/lib/generated-types';
import { ErrorResultUnion } from '../../../common/error/error-result';
import { Translated } from '../../../common/types/locale-types';
import { ACTIVE_ORDER_INPUT_FIELD_NAME, ConfigService } from '../../../config';
import { Country } from '../../../entity';
import { Order } from '../../../entity/order/order.entity';
import { ActiveOrderService, CountryService } from '../../../service';
import { CustomerService } from '../../../service/services/customer.service';
import { OrderService } from '../../../service/services/order.service';
import { SessionService } from '../../../service/services/session.service';
import { RequestContext } from '../../common/request-context';
import { RelationPaths } from '../../decorators/relations.decorator';
type ActiveOrderArgs = {
    [ACTIVE_ORDER_INPUT_FIELD_NAME]?: any;
};
export declare class ShopOrderResolver {
    private orderService;
    private customerService;
    private sessionService;
    private countryService;
    private activeOrderService;
    private configService;
    constructor(
        orderService: OrderService,
        customerService: CustomerService,
        sessionService: SessionService,
        countryService: CountryService,
        activeOrderService: ActiveOrderService,
        configService: ConfigService,
    );
    availableCountries(ctx: RequestContext, args: QueryCountriesArgs): Promise<Array<Translated<Country>>>;
    order(
        ctx: RequestContext,
        args: QueryOrderArgs,
        relations: RelationPaths<Order>,
    ): Promise<Order | undefined>;
    activeOrder(
        ctx: RequestContext,
        relations: RelationPaths<Order>,
        args: ActiveOrderArgs,
    ): Promise<Order | undefined>;
    orderByCode(
        ctx: RequestContext,
        args: QueryOrderByCodeArgs,
        relations: RelationPaths<Order>,
    ): Promise<Order | undefined>;
    setOrderShippingAddress(
        ctx: RequestContext,
        args: MutationSetOrderShippingAddressArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<ActiveOrderResult, Order>>;
    setOrderBillingAddress(
        ctx: RequestContext,
        args: MutationSetOrderBillingAddressArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<ActiveOrderResult, Order>>;
    eligibleShippingMethods(ctx: RequestContext, args: ActiveOrderArgs): Promise<ShippingMethodQuote[]>;
    eligiblePaymentMethods(ctx: RequestContext, args: ActiveOrderArgs): Promise<PaymentMethodQuote[]>;
    setOrderShippingMethod(
        ctx: RequestContext,
        args: MutationSetOrderShippingMethodArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<SetOrderShippingMethodResult, Order>>;
    setOrderCustomFields(
        ctx: RequestContext,
        args: MutationSetOrderCustomFieldsArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<ActiveOrderResult, Order>>;
    nextOrderStates(ctx: RequestContext, args: ActiveOrderArgs): Promise<readonly string[]>;
    transitionOrderToState(
        ctx: RequestContext,
        args: MutationTransitionOrderToStateArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<TransitionOrderToStateResult, Order> | undefined>;
    addItemToOrder(
        ctx: RequestContext,
        args: MutationAddItemToOrderArgs & ActiveOrderArgs,
        relations: RelationPaths<Order>,
    ): Promise<ErrorResultUnion<UpdateOrderItemsResult, Order>>;
    adjustOrderLine(
        ctx: RequestContext,
        args: MutationAdjustOrderLineArgs & ActiveOrderArgs,
        relations: RelationPaths<Order>,
    ): Promise<ErrorResultUnion<UpdateOrderItemsResult, Order>>;
    removeOrderLine(
        ctx: RequestContext,
        args: MutationRemoveOrderLineArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<RemoveOrderItemsResult, Order>>;
    removeAllOrderLines(
        ctx: RequestContext,
        args: ActiveOrderArgs,
    ): Promise<ErrorResultUnion<RemoveOrderItemsResult, Order>>;
    applyCouponCode(
        ctx: RequestContext,
        args: MutationApplyCouponCodeArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<ApplyCouponCodeResult, Order>>;
    removeCouponCode(
        ctx: RequestContext,
        args: MutationApplyCouponCodeArgs & ActiveOrderArgs,
    ): Promise<Order>;
    addPaymentToOrder(
        ctx: RequestContext,
        args: MutationAddPaymentToOrderArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<AddPaymentToOrderResult, Order>>;
    setCustomerForOrder(
        ctx: RequestContext,
        args: MutationSetCustomerForOrderArgs & ActiveOrderArgs,
    ): Promise<ErrorResultUnion<SetCustomerForOrderResult, Order>>;
}
export {};
