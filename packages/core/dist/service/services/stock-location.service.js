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
exports.StockLocationService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const request_context_cache_service_1 = require("../../cache/request-context-cache.service");
const errors_1 = require("../../common/error/errors");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const stock_level_entity_1 = require("../../entity/stock-level/stock-level.entity");
const stock_location_entity_1 = require("../../entity/stock-location/stock-location.entity");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const request_context_service_1 = require("../helpers/request-context/request-context.service");
const patch_entity_1 = require("../helpers/utils/patch-entity");
const channel_service_1 = require("./channel.service");
const role_service_1 = require("./role.service");
let StockLocationService = class StockLocationService {
    constructor(requestContextService, connection, channelService, roleService, listQueryBuilder, configService, requestContextCache, customFieldRelationService) {
        this.requestContextService = requestContextService;
        this.connection = connection;
        this.channelService = channelService;
        this.roleService = roleService;
        this.listQueryBuilder = listQueryBuilder;
        this.configService = configService;
        this.requestContextCache = requestContextCache;
        this.customFieldRelationService = customFieldRelationService;
    }
    async initStockLocations() {
        await this.ensureDefaultStockLocationExists();
    }
    findOne(ctx, stockLocationId) {
        return this.connection
            .findOneInChannel(ctx, stock_location_entity_1.StockLocation, stockLocationId, ctx.channelId)
            .then(result => result !== null && result !== void 0 ? result : undefined);
    }
    findAll(ctx, options, relations) {
        return this.listQueryBuilder
            .build(stock_location_entity_1.StockLocation, options, {
            channelId: ctx.channelId,
            relations,
            ctx,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    async create(ctx, input) {
        var _a, _b;
        const stockLocation = await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).save(new stock_location_entity_1.StockLocation({
            name: input.name,
            description: (_a = input.description) !== null && _a !== void 0 ? _a : '',
            customFields: (_b = input.customFields) !== null && _b !== void 0 ? _b : {},
        }));
        await this.channelService.assignToCurrentChannel(stockLocation, ctx);
        await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).save(stockLocation);
        return stockLocation;
    }
    async update(ctx, input) {
        const stockLocation = await this.connection.getEntityOrThrow(ctx, stock_location_entity_1.StockLocation, input.id);
        const updatedStockLocation = (0, patch_entity_1.patchEntity)(stockLocation, input);
        await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).save(updatedStockLocation);
        await this.customFieldRelationService.updateRelations(ctx, stock_location_entity_1.StockLocation, input, updatedStockLocation);
        return (0, utils_1.assertFound)(this.findOne(ctx, updatedStockLocation.id));
    }
    async delete(ctx, input) {
        const stockLocation = await this.connection.findOneInChannel(ctx, stock_location_entity_1.StockLocation, input.id, ctx.channelId);
        if (!stockLocation) {
            throw new errors_1.EntityNotFoundError('StockLocation', input.id);
        }
        // Do not allow the last StockLocation to be deleted
        const allStockLocations = await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).find();
        if (allStockLocations.length === 1) {
            return {
                result: generated_types_1.DeletionResult.NOT_DELETED,
                message: ctx.translate('message.cannot-delete-last-stock-location'),
            };
        }
        if (input.transferToLocationId) {
            // This is inefficient, and it would be nice to be able to do this as a single
            // SQL `update` statement with a nested `select` subquery, but TypeORM doesn't
            // seem to have a good solution for that. If this proves a perf bottleneck, we
            // can look at implementing raw SQL with a switch over the DB type.
            const stockLevelsToTransfer = await this.connection
                .getRepository(ctx, stock_level_entity_1.StockLevel)
                .find({ where: { stockLocationId: stockLocation.id } });
            for (const stockLevel of stockLevelsToTransfer) {
                const existingStockLevel = await this.connection.getRepository(ctx, stock_level_entity_1.StockLevel).findOne({
                    where: {
                        stockLocationId: input.transferToLocationId,
                        productVariantId: stockLevel.productVariantId,
                    },
                });
                if (existingStockLevel) {
                    existingStockLevel.stockOnHand += stockLevel.stockOnHand;
                    existingStockLevel.stockAllocated += stockLevel.stockAllocated;
                    await this.connection.getRepository(ctx, stock_level_entity_1.StockLevel).save(existingStockLevel);
                }
                else {
                    const newStockLevel = new stock_level_entity_1.StockLevel({
                        productVariantId: stockLevel.productVariantId,
                        stockLocationId: input.transferToLocationId,
                        stockOnHand: stockLevel.stockOnHand,
                        stockAllocated: stockLevel.stockAllocated,
                    });
                    await this.connection.getRepository(ctx, stock_level_entity_1.StockLevel).save(newStockLevel);
                }
                await this.connection.getRepository(ctx, stock_level_entity_1.StockLevel).remove(stockLevel);
            }
        }
        try {
            await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).remove(stockLocation);
        }
        catch (e) {
            return {
                result: generated_types_1.DeletionResult.NOT_DELETED,
                message: e.message,
            };
        }
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    async assignStockLocationsToChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.UpdateStockLocation,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        for (const stockLocationId of input.stockLocationIds) {
            const stockLocation = await this.connection.findOneInChannel(ctx, stock_location_entity_1.StockLocation, stockLocationId, ctx.channelId);
            await this.channelService.assignToChannels(ctx, stock_location_entity_1.StockLocation, stockLocationId, [
                input.channelId,
            ]);
        }
        return this.connection.findByIdsInChannel(ctx, stock_location_entity_1.StockLocation, input.stockLocationIds, ctx.channelId, {});
    }
    async removeStockLocationsFromChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.DeleteStockLocation,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        if ((0, utils_1.idsAreEqual)(input.channelId, defaultChannel.id)) {
            throw new errors_1.UserInputError('error.items-cannot-be-removed-from-default-channel');
        }
        for (const stockLocationId of input.stockLocationIds) {
            const stockLocation = await this.connection.getEntityOrThrow(ctx, stock_location_entity_1.StockLocation, stockLocationId);
            await this.channelService.removeFromChannels(ctx, stock_location_entity_1.StockLocation, stockLocationId, [
                input.channelId,
            ]);
        }
        return this.connection.findByIdsInChannel(ctx, stock_location_entity_1.StockLocation, input.stockLocationIds, ctx.channelId, {});
    }
    getAllStockLocations(ctx) {
        return this.requestContextCache.get(ctx, 'StockLocationService.getAllStockLocations', () => this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).find());
    }
    defaultStockLocation(ctx) {
        return this.connection
            .getRepository(ctx, stock_location_entity_1.StockLocation)
            .find({ order: { createdAt: 'ASC' } })
            .then(items => items[0]);
    }
    async getAllocationLocations(ctx, orderLine, quantity) {
        const { stockLocationStrategy } = this.configService.catalogOptions;
        const stockLocations = await this.getAllStockLocations(ctx);
        const allocationLocations = await stockLocationStrategy.forAllocation(ctx, stockLocations, orderLine, quantity);
        return allocationLocations;
    }
    async getReleaseLocations(ctx, orderLine, quantity) {
        const { stockLocationStrategy } = this.configService.catalogOptions;
        const stockLocations = await this.getAllStockLocations(ctx);
        const releaseLocations = await stockLocationStrategy.forRelease(ctx, stockLocations, orderLine, quantity);
        return releaseLocations;
    }
    async getSaleLocations(ctx, orderLine, quantity) {
        const { stockLocationStrategy } = this.configService.catalogOptions;
        const stockLocations = await this.getAllStockLocations(ctx);
        const saleLocations = await stockLocationStrategy.forSale(ctx, stockLocations, orderLine, quantity);
        return saleLocations;
    }
    async getCancellationLocations(ctx, orderLine, quantity) {
        const { stockLocationStrategy } = this.configService.catalogOptions;
        const stockLocations = await this.getAllStockLocations(ctx);
        const cancellationLocations = await stockLocationStrategy.forCancellation(ctx, stockLocations, orderLine, quantity);
        return cancellationLocations;
    }
    async ensureDefaultStockLocationExists() {
        const ctx = await this.requestContextService.create({
            apiType: 'admin',
        });
        const stockLocations = await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).find({
            relations: {
                channels: true,
            },
        });
        if (stockLocations.length === 0) {
            const defaultStockLocation = await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).save(new stock_location_entity_1.StockLocation({
                name: 'Default Stock Location',
                description: 'The default stock location',
            }));
            defaultStockLocation.channels = [];
            stockLocations.push(defaultStockLocation);
            await this.connection.getRepository(ctx, stock_location_entity_1.StockLocation).save(defaultStockLocation);
        }
        const defaultChannel = await this.channelService.getDefaultChannel();
        for (const stockLocation of stockLocations) {
            if (!stockLocation.channels.find(c => c.id === defaultChannel.id)) {
                await this.channelService.assignToChannels(ctx, stock_location_entity_1.StockLocation, stockLocation.id, [
                    defaultChannel.id,
                ]);
            }
        }
    }
};
exports.StockLocationService = StockLocationService;
exports.StockLocationService = StockLocationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContextService,
        transactional_connection_1.TransactionalConnection,
        channel_service_1.ChannelService,
        role_service_1.RoleService,
        list_query_builder_1.ListQueryBuilder,
        config_service_1.ConfigService,
        request_context_cache_service_1.RequestContextCacheService,
        custom_field_relation_service_1.CustomFieldRelationService])
], StockLocationService);
//# sourceMappingURL=stock-location.service.js.map