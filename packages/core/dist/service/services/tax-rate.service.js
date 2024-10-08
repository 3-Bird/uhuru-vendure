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
exports.TaxRateService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const request_context_1 = require("../../api/common/request-context");
const errors_1 = require("../../common/error/errors");
const self_refreshing_cache_1 = require("../../common/self-refreshing-cache");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const customer_group_entity_1 = require("../../entity/customer-group/customer-group.entity");
const tax_category_entity_1 = require("../../entity/tax-category/tax-category.entity");
const tax_rate_entity_1 = require("../../entity/tax-rate/tax-rate.entity");
const zone_entity_1 = require("../../entity/zone/zone.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const tax_rate_event_1 = require("../../event-bus/events/tax-rate-event");
const tax_rate_modification_event_1 = require("../../event-bus/events/tax-rate-modification-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const patch_entity_1 = require("../helpers/utils/patch-entity");
/**
 * @description
 * Contains methods relating to {@link TaxRate} entities.
 *
 * @docsCategory services
 */
let TaxRateService = class TaxRateService {
    constructor(connection, eventBus, listQueryBuilder, configService, customFieldRelationService) {
        this.connection = connection;
        this.eventBus = eventBus;
        this.listQueryBuilder = listQueryBuilder;
        this.configService = configService;
        this.customFieldRelationService = customFieldRelationService;
        this.defaultTaxRate = new tax_rate_entity_1.TaxRate({
            value: 0,
            enabled: true,
            name: 'No configured tax rate',
            id: '0',
        });
    }
    /**
     * When the app is bootstrapped, ensure the tax rate cache gets created
     * @internal
     */
    async initTaxRates() {
        await this.ensureCacheExists();
    }
    findAll(ctx, options, relations) {
        return this.listQueryBuilder
            .build(tax_rate_entity_1.TaxRate, options, { relations: relations !== null && relations !== void 0 ? relations : ['category', 'zone', 'customerGroup'], ctx })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    findOne(ctx, taxRateId, relations) {
        return this.connection
            .getRepository(ctx, tax_rate_entity_1.TaxRate)
            .findOne({
            where: { id: taxRateId },
            relations: relations !== null && relations !== void 0 ? relations : ['category', 'zone', 'customerGroup'],
        })
            .then(result => result !== null && result !== void 0 ? result : undefined);
    }
    async create(ctx, input) {
        const taxRate = new tax_rate_entity_1.TaxRate(input);
        taxRate.category = await this.connection.getEntityOrThrow(ctx, tax_category_entity_1.TaxCategory, input.categoryId);
        taxRate.zone = await this.connection.getEntityOrThrow(ctx, zone_entity_1.Zone, input.zoneId);
        if (input.customerGroupId) {
            taxRate.customerGroup = await this.connection.getEntityOrThrow(ctx, customer_group_entity_1.CustomerGroup, input.customerGroupId);
        }
        const newTaxRate = await this.connection.getRepository(ctx, tax_rate_entity_1.TaxRate).save(taxRate);
        await this.customFieldRelationService.updateRelations(ctx, tax_rate_entity_1.TaxRate, input, newTaxRate);
        await this.updateActiveTaxRates(ctx);
        await this.eventBus.publish(new tax_rate_modification_event_1.TaxRateModificationEvent(ctx, newTaxRate));
        await this.eventBus.publish(new tax_rate_event_1.TaxRateEvent(ctx, newTaxRate, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, newTaxRate.id));
    }
    async update(ctx, input) {
        const taxRate = await this.findOne(ctx, input.id);
        if (!taxRate) {
            throw new errors_1.EntityNotFoundError('TaxRate', input.id);
        }
        const updatedTaxRate = (0, patch_entity_1.patchEntity)(taxRate, input);
        if (input.categoryId) {
            updatedTaxRate.category = await this.connection.getEntityOrThrow(ctx, tax_category_entity_1.TaxCategory, input.categoryId);
        }
        if (input.zoneId) {
            updatedTaxRate.zone = await this.connection.getEntityOrThrow(ctx, zone_entity_1.Zone, input.zoneId);
        }
        if (input.customerGroupId) {
            updatedTaxRate.customerGroup = await this.connection.getEntityOrThrow(ctx, customer_group_entity_1.CustomerGroup, input.customerGroupId);
        }
        await this.connection.getRepository(ctx, tax_rate_entity_1.TaxRate).save(updatedTaxRate, { reload: false });
        await this.customFieldRelationService.updateRelations(ctx, tax_rate_entity_1.TaxRate, input, updatedTaxRate);
        await this.updateActiveTaxRates(ctx);
        // Commit the transaction so that the worker process can access the updated
        // TaxRate when updating its own tax rate cache.
        await this.connection.commitOpenTransaction(ctx);
        await this.eventBus.publish(new tax_rate_modification_event_1.TaxRateModificationEvent(ctx, updatedTaxRate));
        await this.eventBus.publish(new tax_rate_event_1.TaxRateEvent(ctx, updatedTaxRate, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, taxRate.id));
    }
    async delete(ctx, id) {
        const taxRate = await this.connection.getEntityOrThrow(ctx, tax_rate_entity_1.TaxRate, id);
        const deletedTaxRate = new tax_rate_entity_1.TaxRate(taxRate);
        try {
            await this.connection.getRepository(ctx, tax_rate_entity_1.TaxRate).remove(taxRate);
            await this.eventBus.publish(new tax_rate_event_1.TaxRateEvent(ctx, deletedTaxRate, 'deleted', id));
            return {
                result: generated_types_1.DeletionResult.DELETED,
            };
        }
        catch (e) {
            return {
                result: generated_types_1.DeletionResult.NOT_DELETED,
                message: e.toString(),
            };
        }
    }
    /**
     * @description
     * Returns the applicable TaxRate based on the specified Zone and TaxCategory. Used when calculating Order
     * prices.
     */
    async getApplicableTaxRate(ctx, zone, taxCategory) {
        const rate = (await this.getActiveTaxRates(ctx)).find(r => r.test(zone, taxCategory));
        return rate || this.defaultTaxRate;
    }
    async getActiveTaxRates(ctx) {
        return this.activeTaxRates.value(ctx);
    }
    async updateActiveTaxRates(ctx) {
        await this.activeTaxRates.refresh(ctx);
    }
    async findActiveTaxRates(ctx) {
        return await this.connection.getRepository(ctx, tax_rate_entity_1.TaxRate).find({
            relations: ['category', 'zone', 'customerGroup'],
            where: {
                enabled: true,
            },
        });
    }
    /**
     * Ensures taxRate cache exists. If not, this method creates one.
     */
    async ensureCacheExists() {
        if (this.activeTaxRates) {
            return;
        }
        this.activeTaxRates = await (0, self_refreshing_cache_1.createSelfRefreshingCache)({
            name: 'TaxRateService.activeTaxRates',
            ttl: this.configService.entityOptions.taxRateCacheTtl,
            refresh: { fn: ctx => this.findActiveTaxRates(ctx), defaultArgs: [request_context_1.RequestContext.empty()] },
        });
    }
};
exports.TaxRateService = TaxRateService;
exports.TaxRateService = TaxRateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        event_bus_1.EventBus,
        list_query_builder_1.ListQueryBuilder,
        config_service_1.ConfigService,
        custom_field_relation_service_1.CustomFieldRelationService])
], TaxRateService);
//# sourceMappingURL=tax-rate.service.js.map