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
exports.StockMovementService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const typeorm_1 = require("typeorm");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const order_line_entity_1 = require("../../entity/order-line/order-line.entity");
const product_variant_entity_1 = require("../../entity/product-variant/product-variant.entity");
const allocation_entity_1 = require("../../entity/stock-movement/allocation.entity");
const cancellation_entity_1 = require("../../entity/stock-movement/cancellation.entity");
const release_entity_1 = require("../../entity/stock-movement/release.entity");
const sale_entity_1 = require("../../entity/stock-movement/sale.entity");
const stock_adjustment_entity_1 = require("../../entity/stock-movement/stock-adjustment.entity");
const stock_movement_entity_1 = require("../../entity/stock-movement/stock-movement.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const stock_movement_event_1 = require("../../event-bus/events/stock-movement-event");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const global_settings_service_1 = require("./global-settings.service");
const stock_level_service_1 = require("./stock-level.service");
const stock_location_service_1 = require("./stock-location.service");
/**
 * @description
 * Contains methods relating to {@link StockMovement} entities.
 *
 * @docsCategory services
 */
let StockMovementService = class StockMovementService {
    constructor(connection, listQueryBuilder, globalSettingsService, stockLevelService, eventBus, stockLocationService, configService) {
        this.connection = connection;
        this.listQueryBuilder = listQueryBuilder;
        this.globalSettingsService = globalSettingsService;
        this.stockLevelService = stockLevelService;
        this.eventBus = eventBus;
        this.stockLocationService = stockLocationService;
        this.configService = configService;
    }
    /**
     * @description
     * Returns a {@link PaginatedList} of all StockMovements associated with the specified ProductVariant.
     */
    getStockMovementsByProductVariantId(ctx, productVariantId, options) {
        return this.listQueryBuilder
            .build(stock_movement_entity_1.StockMovement, options, { ctx })
            .leftJoin('stockmovement.productVariant', 'productVariant')
            .andWhere('productVariant.id = :productVariantId', { productVariantId })
            .getManyAndCount()
            .then(async ([items, totalItems]) => {
            return {
                items,
                totalItems,
            };
        });
    }
    /**
     * @description
     * Adjusts the stock level of the ProductVariant, creating a new {@link StockAdjustment} entity
     * in the process.
     */
    async adjustProductVariantStock(ctx, productVariantId, stockOnHandNumberOrInput) {
        let stockOnHandInputs;
        if (typeof stockOnHandNumberOrInput === 'number') {
            const defaultStockLocation = await this.stockLocationService.defaultStockLocation(ctx);
            stockOnHandInputs = [
                { stockLocationId: defaultStockLocation.id, stockOnHand: stockOnHandNumberOrInput },
            ];
        }
        else {
            stockOnHandInputs = stockOnHandNumberOrInput;
        }
        const adjustments = [];
        for (const input of stockOnHandInputs) {
            const stockLevel = await this.stockLevelService.getStockLevel(ctx, productVariantId, input.stockLocationId);
            const oldStockLevel = stockLevel.stockOnHand;
            const newStockLevel = input.stockOnHand;
            if (oldStockLevel === newStockLevel) {
                continue;
            }
            const delta = newStockLevel - oldStockLevel;
            const adjustment = await this.connection.getRepository(ctx, stock_adjustment_entity_1.StockAdjustment).save(new stock_adjustment_entity_1.StockAdjustment({
                quantity: delta,
                stockLocation: { id: input.stockLocationId },
                productVariant: { id: productVariantId },
            }));
            await this.stockLevelService.updateStockOnHandForLocation(ctx, productVariantId, input.stockLocationId, delta);
            await this.eventBus.publish(new stock_movement_event_1.StockMovementEvent(ctx, [adjustment]));
            adjustments.push(adjustment);
        }
        return adjustments;
    }
    /**
     * @description
     * Creates a new {@link Allocation} for each OrderLine in the Order. For ProductVariants
     * which are configured to track stock levels, the `ProductVariant.stockAllocated` value is
     * increased, indicating that this quantity of stock is allocated and cannot be sold.
     */
    async createAllocationsForOrder(ctx, order) {
        const lines = order.lines.map(orderLine => ({
            orderLineId: orderLine.id,
            quantity: orderLine.quantity,
        }));
        return this.createAllocationsForOrderLines(ctx, lines);
    }
    /**
     * @description
     * Creates a new {@link Allocation} for each of the given OrderLines. For ProductVariants
     * which are configured to track stock levels, the `ProductVariant.stockAllocated` value is
     * increased, indicating that this quantity of stock is allocated and cannot be sold.
     */
    async createAllocationsForOrderLines(ctx, lines) {
        const allocations = [];
        const globalTrackInventory = (await this.globalSettingsService.getSettings(ctx)).trackInventory;
        for (const { orderLineId, quantity } of lines) {
            const orderLine = await this.connection.getEntityOrThrow(ctx, order_line_entity_1.OrderLine, orderLineId);
            const productVariant = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, orderLine.productVariantId);
            const allocationLocations = await this.stockLocationService.getAllocationLocations(ctx, orderLine, quantity);
            for (const allocationLocation of allocationLocations) {
                const allocation = new allocation_entity_1.Allocation({
                    productVariant: new product_variant_entity_1.ProductVariant({ id: orderLine.productVariantId }),
                    stockLocation: allocationLocation.location,
                    quantity: allocationLocation.quantity,
                    orderLine,
                });
                allocations.push(allocation);
                if (this.trackInventoryForVariant(productVariant, globalTrackInventory)) {
                    await this.stockLevelService.updateStockAllocatedForLocation(ctx, orderLine.productVariantId, allocationLocation.location.id, allocationLocation.quantity);
                }
            }
        }
        const savedAllocations = await this.connection.getRepository(ctx, allocation_entity_1.Allocation).save(allocations);
        if (savedAllocations.length) {
            await this.eventBus.publish(new stock_movement_event_1.StockMovementEvent(ctx, savedAllocations));
        }
        return savedAllocations;
    }
    /**
     * @description
     * Creates {@link Sale}s for each OrderLine in the Order. For ProductVariants
     * which are configured to track stock levels, the `ProductVariant.stockAllocated` value is
     * reduced and the `stockOnHand` value is also reduced by the OrderLine quantity, indicating
     * that the stock is no longer allocated, but is actually sold and no longer available.
     */
    async createSalesForOrder(ctx, lines) {
        const sales = [];
        const globalTrackInventory = (await this.globalSettingsService.getSettings(ctx)).trackInventory;
        const orderLines = await this.connection
            .getRepository(ctx, order_line_entity_1.OrderLine)
            .find({ where: { id: (0, typeorm_1.In)(lines.map(line => line.orderLineId)) } });
        for (const lineRow of lines) {
            const orderLine = orderLines.find(line => (0, utils_1.idsAreEqual)(line.id, lineRow.orderLineId));
            if (!orderLine) {
                continue;
            }
            const productVariant = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, orderLine.productVariantId, { includeSoftDeleted: true });
            const saleLocations = await this.stockLocationService.getSaleLocations(ctx, orderLine, lineRow.quantity);
            for (const saleLocation of saleLocations) {
                const sale = new sale_entity_1.Sale({
                    productVariant,
                    quantity: lineRow.quantity * -1,
                    orderLine,
                    stockLocation: saleLocation.location,
                });
                sales.push(sale);
                if (this.trackInventoryForVariant(productVariant, globalTrackInventory)) {
                    await this.stockLevelService.updateStockAllocatedForLocation(ctx, orderLine.productVariantId, saleLocation.location.id, -saleLocation.quantity);
                    await this.stockLevelService.updateStockOnHandForLocation(ctx, orderLine.productVariantId, saleLocation.location.id, -saleLocation.quantity);
                }
            }
        }
        const savedSales = await this.connection.getRepository(ctx, sale_entity_1.Sale).save(sales);
        if (savedSales.length) {
            await this.eventBus.publish(new stock_movement_event_1.StockMovementEvent(ctx, savedSales));
        }
        return savedSales;
    }
    /**
     * @description
     * Creates a {@link Cancellation} for each of the specified OrderItems. For ProductVariants
     * which are configured to track stock levels, the `ProductVariant.stockOnHand` value is
     * increased for each Cancellation, allowing that stock to be sold again.
     */
    async createCancellationsForOrderLines(ctx, lineInputs) {
        const orderLines = await this.connection.getRepository(ctx, order_line_entity_1.OrderLine).find({
            where: {
                id: (0, typeorm_1.In)(lineInputs.map(l => l.orderLineId)),
            },
            relations: ['productVariant'],
        });
        const cancellations = [];
        const globalTrackInventory = (await this.globalSettingsService.getSettings(ctx)).trackInventory;
        for (const orderLine of orderLines) {
            const lineInput = lineInputs.find(l => (0, utils_1.idsAreEqual)(l.orderLineId, orderLine.id));
            if (!lineInput) {
                continue;
            }
            const cancellationLocations = await this.stockLocationService.getCancellationLocations(ctx, orderLine, lineInput.quantity);
            for (const cancellationLocation of cancellationLocations) {
                const cancellation = new cancellation_entity_1.Cancellation({
                    productVariant: orderLine.productVariant,
                    quantity: lineInput.quantity,
                    orderLine,
                    stockLocation: cancellationLocation.location,
                });
                cancellations.push(cancellation);
                if (this.trackInventoryForVariant(orderLine.productVariant, globalTrackInventory)) {
                    await this.stockLevelService.updateStockOnHandForLocation(ctx, orderLine.productVariantId, cancellationLocation.location.id, cancellationLocation.quantity);
                }
            }
        }
        const savedCancellations = await this.connection.getRepository(ctx, cancellation_entity_1.Cancellation).save(cancellations);
        if (savedCancellations.length) {
            await this.eventBus.publish(new stock_movement_event_1.StockMovementEvent(ctx, savedCancellations));
        }
        return savedCancellations;
    }
    /**
     * @description
     * Creates a {@link Release} for each of the specified OrderItems. For ProductVariants
     * which are configured to track stock levels, the `ProductVariant.stockAllocated` value is
     * reduced, indicating that this stock is once again available to buy.
     */
    async createReleasesForOrderLines(ctx, lineInputs) {
        const releases = [];
        const orderLines = await this.connection.getRepository(ctx, order_line_entity_1.OrderLine).find({
            where: { id: (0, typeorm_1.In)(lineInputs.map(l => l.orderLineId)) },
            relations: ['productVariant'],
        });
        const globalTrackInventory = (await this.globalSettingsService.getSettings(ctx)).trackInventory;
        const variantsMap = new Map();
        for (const orderLine of orderLines) {
            const lineInput = lineInputs.find(l => (0, utils_1.idsAreEqual)(l.orderLineId, orderLine.id));
            if (!lineInput) {
                continue;
            }
            const releaseLocations = await this.stockLocationService.getReleaseLocations(ctx, orderLine, lineInput.quantity);
            for (const releaseLocation of releaseLocations) {
                const release = new release_entity_1.Release({
                    productVariant: orderLine.productVariant,
                    quantity: lineInput.quantity,
                    orderLine,
                    stockLocation: releaseLocation.location,
                });
                releases.push(release);
                if (this.trackInventoryForVariant(orderLine.productVariant, globalTrackInventory)) {
                    await this.stockLevelService.updateStockAllocatedForLocation(ctx, orderLine.productVariantId, releaseLocation.location.id, -releaseLocation.quantity);
                }
            }
        }
        const savedReleases = await this.connection.getRepository(ctx, release_entity_1.Release).save(releases);
        if (savedReleases.length) {
            await this.eventBus.publish(new stock_movement_event_1.StockMovementEvent(ctx, savedReleases));
        }
        return savedReleases;
    }
    trackInventoryForVariant(variant, globalTrackInventory) {
        return (variant.trackInventory === generated_types_1.GlobalFlag.TRUE ||
            (variant.trackInventory === generated_types_1.GlobalFlag.INHERIT && globalTrackInventory));
    }
};
exports.StockMovementService = StockMovementService;
exports.StockMovementService = StockMovementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        list_query_builder_1.ListQueryBuilder,
        global_settings_service_1.GlobalSettingsService,
        stock_level_service_1.StockLevelService,
        event_bus_1.EventBus,
        stock_location_service_1.StockLocationService,
        config_service_1.ConfigService])
], StockMovementService);
//# sourceMappingURL=stock-movement.service.js.map