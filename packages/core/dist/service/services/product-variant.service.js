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
exports.ProductVariantService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const unique_1 = require("@vendure/common/lib/unique");
const typeorm_1 = require("typeorm");
const request_context_cache_service_1 = require("../../cache/request-context-cache.service");
const errors_1 = require("../../common/error/errors");
const round_money_1 = require("../../common/round-money");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const entity_1 = require("../../entity");
const product_entity_1 = require("../../entity/product/product.entity");
const product_option_entity_1 = require("../../entity/product-option/product-option.entity");
const product_variant_translation_entity_1 = require("../../entity/product-variant/product-variant-translation.entity");
const product_variant_entity_1 = require("../../entity/product-variant/product-variant.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const product_variant_channel_event_1 = require("../../event-bus/events/product-variant-channel-event");
const product_variant_event_1 = require("../../event-bus/events/product-variant-event");
const product_variant_price_event_1 = require("../../event-bus/events/product-variant-price-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const product_price_applicator_1 = require("../helpers/product-price-applicator/product-price-applicator");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const samples_each_1 = require("../helpers/utils/samples-each");
const asset_service_1 = require("./asset.service");
const channel_service_1 = require("./channel.service");
const facet_value_service_1 = require("./facet-value.service");
const global_settings_service_1 = require("./global-settings.service");
const role_service_1 = require("./role.service");
const stock_level_service_1 = require("./stock-level.service");
const stock_movement_service_1 = require("./stock-movement.service");
const tax_category_service_1 = require("./tax-category.service");
/**
 * @description
 * Contains methods relating to {@link ProductVariant} entities.
 *
 * @docsCategory services
 */
let ProductVariantService = class ProductVariantService {
    constructor(connection, configService, taxCategoryService, facetValueService, assetService, translatableSaver, eventBus, listQueryBuilder, globalSettingsService, stockMovementService, stockLevelService, channelService, roleService, customFieldRelationService, requestCache, productPriceApplicator, translator) {
        this.connection = connection;
        this.configService = configService;
        this.taxCategoryService = taxCategoryService;
        this.facetValueService = facetValueService;
        this.assetService = assetService;
        this.translatableSaver = translatableSaver;
        this.eventBus = eventBus;
        this.listQueryBuilder = listQueryBuilder;
        this.globalSettingsService = globalSettingsService;
        this.stockMovementService = stockMovementService;
        this.stockLevelService = stockLevelService;
        this.channelService = channelService;
        this.roleService = roleService;
        this.customFieldRelationService = customFieldRelationService;
        this.requestCache = requestCache;
        this.productPriceApplicator = productPriceApplicator;
        this.translator = translator;
    }
    async findAll(ctx, options) {
        const relations = ['featuredAsset', 'taxCategory', 'channels'];
        const customPropertyMap = {};
        const hasFacetValueIdFilter = this.listQueryBuilder.filterObjectHasProperty(options === null || options === void 0 ? void 0 : options.filter, 'facetValueId');
        if (hasFacetValueIdFilter) {
            relations.push('facetValues');
            customPropertyMap.facetValueId = 'facetValues.id';
        }
        return this.listQueryBuilder
            .build(product_variant_entity_1.ProductVariant, options, {
            relations,
            channelId: ctx.channelId,
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            ctx,
            customPropertyMap,
        })
            .getManyAndCount()
            .then(async ([variants, totalItems]) => {
            const items = await this.applyPricesAndTranslateVariants(ctx, variants);
            return {
                items,
                totalItems,
            };
        });
    }
    findOne(ctx, productVariantId, relations) {
        return this.connection
            .findOneInChannel(ctx, product_variant_entity_1.ProductVariant, productVariantId, ctx.channelId, {
            relations: [
                ...(relations || ['product', 'featuredAsset', 'product.featuredAsset']),
                'taxCategory',
            ],
            where: { deletedAt: (0, typeorm_1.IsNull)() },
        })
            .then(async (result) => {
            if (result) {
                return this.translator.translate(await this.applyChannelPriceAndTax(result, ctx), ctx, [
                    'product',
                ]);
            }
        });
    }
    findByIds(ctx, ids) {
        return this.connection
            .findByIdsInChannel(ctx, product_variant_entity_1.ProductVariant, ids, ctx.channelId, {
            relations: [
                'options',
                'facetValues',
                'facetValues.facet',
                'taxCategory',
                'assets',
                'featuredAsset',
            ],
        })
            .then(variants => this.applyPricesAndTranslateVariants(ctx, variants));
    }
    getVariantsByProductId(ctx, productId, options = {}, relations) {
        const qb = this.listQueryBuilder
            .build(product_variant_entity_1.ProductVariant, options, {
            relations: [
                ...(relations || [
                    'options',
                    'facetValues',
                    'facetValues.facet',
                    'assets',
                    'featuredAsset',
                ]),
                'taxCategory',
            ],
            orderBy: { id: 'ASC' },
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            ctx,
        })
            .innerJoinAndSelect('productvariant.channels', 'channel', 'channel.id = :channelId', {
            channelId: ctx.channelId,
        })
            .innerJoinAndSelect('productvariant.product', 'product', 'product.id = :productId', {
            productId,
        });
        if (ctx.apiType === 'shop') {
            qb.andWhere('productvariant.enabled = :enabled', { enabled: true });
        }
        return qb.getManyAndCount().then(async ([variants, totalItems]) => {
            const items = await this.applyPricesAndTranslateVariants(ctx, variants);
            return {
                items,
                totalItems,
            };
        });
    }
    /**
     * @description
     * Returns a {@link PaginatedList} of all ProductVariants associated with the given Collection.
     */
    getVariantsByCollectionId(ctx, collectionId, options, relations = []) {
        const qb = this.listQueryBuilder
            .build(product_variant_entity_1.ProductVariant, options, {
            relations: (0, unique_1.unique)([...relations, 'taxCategory']),
            channelId: ctx.channelId,
            ctx,
        })
            .leftJoin('productvariant.collections', 'collection')
            .leftJoin('productvariant.product', 'product')
            .andWhere('product.deletedAt IS NULL')
            .andWhere('productvariant.deletedAt IS NULL')
            .andWhere('collection.id = :collectionId', { collectionId });
        if (options && options.filter && options.filter.enabled && options.filter.enabled.eq === true) {
            qb.andWhere('product.enabled = :enabled', { enabled: true });
        }
        return qb.getManyAndCount().then(async ([variants, totalItems]) => {
            const items = await this.applyPricesAndTranslateVariants(ctx, variants);
            return {
                items,
                totalItems,
            };
        });
    }
    /**
     * @description
     * Returns all Channels to which the ProductVariant is assigned.
     */
    async getProductVariantChannels(ctx, productVariantId) {
        const variant = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, productVariantId, {
            relations: ['channels'],
            channelId: ctx.channelId,
        });
        return variant.channels;
    }
    async getProductVariantPrices(ctx, productVariantId) {
        return this.connection
            .getRepository(ctx, entity_1.ProductVariantPrice)
            .createQueryBuilder('pvp')
            .where('pvp.productVariant = :productVariantId', { productVariantId })
            .andWhere('pvp.channelId = :channelId', { channelId: ctx.channelId })
            .getMany();
    }
    /**
     * @description
     * Returns the ProductVariant associated with the given {@link OrderLine}.
     */
    async getVariantByOrderLineId(ctx, orderLineId) {
        const { productVariant } = await this.connection.getEntityOrThrow(ctx, entity_1.OrderLine, orderLineId, {
            relations: ['productVariant', 'productVariant.taxCategory'],
            includeSoftDeleted: true,
        });
        return this.translator.translate(await this.applyChannelPriceAndTax(productVariant, ctx), ctx);
    }
    /**
     * @description
     * Returns the {@link ProductOption}s for the given ProductVariant.
     */
    getOptionsForVariant(ctx, variantId) {
        return this.connection
            .findOneInChannel(ctx, product_variant_entity_1.ProductVariant, variantId, ctx.channelId, {
            relations: ['options'],
        })
            .then(variant => (!variant ? [] : variant.options.map(o => this.translator.translate(o, ctx))));
    }
    getFacetValuesForVariant(ctx, variantId) {
        return this.connection
            .findOneInChannel(ctx, product_variant_entity_1.ProductVariant, variantId, ctx.channelId, {
            relations: ['facetValues', 'facetValues.facet', 'facetValues.channels'],
        })
            .then(variant => !variant ? [] : variant.facetValues.map(o => this.translator.translate(o, ctx, ['facet'])));
    }
    /**
     * @description
     * Returns the Product associated with the ProductVariant. Whereas the `ProductService.findOne()`
     * method performs a large multi-table join with all the typical data needed for a "product detail"
     * page, this method returns only the Product itself.
     */
    async getProductForVariant(ctx, variant) {
        let product;
        if (!variant.product) {
            product = await this.connection.getEntityOrThrow(ctx, product_entity_1.Product, variant.productId, {
                includeSoftDeleted: true,
            });
        }
        else {
            product = variant.product;
        }
        return this.translator.translate(product, ctx);
    }
    /**
     * @description
     * Returns the number of saleable units of the ProductVariant, i.e. how many are available
     * for purchase by Customers. This is determined by the ProductVariant's `stockOnHand` value,
     * as well as the local and global `outOfStockThreshold` settings.
     */
    async getSaleableStockLevel(ctx, variant) {
        const { outOfStockThreshold, trackInventory } = await this.globalSettingsService.getSettings(ctx);
        const inventoryNotTracked = variant.trackInventory === generated_types_1.GlobalFlag.FALSE ||
            (variant.trackInventory === generated_types_1.GlobalFlag.INHERIT && trackInventory === false);
        if (inventoryNotTracked) {
            return Number.MAX_SAFE_INTEGER;
        }
        const { stockOnHand, stockAllocated } = await this.stockLevelService.getAvailableStock(ctx, variant.id);
        const effectiveOutOfStockThreshold = variant.useGlobalOutOfStockThreshold
            ? outOfStockThreshold
            : variant.outOfStockThreshold;
        return stockOnHand - stockAllocated - effectiveOutOfStockThreshold;
    }
    async getOutOfStockThreshold(ctx, variant) {
        const { outOfStockThreshold, trackInventory } = await this.globalSettingsService.getSettings(ctx);
        const inventoryNotTracked = variant.trackInventory === generated_types_1.GlobalFlag.FALSE ||
            (variant.trackInventory === generated_types_1.GlobalFlag.INHERIT && trackInventory === false);
        if (inventoryNotTracked) {
            return 0;
        }
        else {
            return variant.useGlobalOutOfStockThreshold ? outOfStockThreshold : variant.outOfStockThreshold;
        }
    }
    /**
     * @description
     * Returns the stockLevel to display to the customer, as specified by the configured
     * {@link StockDisplayStrategy}.
     */
    async getDisplayStockLevel(ctx, variant) {
        const { stockDisplayStrategy } = this.configService.catalogOptions;
        const saleableStockLevel = await this.getSaleableStockLevel(ctx, variant);
        return stockDisplayStrategy.getStockLevel(ctx, variant, saleableStockLevel);
    }
    /**
     * @description
     * Returns the number of fulfillable units of the ProductVariant, equivalent to stockOnHand
     * for those variants which are tracking inventory.
     */
    async getFulfillableStockLevel(ctx, variant) {
        const { outOfStockThreshold, trackInventory } = await this.globalSettingsService.getSettings(ctx);
        const inventoryNotTracked = variant.trackInventory === generated_types_1.GlobalFlag.FALSE ||
            (variant.trackInventory === generated_types_1.GlobalFlag.INHERIT && trackInventory === false);
        if (inventoryNotTracked) {
            return Number.MAX_SAFE_INTEGER;
        }
        const { stockOnHand } = await this.stockLevelService.getAvailableStock(ctx, variant.id);
        return stockOnHand;
    }
    async create(ctx, input) {
        const ids = [];
        for (const productInput of input) {
            const id = await this.createSingle(ctx, productInput);
            ids.push(id);
        }
        const createdVariants = await this.findByIds(ctx, ids);
        await this.eventBus.publish(new product_variant_event_1.ProductVariantEvent(ctx, createdVariants, 'created', input));
        return createdVariants;
    }
    async update(ctx, input) {
        for (const productInput of input) {
            await this.updateSingle(ctx, productInput);
        }
        const updatedVariants = await this.findByIds(ctx, input.map(i => i.id));
        await this.eventBus.publish(new product_variant_event_1.ProductVariantEvent(ctx, updatedVariants, 'updated', input));
        return updatedVariants;
    }
    async createSingle(ctx, input) {
        await this.validateVariantOptionIds(ctx, input.productId, input.optionIds);
        if (!input.optionIds) {
            input.optionIds = [];
        }
        if (input.price == null) {
            input.price = 0;
        }
        input.taxCategoryId = (await this.getTaxCategoryForNewVariant(ctx, input.taxCategoryId)).id;
        const inputWithoutPrice = Object.assign({}, input);
        delete inputWithoutPrice.price;
        const createdVariant = await this.translatableSaver.create({
            ctx,
            input: inputWithoutPrice,
            entityType: product_variant_entity_1.ProductVariant,
            translationType: product_variant_translation_entity_1.ProductVariantTranslation,
            beforeSave: async (variant) => {
                const { optionIds } = input;
                if (optionIds && optionIds.length) {
                    const selectedOptions = await this.connection
                        .getRepository(ctx, product_option_entity_1.ProductOption)
                        .find({ where: { id: (0, typeorm_1.In)(optionIds) } });
                    variant.options = selectedOptions;
                }
                if (input.facetValueIds) {
                    variant.facetValues = await this.facetValueService.findByIds(ctx, input.facetValueIds);
                }
                variant.product = { id: input.productId };
                variant.taxCategory = { id: input.taxCategoryId };
                await this.assetService.updateFeaturedAsset(ctx, variant, input);
                await this.channelService.assignToCurrentChannel(variant, ctx);
            },
            typeOrmSubscriberData: {
                channelId: ctx.channelId,
                taxCategoryId: input.taxCategoryId,
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, product_variant_entity_1.ProductVariant, input, createdVariant);
        await this.assetService.updateEntityAssets(ctx, createdVariant, input);
        if (input.stockOnHand != null || input.stockLevels) {
            await this.stockMovementService.adjustProductVariantStock(ctx, createdVariant.id, 
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            input.stockLevels || input.stockOnHand);
        }
        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        await this.createOrUpdateProductVariantPrice(ctx, createdVariant.id, input.price, ctx.channelId);
        if (!(0, utils_1.idsAreEqual)(ctx.channelId, defaultChannel.id)) {
            // When creating a ProductVariant _not_ in the default Channel, we still need to
            // create a ProductVariantPrice for it in the default Channel, otherwise errors will
            // result when trying to query it there.
            await this.createOrUpdateProductVariantPrice(ctx, createdVariant.id, input.price, defaultChannel.id, defaultChannel.defaultCurrencyCode);
        }
        return createdVariant.id;
    }
    async updateSingle(ctx, input) {
        const existingVariant = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, input.id, {
            channelId: ctx.channelId,
            relations: ['facetValues', 'facetValues.channels'],
        });
        const outOfStockThreshold = await this.getOutOfStockThreshold(ctx, existingVariant);
        if (input.stockOnHand && input.stockOnHand < outOfStockThreshold) {
            throw new errors_1.UserInputError('error.stockonhand-cannot-be-negative');
        }
        if (input.optionIds) {
            await this.validateVariantOptionIds(ctx, existingVariant.productId, input.optionIds);
        }
        const inputWithoutPriceAndStockLevels = Object.assign({}, input);
        delete inputWithoutPriceAndStockLevels.price;
        delete inputWithoutPriceAndStockLevels.stockLevels;
        const updatedVariant = await this.translatableSaver.update({
            ctx,
            input: inputWithoutPriceAndStockLevels,
            entityType: product_variant_entity_1.ProductVariant,
            translationType: product_variant_translation_entity_1.ProductVariantTranslation,
            beforeSave: async (v) => {
                if (input.taxCategoryId) {
                    const taxCategory = await this.taxCategoryService.findOne(ctx, input.taxCategoryId);
                    if (taxCategory) {
                        v.taxCategory = taxCategory;
                    }
                }
                if (input.optionIds && input.optionIds.length) {
                    const selectedOptions = await this.connection
                        .getRepository(ctx, product_option_entity_1.ProductOption)
                        .find({ where: { id: (0, typeorm_1.In)(input.optionIds) } });
                    v.options = selectedOptions;
                }
                if (input.facetValueIds) {
                    const facetValuesInOtherChannels = existingVariant.facetValues.filter(fv => fv.channels.every(channel => !(0, utils_1.idsAreEqual)(channel.id, ctx.channelId)));
                    v.facetValues = [
                        ...facetValuesInOtherChannels,
                        ...(await this.facetValueService.findByIds(ctx, input.facetValueIds)),
                    ];
                }
                if (input.stockOnHand != null || input.stockLevels) {
                    await this.stockMovementService.adjustProductVariantStock(ctx, existingVariant.id, 
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    input.stockLevels || input.stockOnHand);
                }
                await this.assetService.updateFeaturedAsset(ctx, v, input);
                await this.assetService.updateEntityAssets(ctx, v, input);
            },
            typeOrmSubscriberData: {
                channelId: ctx.channelId,
                taxCategoryId: input.taxCategoryId,
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, product_variant_entity_1.ProductVariant, input, updatedVariant);
        if (input.price != null) {
            await this.createOrUpdateProductVariantPrice(ctx, input.id, input.price, ctx.channelId);
        }
        if (input.prices) {
            for (const priceInput of input.prices) {
                if (priceInput.delete === true) {
                    await this.deleteProductVariantPrice(ctx, input.id, ctx.channelId, priceInput.currencyCode);
                }
                else {
                    await this.createOrUpdateProductVariantPrice(ctx, input.id, priceInput.price, ctx.channelId, priceInput.currencyCode);
                }
            }
        }
        return updatedVariant.id;
    }
    /**
     * @description
     * Creates a {@link ProductVariantPrice} for the given ProductVariant/Channel combination.
     * If the `currencyCode` is not specified, the default currency of the Channel will be used.
     */
    async createOrUpdateProductVariantPrice(ctx, productVariantId, price, channelId, currencyCode) {
        const { productVariantPriceUpdateStrategy } = this.configService.catalogOptions;
        const allPrices = await this.connection.getRepository(ctx, entity_1.ProductVariantPrice).find({
            where: {
                variant: { id: productVariantId },
            },
        });
        let targetPrice = allPrices.find(p => (0, utils_1.idsAreEqual)(p.channelId, channelId) &&
            p.currencyCode === (currencyCode !== null && currencyCode !== void 0 ? currencyCode : ctx.channel.defaultCurrencyCode));
        if (currencyCode) {
            const channel = await this.channelService.findOne(ctx, channelId);
            if (!(channel === null || channel === void 0 ? void 0 : channel.availableCurrencyCodes.includes(currencyCode))) {
                throw new errors_1.UserInputError('error.currency-not-available-in-channel', {
                    currencyCode,
                });
            }
        }
        let additionalPricesToUpdate = [];
        if (!targetPrice) {
            const createdPrice = await this.connection.getRepository(ctx, entity_1.ProductVariantPrice).save(new entity_1.ProductVariantPrice({
                channelId,
                price,
                variant: new product_variant_entity_1.ProductVariant({ id: productVariantId }),
                currencyCode: currencyCode !== null && currencyCode !== void 0 ? currencyCode : ctx.channel.defaultCurrencyCode,
            }));
            await this.eventBus.publish(new product_variant_price_event_1.ProductVariantPriceEvent(ctx, [createdPrice], 'created'));
            additionalPricesToUpdate = await productVariantPriceUpdateStrategy.onPriceCreated(ctx, createdPrice, allPrices);
            targetPrice = createdPrice;
        }
        else {
            targetPrice.price = price;
            const updatedPrice = await this.connection
                .getRepository(ctx, entity_1.ProductVariantPrice)
                .save(targetPrice);
            await this.eventBus.publish(new product_variant_price_event_1.ProductVariantPriceEvent(ctx, [updatedPrice], 'updated'));
            additionalPricesToUpdate = await productVariantPriceUpdateStrategy.onPriceUpdated(ctx, updatedPrice, allPrices);
        }
        const uniqueAdditionalPricesToUpdate = (0, unique_1.unique)(additionalPricesToUpdate, 'id').filter(p => 
        // We don't save the targetPrice again unless it has been assigned
        // a different price by the ProductVariantPriceUpdateStrategy.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        !((0, utils_1.idsAreEqual)(p.id, targetPrice.id) && p.price === targetPrice.price));
        if (uniqueAdditionalPricesToUpdate.length) {
            const updatedAdditionalPrices = await this.connection
                .getRepository(ctx, entity_1.ProductVariantPrice)
                .save(uniqueAdditionalPricesToUpdate);
            await this.eventBus.publish(new product_variant_price_event_1.ProductVariantPriceEvent(ctx, updatedAdditionalPrices, 'updated'));
        }
        return targetPrice;
    }
    async deleteProductVariantPrice(ctx, variantId, channelId, currencyCode) {
        const variantPrice = await this.connection.getRepository(ctx, entity_1.ProductVariantPrice).findOne({
            where: {
                variant: { id: variantId },
                channelId,
                currencyCode,
            },
        });
        if (variantPrice) {
            await this.connection.getRepository(ctx, entity_1.ProductVariantPrice).remove(variantPrice);
            await this.eventBus.publish(new product_variant_price_event_1.ProductVariantPriceEvent(ctx, [variantPrice], 'deleted'));
            const { productVariantPriceUpdateStrategy } = this.configService.catalogOptions;
            const allPrices = await this.connection.getRepository(ctx, entity_1.ProductVariantPrice).find({
                where: {
                    variant: { id: variantId },
                },
            });
            const additionalPricesToUpdate = await productVariantPriceUpdateStrategy.onPriceDeleted(ctx, variantPrice, allPrices);
            if (additionalPricesToUpdate.length) {
                const updatedAdditionalPrices = await this.connection
                    .getRepository(ctx, entity_1.ProductVariantPrice)
                    .save(additionalPricesToUpdate);
                await this.eventBus.publish(new product_variant_price_event_1.ProductVariantPriceEvent(ctx, updatedAdditionalPrices, 'updated'));
            }
        }
    }
    async softDelete(ctx, id) {
        const ids = Array.isArray(id) ? id : [id];
        const variants = await this.connection
            .getRepository(ctx, product_variant_entity_1.ProductVariant)
            .find({ where: { id: (0, typeorm_1.In)(ids) } });
        for (const variant of variants) {
            variant.deletedAt = new Date();
        }
        await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).save(variants, { reload: false });
        await this.eventBus.publish(new product_variant_event_1.ProductVariantEvent(ctx, variants, 'deleted', id));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    /**
     * @description
     * This method is intended to be used by the ProductVariant GraphQL entity resolver to resolve the
     * price-related fields which need to be populated at run-time using the `applyChannelPriceAndTax`
     * method.
     *
     * Is optimized to make as few DB calls as possible using caching based on the open request.
     */
    async hydratePriceFields(ctx, variant, priceField) {
        const cacheKey = `hydrate-variant-price-fields-${variant.id}`;
        let populatePricesPromise = this.requestCache.get(ctx, cacheKey);
        if (!populatePricesPromise) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            populatePricesPromise = new Promise(async (resolve, reject) => {
                var _a;
                try {
                    if (!((_a = variant.productVariantPrices) === null || _a === void 0 ? void 0 : _a.length)) {
                        const variantWithPrices = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, variant.id, { relations: ['productVariantPrices'], includeSoftDeleted: true });
                        variant.productVariantPrices = variantWithPrices.productVariantPrices;
                    }
                    if (!variant.taxCategory) {
                        const variantWithTaxCategory = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, variant.id, { relations: ['taxCategory'], includeSoftDeleted: true });
                        variant.taxCategory = variantWithTaxCategory.taxCategory;
                    }
                    resolve(await this.applyChannelPriceAndTax(variant, ctx, undefined, true));
                }
                catch (e) {
                    reject(e);
                }
            });
            this.requestCache.set(ctx, cacheKey, populatePricesPromise);
        }
        const hydratedVariant = await populatePricesPromise;
        return hydratedVariant[priceField];
    }
    /**
     * @description
     * Given an array of ProductVariants from the database, this method will apply the correct price and tax
     * and translate each item.
     */
    async applyPricesAndTranslateVariants(ctx, variants) {
        return await Promise.all(variants.map(async (variant) => {
            const variantWithPrices = await this.applyChannelPriceAndTax(variant, ctx);
            return this.translator.translate(variantWithPrices, ctx, [
                'options',
                'facetValues',
                ['facetValues', 'facet'],
            ]);
        }));
    }
    /**
     * @description
     * Populates the `price` field with the price for the specified channel.
     */
    async applyChannelPriceAndTax(variant, ctx, order, throwIfNoPriceFound = false) {
        return this.productPriceApplicator.applyChannelPriceAndTax(variant, ctx, order, throwIfNoPriceFound);
    }
    /**
     * @description
     * Assigns the specified ProductVariants to the specified Channel. In doing so, it will create a new
     * {@link ProductVariantPrice} and also assign the associated Product and any Assets to the Channel too.
     */
    async assignProductVariantsToChannel(ctx, input) {
        var _a;
        const hasPermission = await this.roleService.userHasPermissionOnChannel(ctx, input.channelId, generated_types_1.Permission.UpdateCatalog);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        const variants = await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).find({
            where: {
                id: (0, typeorm_1.In)(input.productVariantIds),
            },
            relations: ['taxCategory', 'assets'],
        });
        const priceFactor = input.priceFactor != null ? input.priceFactor : 1;
        const targetChannel = await this.connection.getEntityOrThrow(ctx, entity_1.Channel, input.channelId);
        for (const variant of variants) {
            if (variant.deletedAt) {
                continue;
            }
            await this.applyChannelPriceAndTax(variant, ctx);
            await this.channelService.assignToChannels(ctx, product_entity_1.Product, variant.productId, [input.channelId]);
            await this.channelService.assignToChannels(ctx, product_variant_entity_1.ProductVariant, variant.id, [input.channelId]);
            const price = targetChannel.pricesIncludeTax ? variant.priceWithTax : variant.price;
            await this.createOrUpdateProductVariantPrice(ctx, variant.id, (0, round_money_1.roundMoney)(price * priceFactor), input.channelId, targetChannel.defaultCurrencyCode);
            const assetIds = ((_a = variant.assets) === null || _a === void 0 ? void 0 : _a.map(a => a.assetId)) || [];
            await this.assetService.assignToChannel(ctx, { channelId: input.channelId, assetIds });
        }
        const result = await this.findByIds(ctx, variants.map(v => v.id));
        for (const variant of variants) {
            await this.eventBus.publish(new product_variant_channel_event_1.ProductVariantChannelEvent(ctx, variant, input.channelId, 'assigned'));
        }
        return result;
    }
    async removeProductVariantsFromChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasPermissionOnChannel(ctx, input.channelId, generated_types_1.Permission.UpdateCatalog);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        if ((0, utils_1.idsAreEqual)(input.channelId, defaultChannel.id)) {
            throw new errors_1.UserInputError('error.items-cannot-be-removed-from-default-channel');
        }
        const variants = await this.connection
            .getRepository(ctx, product_variant_entity_1.ProductVariant)
            .find({ where: { id: (0, typeorm_1.In)(input.productVariantIds) } });
        for (const variant of variants) {
            await this.channelService.removeFromChannels(ctx, product_variant_entity_1.ProductVariant, variant.id, [input.channelId]);
            await this.connection.getRepository(ctx, entity_1.ProductVariantPrice).delete({
                channelId: input.channelId,
                variant: { id: variant.id },
            });
            // If none of the ProductVariants is assigned to the Channel, remove the Channel from Product
            const productVariants = await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).find({
                where: {
                    productId: variant.productId,
                },
                relations: ['channels'],
            });
            const productChannelsFromVariants = [].concat(...productVariants.map(pv => pv.channels));
            if (!productChannelsFromVariants.find(c => c.id === input.channelId)) {
                await this.channelService.removeFromChannels(ctx, product_entity_1.Product, variant.productId, [
                    input.channelId,
                ]);
            }
        }
        const result = await this.findByIds(ctx, variants.map(v => v.id));
        // Publish the events at the latest possible stage to decrease the chance of race conditions
        // whereby an event listener triggers a query which does not yet have access to the changes
        // within the current transaction.
        for (const variant of variants) {
            await this.eventBus.publish(new product_variant_channel_event_1.ProductVariantChannelEvent(ctx, variant, input.channelId, 'removed'));
        }
        return result;
    }
    async validateVariantOptionIds(ctx, productId, optionIds = []) {
        // this could be done with fewer queries but depending on the data, node will crash
        // https://github.com/vendure-ecommerce/vendure/issues/328
        const optionGroups = (await this.connection.getEntityOrThrow(ctx, product_entity_1.Product, productId, {
            channelId: ctx.channelId,
            relations: ['optionGroups', 'optionGroups.options'],
            loadEagerRelations: false,
        })).optionGroups;
        const activeOptions = optionGroups && optionGroups.filter(group => !group.deletedAt);
        if (optionIds.length !== activeOptions.length) {
            this.throwIncompatibleOptionsError(optionGroups);
        }
        if (!(0, samples_each_1.samplesEach)(optionIds, activeOptions.map(g => g.options.map(o => o.id)))) {
            this.throwIncompatibleOptionsError(optionGroups);
        }
        const product = await this.connection.getEntityOrThrow(ctx, product_entity_1.Product, productId, {
            channelId: ctx.channelId,
            relations: ['variants', 'variants.options'],
            loadEagerRelations: true,
        });
        const inputOptionIds = this.sortJoin(optionIds, ',');
        product.variants
            .filter(v => !v.deletedAt)
            .forEach(variant => {
            const variantOptionIds = this.sortJoin(variant.options, ',', 'id');
            if (variantOptionIds === inputOptionIds) {
                throw new errors_1.UserInputError('error.product-variant-options-combination-already-exists', {
                    variantName: this.translator.translate(variant, ctx).name,
                });
            }
        });
    }
    throwIncompatibleOptionsError(optionGroups) {
        throw new errors_1.UserInputError('error.product-variant-option-ids-not-compatible', {
            groupNames: this.sortJoin(optionGroups, ', ', 'code'),
        });
    }
    sortJoin(arr, glue, prop) {
        return arr
            .map(x => (prop ? x[prop] : x))
            .sort()
            .join(glue);
    }
    async getTaxCategoryForNewVariant(ctx, taxCategoryId) {
        var _a;
        let taxCategory;
        if (taxCategoryId) {
            taxCategory = await this.connection.getEntityOrThrow(ctx, entity_1.TaxCategory, taxCategoryId);
        }
        else {
            const taxCategories = await this.taxCategoryService.findAll(ctx);
            taxCategory = (_a = taxCategories.items.find(t => t.isDefault === true)) !== null && _a !== void 0 ? _a : taxCategories.items[0];
        }
        if (!taxCategory) {
            // there is no TaxCategory set up, so create a default
            taxCategory = await this.taxCategoryService.create(ctx, { name: 'Standard Tax' });
        }
        return taxCategory;
    }
};
exports.ProductVariantService = ProductVariantService;
exports.ProductVariantService = ProductVariantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_service_1.ConfigService,
        tax_category_service_1.TaxCategoryService,
        facet_value_service_1.FacetValueService,
        asset_service_1.AssetService,
        translatable_saver_1.TranslatableSaver,
        event_bus_1.EventBus,
        list_query_builder_1.ListQueryBuilder,
        global_settings_service_1.GlobalSettingsService,
        stock_movement_service_1.StockMovementService,
        stock_level_service_1.StockLevelService,
        channel_service_1.ChannelService,
        role_service_1.RoleService,
        custom_field_relation_service_1.CustomFieldRelationService,
        request_context_cache_service_1.RequestContextCacheService,
        product_price_applicator_1.ProductPriceApplicator,
        translator_service_1.TranslatorService])
], ProductVariantService);
//# sourceMappingURL=product-variant.service.js.map