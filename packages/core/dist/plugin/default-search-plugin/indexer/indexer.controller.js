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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexerController = exports.workerLoggerCtx = exports.variantRelations = exports.productRelations = exports.BATCH_SIZE = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const unique_1 = require("@vendure/common/lib/unique");
const typeorm_1 = require("typeorm");
const request_context_cache_service_1 = require("../../../cache/request-context-cache.service");
const async_queue_1 = require("../../../common/async-queue");
const utils_1 = require("../../../common/utils");
const config_service_1 = require("../../../config/config.service");
const vendure_logger_1 = require("../../../config/logger/vendure-logger");
const transactional_connection_1 = require("../../../connection/transactional-connection");
const channel_entity_1 = require("../../../entity/channel/channel.entity");
const product_entity_1 = require("../../../entity/product/product.entity");
const product_variant_entity_1 = require("../../../entity/product-variant/product-variant.entity");
const entity_hydrator_service_1 = require("../../../service/helpers/entity-hydrator/entity-hydrator.service");
const product_price_applicator_1 = require("../../../service/helpers/product-price-applicator/product-price-applicator");
const product_variant_service_1 = require("../../../service/services/product-variant.service");
const constants_1 = require("../constants");
const search_index_item_entity_1 = require("../entities/search-index-item.entity");
const mutable_request_context_1 = require("./mutable-request-context");
exports.BATCH_SIZE = 1000;
exports.productRelations = [
    'translations',
    'featuredAsset',
    'facetValues',
    'facetValues.facet',
    'variants',
    'channels',
];
exports.variantRelations = [
    'translations',
    'taxCategory',
    'featuredAsset',
    'productVariantPrices',
    'channels',
    'channels.defaultTaxZone',
    'facetValues',
    'facetValues.facet',
    'product',
    'product.translations',
    'product.channels',
    'product.facetValues',
    'product.facetValues.facet',
    'collections',
    'collections.translations',
];
exports.workerLoggerCtx = 'DefaultSearchPlugin Worker';
let IndexerController = class IndexerController {
    constructor(connection, entityHydrator, productPriceApplicator, configService, requestContextCache, productVariantService, options) {
        this.connection = connection;
        this.entityHydrator = entityHydrator;
        this.productPriceApplicator = productPriceApplicator;
        this.configService = configService;
        this.requestContextCache = requestContextCache;
        this.productVariantService = productVariantService;
        this.options = options;
        this.queue = new async_queue_1.AsyncQueue('search-index');
    }
    reindex(job) {
        const { ctx: rawContext } = job.data;
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(rawContext);
        return (0, utils_1.asyncObservable)(async (observer) => {
            var _a;
            const timeStart = Date.now();
            const channel = (_a = ctx.channel) !== null && _a !== void 0 ? _a : (await this.loadChannel(ctx, ctx.channelId));
            const { count } = await this.getSearchIndexQueryBuilder(ctx, { channels: [channel] });
            vendure_logger_1.Logger.verbose(`Reindexing ${count} variants for channel ${ctx.channel.code}`, exports.workerLoggerCtx);
            const batches = Math.ceil(count / exports.BATCH_SIZE);
            await this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).delete({ channelId: ctx.channelId });
            vendure_logger_1.Logger.verbose('Deleted existing index items', exports.workerLoggerCtx);
            for (let i = 0; i < batches; i++) {
                if (job.state === generated_types_1.JobState.CANCELLED) {
                    throw new Error('reindex job was cancelled');
                }
                vendure_logger_1.Logger.verbose(`Processing batch ${i + 1} of ${batches}`, exports.workerLoggerCtx);
                const { variants } = await this.getSearchIndexQueryBuilder(ctx, {
                    channels: [channel],
                    take: exports.BATCH_SIZE,
                    skip: i * exports.BATCH_SIZE,
                });
                await this.saveVariants(ctx, variants);
                observer.next({
                    total: count,
                    completed: Math.min((i + 1) * exports.BATCH_SIZE, count),
                    duration: +new Date() - timeStart,
                });
            }
            vendure_logger_1.Logger.verbose('Completed reindexing', exports.workerLoggerCtx);
            return {
                total: count,
                completed: count,
                duration: +new Date() - timeStart,
            };
        });
    }
    updateVariantsById(job) {
        const { ctx: rawContext, ids } = job.data;
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(rawContext);
        return (0, utils_1.asyncObservable)(async (observer) => {
            const timeStart = Date.now();
            if (ids.length) {
                const batches = Math.ceil(ids.length / exports.BATCH_SIZE);
                vendure_logger_1.Logger.verbose(`Updating ${ids.length} variants...`);
                for (let i = 0; i < batches; i++) {
                    if (job.state === generated_types_1.JobState.CANCELLED) {
                        throw new Error('updateVariantsById job was cancelled');
                    }
                    const begin = i * exports.BATCH_SIZE;
                    const end = begin + exports.BATCH_SIZE;
                    vendure_logger_1.Logger.verbose(`Updating ids from index ${begin} to ${end}`);
                    const batchIds = ids.slice(begin, end);
                    const { variants: batch } = await this.getSearchIndexQueryBuilder(ctx, {
                        channels: await this.getAllChannels(ctx),
                        productVariantIds: batchIds,
                    });
                    await this.saveVariants(ctx, batch);
                    observer.next({
                        total: ids.length,
                        completed: Math.min((i + 1) * exports.BATCH_SIZE, ids.length),
                        duration: +new Date() - timeStart,
                    });
                }
            }
            vendure_logger_1.Logger.verbose('Completed reindexing!');
            return {
                total: ids.length,
                completed: ids.length,
                duration: +new Date() - timeStart,
            };
        });
    }
    async updateProduct(data) {
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        return this.updateProductInChannel(ctx, data.productId, ctx.channelId);
    }
    async updateVariants(data) {
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        return this.updateVariantsInChannel(ctx, data.variantIds, ctx.channelId);
    }
    async deleteProduct(data) {
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        return this.deleteProductInChannel(ctx, data.productId, (await this.getAllChannels(ctx)).map(x => x.id));
    }
    async deleteVariant(data) {
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        const variants = await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).find({
            where: { id: (0, typeorm_1.In)(data.variantIds) },
        });
        if (variants.length) {
            await this.removeSearchIndexItems(ctx, variants.map(v => v.id), (await this.getAllChannels(ctx)).map(c => c.id));
        }
        return true;
    }
    async assignProductToChannel(data) {
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        return this.updateProductInChannel(ctx, data.productId, data.channelId);
    }
    async removeProductFromChannel(data) {
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        return this.deleteProductInChannel(ctx, data.productId, [data.channelId]);
    }
    async assignVariantToChannel(data) {
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        return this.updateVariantsInChannel(ctx, [data.productVariantId], data.channelId);
    }
    async removeVariantFromChannel(data) {
        var _a;
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        const variant = await this.connection
            .getRepository(ctx, product_variant_entity_1.ProductVariant)
            .findOne({ where: { id: data.productVariantId } });
        const languageVariants = (_a = variant === null || variant === void 0 ? void 0 : variant.translations.map(t => t.languageCode)) !== null && _a !== void 0 ? _a : [];
        await this.removeSearchIndexItems(ctx, [data.productVariantId], [data.channelId]);
        return true;
    }
    async updateAsset(data) {
        const id = data.asset.id;
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        function getFocalPoint(point) {
            return point && point.x && point.y ? point : null;
        }
        const focalPoint = getFocalPoint(data.asset.focalPoint);
        await this.connection
            .getRepository(ctx, search_index_item_entity_1.SearchIndexItem)
            .update({ productAssetId: id }, { productPreviewFocalPoint: focalPoint });
        await this.connection
            .getRepository(ctx, search_index_item_entity_1.SearchIndexItem)
            .update({ productVariantAssetId: id }, { productVariantPreviewFocalPoint: focalPoint });
        return true;
    }
    async deleteAsset(data) {
        const id = data.asset.id;
        const ctx = mutable_request_context_1.MutableRequestContext.deserialize(data.ctx);
        await this.connection
            .getRepository(ctx, search_index_item_entity_1.SearchIndexItem)
            .update({ productAssetId: id }, { productAssetId: null });
        await this.connection
            .getRepository(ctx, search_index_item_entity_1.SearchIndexItem)
            .update({ productVariantAssetId: id }, { productVariantAssetId: null });
        return true;
    }
    async updateProductInChannel(ctx, productId, channelId) {
        const channel = await this.loadChannel(ctx, channelId);
        ctx.setChannel(channel);
        const product = await this.getProductInChannelQueryBuilder(ctx, productId, channel);
        if (product) {
            const affectedChannels = await this.getAllChannels(ctx, {
                where: {
                    availableLanguageCodes: (0, typeorm_1.In)(product.translations.map(t => t.languageCode)),
                },
            });
            const { variants: updatedVariants } = await this.getSearchIndexQueryBuilder(ctx, {
                channels: (0, unique_1.unique)(affectedChannels.concat(channel)),
                productId,
            });
            if (updatedVariants.length === 0) {
                const clone = new product_entity_1.Product({ id: product.id });
                await this.entityHydrator.hydrate(ctx, clone, { relations: ['translations'] });
                product.translations = clone.translations;
                await this.saveSyntheticVariant(ctx, product);
            }
            else {
                if (product.enabled === false) {
                    updatedVariants.forEach(v => (v.enabled = false));
                }
                const variantsInCurrentChannel = updatedVariants.filter(v => !!v.channels.find(c => (0, utils_1.idsAreEqual)(c.id, ctx.channelId)));
                vendure_logger_1.Logger.verbose(`Updating ${variantsInCurrentChannel.length} variants`, exports.workerLoggerCtx);
                if (variantsInCurrentChannel.length) {
                    await this.saveVariants(ctx, variantsInCurrentChannel);
                }
            }
        }
        return true;
    }
    async updateVariantsInChannel(ctx, variantIds, channelId) {
        const channel = await this.loadChannel(ctx, channelId);
        ctx.setChannel(channel);
        const { variants } = await this.getSearchIndexQueryBuilder(ctx, {
            channels: [channel],
            productVariantIds: variantIds,
        });
        if (variants) {
            vendure_logger_1.Logger.verbose(`Updating ${variants.length} variants`, exports.workerLoggerCtx);
            await this.saveVariants(ctx, variants);
        }
        return true;
    }
    async deleteProductInChannel(ctx, productId, channelIds) {
        const channels = await Promise.all(channelIds.map(channelId => this.loadChannel(ctx, channelId)));
        const product = await this.getProductInChannelQueryBuilder(ctx, productId, ...channels);
        if (product) {
            const removedVariantIds = product.variants.map(v => v.id);
            if (removedVariantIds.length) {
                await this.removeSearchIndexItems(ctx, removedVariantIds, channelIds);
            }
        }
        return true;
    }
    async loadChannel(ctx, channelId) {
        return await this.connection.getRepository(ctx, channel_entity_1.Channel).findOneOrFail({ where: { id: channelId } });
    }
    async getAllChannels(ctx, options) {
        return await this.connection
            .getRepository(ctx, channel_entity_1.Channel)
            .find(Object.assign(Object.assign({}, options), { relationLoadStrategy: 'query' }));
    }
    async getSearchIndexQueryBuilder(ctx, options) {
        const { productId = undefined, productVariantIds = undefined, channels = [], take = 50, skip = 0, } = options !== null && options !== void 0 ? options : {};
        const where = {
            deletedAt: (0, typeorm_1.IsNull)(),
            product: {
                deletedAt: (0, typeorm_1.IsNull)(),
            },
        };
        if (productId) {
            where.productId = productId;
        }
        if (productVariantIds && productVariantIds.length > 0) {
            where.id = (0, typeorm_1.In)(productVariantIds);
        }
        where.channels = { id: (0, typeorm_1.In)(channels.map(c => c.id)) };
        const [variants, count] = await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).findAndCount({
            loadEagerRelations: false,
            relations: exports.variantRelations,
            where,
            take,
            skip,
            relationLoadStrategy: 'query',
        });
        return { variants, count };
    }
    async getProductInChannelQueryBuilder(ctx, productId, ...channels) {
        const channelLanguages = (0, unique_1.unique)(channels.flatMap(c => c.availableLanguageCodes).concat(this.configService.defaultLanguageCode));
        const product = await this.connection.getRepository(ctx, product_entity_1.Product).findOne({
            loadEagerRelations: false,
            relations: exports.productRelations,
            relationLoadStrategy: 'query',
            where: { id: (0, typeorm_1.Equal)(productId), channels: { id: (0, typeorm_1.In)(channels.map(x => x.id)) } },
        });
        return product !== null && product !== void 0 ? product : undefined;
    }
    async saveVariants(ctx, variants) {
        var _a, _b, _c, _d, _e;
        const items = [];
        await this.removeSyntheticVariants(ctx, variants);
        const productMap = new Map();
        const originalChannel = ctx.channel;
        for (const variant of variants) {
            ctx.setChannel(originalChannel);
            let product = productMap.get(variant.productId);
            if (!product) {
                product = await this.getProductInChannelQueryBuilder(ctx, variant.productId, ctx.channel);
                if (!product) {
                    throw new Error('Product not found for variant!');
                }
                productMap.set(variant.productId, product);
            }
            const availableLanguageCodes = (0, unique_1.unique)(ctx.channel.availableLanguageCodes);
            for (const languageCode of availableLanguageCodes) {
                const productTranslation = this.getTranslation(product, languageCode);
                const variantTranslation = this.getTranslation(variant, languageCode);
                const collectionTranslations = variant.collections.map(c => this.getTranslation(c, languageCode));
                let channelIds = variant.channels.map(x => x.id);
                const clone = new product_variant_entity_1.ProductVariant({ id: variant.id });
                await this.entityHydrator.hydrate(ctx, clone, {
                    relations: ['channels', 'channels.defaultTaxZone'],
                });
                channelIds.push(...clone.channels
                    .filter(x => x.availableLanguageCodes.includes(languageCode))
                    .map(x => x.id));
                channelIds = (0, unique_1.unique)(channelIds);
                for (const channel of variant.channels) {
                    ctx.setChannel(channel);
                    await this.productPriceApplicator.applyChannelPriceAndTax(variant, ctx);
                    const item = new search_index_item_entity_1.SearchIndexItem({
                        channelId: ctx.channelId,
                        languageCode,
                        productVariantId: variant.id,
                        price: variant.price,
                        priceWithTax: variant.priceWithTax,
                        sku: variant.sku,
                        enabled: product.enabled === false ? false : variant.enabled,
                        slug: (_a = productTranslation === null || productTranslation === void 0 ? void 0 : productTranslation.slug) !== null && _a !== void 0 ? _a : '',
                        productId: product.id,
                        productName: (_b = productTranslation === null || productTranslation === void 0 ? void 0 : productTranslation.name) !== null && _b !== void 0 ? _b : '',
                        description: this.constrainDescription((_c = productTranslation === null || productTranslation === void 0 ? void 0 : productTranslation.description) !== null && _c !== void 0 ? _c : ''),
                        productVariantName: (_d = variantTranslation === null || variantTranslation === void 0 ? void 0 : variantTranslation.name) !== null && _d !== void 0 ? _d : '',
                        productAssetId: product.featuredAsset ? product.featuredAsset.id : null,
                        productPreviewFocalPoint: product.featuredAsset
                            ? product.featuredAsset.focalPoint
                            : null,
                        productVariantPreviewFocalPoint: variant.featuredAsset
                            ? variant.featuredAsset.focalPoint
                            : null,
                        productVariantAssetId: variant.featuredAsset ? variant.featuredAsset.id : null,
                        productPreview: product.featuredAsset ? product.featuredAsset.preview : '',
                        productVariantPreview: variant.featuredAsset ? variant.featuredAsset.preview : '',
                        channelIds: channelIds.map(x => x.toString()),
                        facetIds: this.getFacetIds(variant, product),
                        facetValueIds: this.getFacetValueIds(variant, product),
                        collectionIds: variant.collections.map(c => c.id.toString()),
                        collectionSlugs: (_e = collectionTranslations.map(c => c === null || c === void 0 ? void 0 : c.slug).filter(shared_utils_1.notNullOrUndefined)) !== null && _e !== void 0 ? _e : [],
                    });
                    if (this.options.indexStockStatus) {
                        item.inStock =
                            0 < (await this.productVariantService.getSaleableStockLevel(ctx, variant));
                        const productInStock = await this.requestContextCache.get(ctx, `productVariantsStock-${variant.productId}`, () => this.connection
                            .getRepository(ctx, product_variant_entity_1.ProductVariant)
                            .find({
                            loadEagerRelations: false,
                            where: {
                                productId: variant.productId,
                            },
                        })
                            .then(_variants => Promise.all(_variants.map(v => this.productVariantService.getSaleableStockLevel(ctx, v))))
                            .then(stockLevels => stockLevels.some(stockLevel => 0 < stockLevel)));
                        item.productInStock = productInStock;
                    }
                    items.push(item);
                }
            }
        }
        ctx.setChannel(originalChannel);
        await this.queue.push(() => this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).save(items, { chunk: 2500 }));
    }
    /**
     * If a Product has no variants, we create a synthetic variant for the purposes
     * of making that product visible via the search query.
     */
    async saveSyntheticVariant(ctx, product) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const productTranslation = this.getTranslation(product, ctx.languageCode);
        const item = new search_index_item_entity_1.SearchIndexItem({
            channelId: ctx.channelId,
            languageCode: ctx.languageCode,
            productVariantId: 0,
            price: 0,
            priceWithTax: 0,
            sku: '',
            enabled: false,
            slug: productTranslation.slug,
            productId: product.id,
            productName: productTranslation.name,
            description: this.constrainDescription(productTranslation.description),
            productVariantName: productTranslation.name,
            productAssetId: (_b = (_a = product.featuredAsset) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
            productPreviewFocalPoint: (_d = (_c = product.featuredAsset) === null || _c === void 0 ? void 0 : _c.focalPoint) !== null && _d !== void 0 ? _d : null,
            productVariantPreviewFocalPoint: null,
            productVariantAssetId: null,
            productPreview: (_f = (_e = product.featuredAsset) === null || _e === void 0 ? void 0 : _e.preview) !== null && _f !== void 0 ? _f : '',
            productVariantPreview: '',
            channelIds: [ctx.channelId.toString()],
            facetIds: (_h = (_g = product.facetValues) === null || _g === void 0 ? void 0 : _g.map(fv => fv.facet.id.toString())) !== null && _h !== void 0 ? _h : [],
            facetValueIds: (_k = (_j = product.facetValues) === null || _j === void 0 ? void 0 : _j.map(fv => fv.id.toString())) !== null && _k !== void 0 ? _k : [],
            collectionIds: [],
            collectionSlugs: [],
        });
        await this.queue.push(() => this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).save(item));
    }
    /**
     * Removes any synthetic variants for the given product
     */
    async removeSyntheticVariants(ctx, variants) {
        const prodIds = (0, unique_1.unique)(variants.map(v => v.productId));
        for (const productId of prodIds) {
            await this.queue.push(() => this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).delete({
                productId,
                sku: '',
                price: 0,
            }));
        }
    }
    getTranslation(translatable, languageCode) {
        return (translatable.translations.find(t => t.languageCode === languageCode) ||
            translatable.translations.find(t => t.languageCode === this.configService.defaultLanguageCode) ||
            translatable.translations[0]);
    }
    getFacetIds(variant, product) {
        const facetIds = (fv) => fv.facet.id.toString();
        const variantFacetIds = variant.facetValues.map(facetIds);
        const productFacetIds = product.facetValues.map(facetIds);
        return (0, unique_1.unique)([...variantFacetIds, ...productFacetIds]);
    }
    getFacetValueIds(variant, product) {
        const facetValueIds = (fv) => fv.id.toString();
        const variantFacetValueIds = variant.facetValues.map(facetValueIds);
        const productFacetValueIds = product.facetValues.map(facetValueIds);
        return (0, unique_1.unique)([...variantFacetValueIds, ...productFacetValueIds]);
    }
    /**
     * Remove items from the search index
     */
    async removeSearchIndexItems(ctx, variantIds, channelIds, ...languageCodes) {
        const keys = [];
        for (const productVariantId of variantIds) {
            for (const channelId of channelIds) {
                if (languageCodes.length > 0) {
                    for (const languageCode of languageCodes) {
                        keys.push({
                            productVariantId,
                            channelId,
                            languageCode,
                        });
                    }
                }
                else {
                    keys.push({
                        productVariantId,
                        channelId,
                    });
                }
            }
        }
        await this.queue.push(() => this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).delete(keys));
    }
    /**
     * Prevent postgres errors from too-long indices
     * https://github.com/vendure-ecommerce/vendure/issues/745
     */
    constrainDescription(description) {
        const { type } = this.connection.rawConnection.options;
        const isPostgresLike = type === 'postgres' || type === 'aurora-postgres' || type === 'cockroachdb';
        if (isPostgresLike) {
            return description.substring(0, 2600);
        }
        return description;
    }
};
exports.IndexerController = IndexerController;
exports.IndexerController = IndexerController = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, common_1.Inject)(constants_1.PLUGIN_INIT_OPTIONS)),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        entity_hydrator_service_1.EntityHydrator,
        product_price_applicator_1.ProductPriceApplicator,
        config_service_1.ConfigService,
        request_context_cache_service_1.RequestContextCacheService,
        product_variant_service_1.ProductVariantService, Object])
], IndexerController);
//# sourceMappingURL=indexer.controller.js.map