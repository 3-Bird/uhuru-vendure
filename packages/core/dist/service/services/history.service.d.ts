import { UpdateCustomerInput as UpdateCustomerShopInput } from '@vendure/common/lib/generated-shop-types';
import {
    HistoryEntryListOptions,
    HistoryEntryType,
    OrderLineInput,
    UpdateAddressInput,
    UpdateCustomerInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { CustomerHistoryEntry } from '../../entity/history-entry/customer-history-entry.entity';
import { OrderHistoryEntry } from '../../entity/history-entry/order-history-entry.entity';
import { EventBus } from '../../event-bus';
import { FulfillmentState } from '../helpers/fulfillment-state-machine/fulfillment-state';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { OrderState } from '../helpers/order-state-machine/order-state';
import { PaymentState } from '../helpers/payment-state-machine/payment-state';
import { RefundState } from '../helpers/refund-state-machine/refund-state';
import { AdministratorService } from './administrator.service';
export interface CustomerHistoryEntryData {
    [HistoryEntryType.CUSTOMER_REGISTERED]: {
        strategy: string;
    };
    [HistoryEntryType.CUSTOMER_VERIFIED]: {
        strategy: string;
    };
    [HistoryEntryType.CUSTOMER_DETAIL_UPDATED]: {
        input: UpdateCustomerInput | UpdateCustomerShopInput;
    };
    [HistoryEntryType.CUSTOMER_ADDRESS_CREATED]: {
        address: string;
    };
    [HistoryEntryType.CUSTOMER_ADDED_TO_GROUP]: {
        groupName: string;
    };
    [HistoryEntryType.CUSTOMER_REMOVED_FROM_GROUP]: {
        groupName: string;
    };
    [HistoryEntryType.CUSTOMER_ADDRESS_UPDATED]: {
        address: string;
        input: UpdateAddressInput;
    };
    [HistoryEntryType.CUSTOMER_ADDRESS_DELETED]: {
        address: string;
    };
    [HistoryEntryType.CUSTOMER_PASSWORD_UPDATED]: Record<string, never>;
    [HistoryEntryType.CUSTOMER_PASSWORD_RESET_REQUESTED]: Record<string, never>;
    [HistoryEntryType.CUSTOMER_PASSWORD_RESET_VERIFIED]: Record<string, never>;
    [HistoryEntryType.CUSTOMER_EMAIL_UPDATE_REQUESTED]: {
        oldEmailAddress: string;
        newEmailAddress: string;
    };
    [HistoryEntryType.CUSTOMER_EMAIL_UPDATE_VERIFIED]: {
        oldEmailAddress: string;
        newEmailAddress: string;
    };
    [HistoryEntryType.CUSTOMER_NOTE]: {
        note: string;
    };
}
export interface OrderHistoryEntryData {
    [HistoryEntryType.ORDER_STATE_TRANSITION]: {
        from: OrderState;
        to: OrderState;
    };
    [HistoryEntryType.ORDER_PAYMENT_TRANSITION]: {
        paymentId: ID;
        from: PaymentState;
        to: PaymentState;
    };
    [HistoryEntryType.ORDER_FULFILLMENT_TRANSITION]: {
        fulfillmentId: ID;
        from: FulfillmentState;
        to: FulfillmentState;
    };
    [HistoryEntryType.ORDER_FULFILLMENT]: {
        fulfillmentId: ID;
    };
    [HistoryEntryType.ORDER_CANCELLATION]: {
        lines: OrderLineInput[];
        shippingCancelled: boolean;
        reason?: string;
    };
    [HistoryEntryType.ORDER_REFUND_TRANSITION]: {
        refundId: ID;
        from: RefundState;
        to: RefundState;
        reason?: string;
    };
    [HistoryEntryType.ORDER_NOTE]: {
        note: string;
    };
    [HistoryEntryType.ORDER_COUPON_APPLIED]: {
        couponCode: string;
        promotionId: ID;
    };
    [HistoryEntryType.ORDER_COUPON_REMOVED]: {
        couponCode: string;
    };
    [HistoryEntryType.ORDER_MODIFIED]: {
        modificationId: ID;
    };
    [HistoryEntryType.ORDER_CUSTOMER_UPDATED]: {
        previousCustomerId?: ID;
        previousCustomerName?: ID;
        newCustomerId: ID;
        newCustomerName: ID;
        note?: string;
    };
}
export interface CreateCustomerHistoryEntryArgs<T extends keyof CustomerHistoryEntryData> {
    customerId: ID;
    ctx: RequestContext;
    type: T;
    data: CustomerHistoryEntryData[T];
}
export interface CreateOrderHistoryEntryArgs<T extends keyof OrderHistoryEntryData> {
    orderId: ID;
    ctx: RequestContext;
    type: T;
    data: OrderHistoryEntryData[T];
}
export interface UpdateOrderHistoryEntryArgs<T extends keyof OrderHistoryEntryData> {
    entryId: ID;
    ctx: RequestContext;
    type: T;
    isPublic?: boolean;
    data?: OrderHistoryEntryData[T];
}
export interface UpdateCustomerHistoryEntryArgs<T extends keyof CustomerHistoryEntryData> {
    entryId: ID;
    ctx: RequestContext;
    type: T;
    data?: CustomerHistoryEntryData[T];
}
/**
 * @description
 * Contains methods relating to {@link HistoryEntry} entities. Histories are timelines of actions
 * related to a particular Customer or Order, recording significant events such as creation, state changes,
 * notes, etc.
 *
 * ## Custom History Entry Types
 *
 * Since Vendure v1.9.0, it is possible to define custom HistoryEntry types.
 *
 * Let's take an example where we have some Customers who are businesses. We want to verify their
 * tax ID in order to allow them wholesale rates. As part of this verification, we'd like to add
 * an entry into the Customer's history with data about the tax ID verification.
 *
 * First of all we'd extend the GraphQL `HistoryEntryType` enum for our new type as part of a plugin
 *
 * @example
 * ```ts
 * import { PluginCommonModule, VendurePlugin } from '\@vendure/core';
 * import { VerificationService } from './verification.service';
 *
 * \@VendurePlugin({
 *   imports: [PluginCommonModule],
 *   adminApiExtensions: {
 *     schema: gql`
 *       extend enum HistoryEntryType {
 *         CUSTOMER_TAX_ID_VERIFICATION
 *       }
 *     `,
 *   },
 *   providers: [VerificationService],
 * })
 * export class TaxIDVerificationPlugin {}
 * ```
 *
 * Next we need to create a TypeScript type definition file where we extend the `CustomerHistoryEntryData` interface. This is done
 * via TypeScript's [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces)
 * and [ambient modules](https://www.typescriptlang.org/docs/handbook/modules.html#ambient-modules) features.
 *
 * @example
 * ```ts
 * // types.ts
 * import { CustomerHistoryEntryData } from '\@vendure/core';
 *
 * export const CUSTOMER_TAX_ID_VERIFICATION = 'CUSTOMER_TAX_ID_VERIFICATION';
 *
 * declare module '@vendure/core' {
 *   interface CustomerHistoryEntryData {
 *     [CUSTOMER_TAX_ID_VERIFICATION]: {
 *       taxId: string;
 *       valid: boolean;
 *       name?: string;
 *       address?: string;
 *     };
 *   }
 * }
 * ```
 *
 * Note: it works exactly the same way if we wanted to add a custom type for Order history, except in that case we'd extend the
 * `OrderHistoryEntryData` interface instead.
 *
 * Now that we have our types set up, we can use the HistoryService to add a new HistoryEntry in a type-safe manner:
 *
 * @example
 * ```ts
 * // verification.service.ts
 * import { Injectable } from '\@nestjs/common';
 * import { RequestContext } from '\@vendure/core';
 * import { CUSTOMER_TAX_ID_VERIFICATION } from './types';
 *
 * \@Injectable()
 * export class VerificationService {
 *   constructor(private historyService: HistoryService) {}
 *
 *   async verifyTaxId(ctx: RequestContext, customerId: ID, taxId: string) {
 *     const result = await someTaxIdCheckingService(taxId);
 *
 *     await this.historyService.createHistoryEntryForCustomer({
 *       customerId,
 *       ctx,
 *       type: CUSTOMER_TAX_ID_VERIFICATION,
 *       data: {
 *         taxId,
 *         valid: result.isValid,
 *         name: result.companyName,
 *         address: result.registeredAddress,
 *       },
 *     });
 *   }
 * }
 * ```
 * :::info
 * It is also possible to define a UI component to display custom history entry types. See the
 * [Custom History Timeline Components guide](/guides/extending-the-admin-ui/custom-timeline-components/).
 * :::
 *
 * @docsCategory services
 */
export declare class HistoryService {
    private connection;
    private administratorService;
    private listQueryBuilder;
    private eventBus;
    constructor(
        connection: TransactionalConnection,
        administratorService: AdministratorService,
        listQueryBuilder: ListQueryBuilder,
        eventBus: EventBus,
    );
    getHistoryForOrder(
        ctx: RequestContext,
        orderId: ID,
        publicOnly: boolean,
        options?: HistoryEntryListOptions,
    ): Promise<PaginatedList<OrderHistoryEntry>>;
    createHistoryEntryForOrder<T extends keyof OrderHistoryEntryData>(
        args: CreateOrderHistoryEntryArgs<T>,
        isPublic?: boolean,
    ): Promise<OrderHistoryEntry>;
    getHistoryForCustomer(
        ctx: RequestContext,
        customerId: ID,
        publicOnly: boolean,
        options?: HistoryEntryListOptions,
    ): Promise<PaginatedList<CustomerHistoryEntry>>;
    createHistoryEntryForCustomer<T extends keyof CustomerHistoryEntryData>(
        args: CreateCustomerHistoryEntryArgs<T>,
        isPublic?: boolean,
    ): Promise<CustomerHistoryEntry>;
    updateOrderHistoryEntry<T extends keyof OrderHistoryEntryData>(
        ctx: RequestContext,
        args: UpdateOrderHistoryEntryArgs<T>,
    ): Promise<OrderHistoryEntry>;
    deleteOrderHistoryEntry(ctx: RequestContext, id: ID): Promise<void>;
    updateCustomerHistoryEntry<T extends keyof CustomerHistoryEntryData>(
        ctx: RequestContext,
        args: UpdateCustomerHistoryEntryArgs<T>,
    ): Promise<CustomerHistoryEntry>;
    deleteCustomerHistoryEntry(ctx: RequestContext, id: ID): Promise<void>;
    private getAdministratorFromContext;
}
