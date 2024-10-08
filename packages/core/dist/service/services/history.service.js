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
exports.HistoryService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const transactional_connection_1 = require("../../connection/transactional-connection");
const customer_history_entry_entity_1 = require("../../entity/history-entry/customer-history-entry.entity");
const history_entry_entity_1 = require("../../entity/history-entry/history-entry.entity");
const order_history_entry_entity_1 = require("../../entity/history-entry/order-history-entry.entity");
const event_bus_1 = require("../../event-bus");
const history_entry_event_1 = require("../../event-bus/events/history-entry-event");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const administrator_service_1 = require("./administrator.service");
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
let HistoryService = class HistoryService {
    constructor(connection, administratorService, listQueryBuilder, eventBus) {
        this.connection = connection;
        this.administratorService = administratorService;
        this.listQueryBuilder = listQueryBuilder;
        this.eventBus = eventBus;
    }
    async getHistoryForOrder(ctx, orderId, publicOnly, options) {
        return this.listQueryBuilder
            .build(history_entry_entity_1.HistoryEntry, options, {
            where: Object.assign({ order: { id: orderId } }, (publicOnly ? { isPublic: true } : {})),
            relations: ['administrator'],
            ctx,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    async createHistoryEntryForOrder(args, isPublic = true) {
        const { ctx, data, orderId, type } = args;
        const administrator = await this.getAdministratorFromContext(ctx);
        const entry = new order_history_entry_entity_1.OrderHistoryEntry({
            type,
            isPublic,
            data: data,
            order: { id: orderId },
            administrator,
        });
        const history = await this.connection.getRepository(ctx, order_history_entry_entity_1.OrderHistoryEntry).save(entry);
        await this.eventBus.publish(new history_entry_event_1.HistoryEntryEvent(ctx, history, 'created', 'order', { type, data }));
        return history;
    }
    async getHistoryForCustomer(ctx, customerId, publicOnly, options) {
        return this.listQueryBuilder
            .build(history_entry_entity_1.HistoryEntry, options, {
            where: Object.assign({ customer: { id: customerId } }, (publicOnly ? { isPublic: true } : {})),
            relations: ['administrator'],
            ctx,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    async createHistoryEntryForCustomer(args, isPublic = false) {
        const { ctx, data, customerId, type } = args;
        const administrator = await this.getAdministratorFromContext(ctx);
        const entry = new customer_history_entry_entity_1.CustomerHistoryEntry({
            createdAt: new Date(),
            type,
            isPublic,
            data: data,
            customer: { id: customerId },
            administrator,
        });
        const history = await this.connection.getRepository(ctx, customer_history_entry_entity_1.CustomerHistoryEntry).save(entry);
        await this.eventBus.publish(new history_entry_event_1.HistoryEntryEvent(ctx, history, 'created', 'customer', { type, data }));
        return history;
    }
    async updateOrderHistoryEntry(ctx, args) {
        const entry = await this.connection.getEntityOrThrow(ctx, order_history_entry_entity_1.OrderHistoryEntry, args.entryId, {
            where: { type: args.type },
        });
        if (args.data) {
            entry.data = args.data;
        }
        if (typeof args.isPublic === 'boolean') {
            entry.isPublic = args.isPublic;
        }
        const administrator = await this.getAdministratorFromContext(ctx);
        if (administrator) {
            entry.administrator = administrator;
        }
        const newEntry = await this.connection.getRepository(ctx, order_history_entry_entity_1.OrderHistoryEntry).save(entry);
        await this.eventBus.publish(new history_entry_event_1.HistoryEntryEvent(ctx, entry, 'updated', 'order', args));
        return newEntry;
    }
    async deleteOrderHistoryEntry(ctx, id) {
        const entry = await this.connection.getEntityOrThrow(ctx, order_history_entry_entity_1.OrderHistoryEntry, id);
        const deletedEntry = new order_history_entry_entity_1.OrderHistoryEntry(entry);
        await this.connection.getRepository(ctx, order_history_entry_entity_1.OrderHistoryEntry).remove(entry);
        await this.eventBus.publish(new history_entry_event_1.HistoryEntryEvent(ctx, deletedEntry, 'deleted', 'order', id));
    }
    async updateCustomerHistoryEntry(ctx, args) {
        const entry = await this.connection.getEntityOrThrow(ctx, customer_history_entry_entity_1.CustomerHistoryEntry, args.entryId, {
            where: { type: args.type },
        });
        if (args.data) {
            entry.data = args.data;
        }
        const administrator = await this.getAdministratorFromContext(ctx);
        if (administrator) {
            entry.administrator = administrator;
        }
        const newEntry = await this.connection.getRepository(ctx, customer_history_entry_entity_1.CustomerHistoryEntry).save(entry);
        await this.eventBus.publish(new history_entry_event_1.HistoryEntryEvent(ctx, entry, 'updated', 'customer', args));
        return newEntry;
    }
    async deleteCustomerHistoryEntry(ctx, id) {
        const entry = await this.connection.getEntityOrThrow(ctx, customer_history_entry_entity_1.CustomerHistoryEntry, id);
        const deletedEntry = new customer_history_entry_entity_1.CustomerHistoryEntry(entry);
        await this.connection.getRepository(ctx, customer_history_entry_entity_1.CustomerHistoryEntry).remove(entry);
        await this.eventBus.publish(new history_entry_event_1.HistoryEntryEvent(ctx, deletedEntry, 'deleted', 'customer', id));
    }
    async getAdministratorFromContext(ctx) {
        const administrator = ctx.activeUserId
            ? await this.administratorService.findOneByUserId(ctx, ctx.activeUserId)
            : null;
        return administrator !== null && administrator !== void 0 ? administrator : undefined;
    }
};
exports.HistoryService = HistoryService;
exports.HistoryService = HistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        administrator_service_1.AdministratorService,
        list_query_builder_1.ListQueryBuilder,
        event_bus_1.EventBus])
], HistoryService);
//# sourceMappingURL=history.service.js.map