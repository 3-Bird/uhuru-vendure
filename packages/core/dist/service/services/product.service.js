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
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const unique_1 = require("@vendure/common/lib/unique");
const typeorm_1 = require("typeorm");
const errors_1 = require("../../common/error/errors");
const generated_graphql_admin_errors_1 = require("../../common/error/generated-graphql-admin-errors");
const utils_1 = require("../../common/utils");
const transactional_connection_1 = require("../../connection/transactional-connection");
const product_translation_entity_1 = require("../../entity/product/product-translation.entity");
const product_entity_1 = require("../../entity/product/product.entity");
const product_option_group_entity_1 = require("../../entity/product-option-group/product-option-group.entity");
const product_variant_entity_1 = require("../../entity/product-variant/product-variant.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const product_channel_event_1 = require("../../event-bus/events/product-channel-event");
const product_event_1 = require("../../event-bus/events/product-event");
const product_option_group_change_event_1 = require("../../event-bus/events/product-option-group-change-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const slug_validator_1 = require("../helpers/slug-validator/slug-validator");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const asset_service_1 = require("./asset.service");
const channel_service_1 = require("./channel.service");
const facet_value_service_1 = require("./facet-value.service");
const product_option_group_service_1 = require("./product-option-group.service");
const product_variant_service_1 = require("./product-variant.service");
/**
 * @description
 * Contains methods relating to {@link Product} entities.
 *
 * @docsCategory services
 */
let ProductService = class ProductService {
    constructor(connection, channelService, assetService, productVariantService, facetValueService, listQueryBuilder, translatableSaver, eventBus, slugValidator, customFieldRelationService, translator, productOptionGroupService) {
        this.connection = connection;
        this.channelService = channelService;
        this.assetService = assetService;
        this.productVariantService = productVariantService;
        this.facetValueService = facetValueService;
        this.listQueryBuilder = listQueryBuilder;
        this.translatableSaver = translatableSaver;
        this.eventBus = eventBus;
        this.slugValidator = slugValidator;
        this.customFieldRelationService = customFieldRelationService;
        this.translator = translator;
        this.productOptionGroupService = productOptionGroupService;
        this.relations = ['featuredAsset', 'assets', 'channels', 'facetValues', 'facetValues.facet'];
    }
    async findAll(ctx, options, relations) {
        const effectiveRelations = relations || this.relations.slice();
        const customPropertyMap = {};
        const hasFacetValueIdFilter = this.listQueryBuilder.filterObjectHasProperty(options === null || options === void 0 ? void 0 : options.filter, 'facetValueId');
        const hasSkuFilter = this.listQueryBuilder.filterObjectHasProperty(options === null || options === void 0 ? void 0 : options.filter, 'sku');
        if (hasFacetValueIdFilter) {
            effectiveRelations.push('facetValues');
            customPropertyMap.facetValueId = 'facetValues.id';
        }
        if (hasSkuFilter) {
            effectiveRelations.push('variants');
            customPropertyMap.sku = 'variants.sku';
        }
        return this.listQueryBuilder
            .build(product_entity_1.Product, options, {
            relations: effectiveRelations,
            channelId: ctx.channelId,
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            ctx,
            customPropertyMap,
        })
            .getManyAndCount()
            .then(async ([products, totalItems]) => {
            const items = products.map(product => this.translator.translate(product, ctx, ['facetValues', ['facetValues', 'facet']]));
            return {
                items,
                totalItems,
            };
        });
    }
    async findOne(ctx, productId, relations) {
        const effectiveRelations = relations !== null && relations !== void 0 ? relations : this.relations.slice();
        if (relations && effectiveRelations.includes('facetValues')) {
            // We need the facet to determine with the FacetValues are public
            // when serving via the Shop API.
            effectiveRelations.push('facetValues.facet');
        }
        const product = await this.connection.findOneInChannel(ctx, product_entity_1.Product, productId, ctx.channelId, {
            relations: (0, unique_1.unique)(effectiveRelations),
            where: {
                deletedAt: (0, typeorm_1.IsNull)(),
            },
        });
        if (!product) {
            return;
        }
        return this.translator.translate(product, ctx, ['facetValues', ['facetValues', 'facet']]);
    }
    async findByIds(ctx, productIds, relations) {
        const qb = this.connection
            .getRepository(ctx, product_entity_1.Product)
            .createQueryBuilder('product')
            .setFindOptions({ relations: (relations && false) || this.relations });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        typeorm_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias.metadata);
        return qb
            .leftJoin('product.channels', 'channel')
            .andWhere('product.deletedAt IS NULL')
            .andWhere('product.id IN (:...ids)', { ids: productIds })
            .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
            .getMany()
            .then(products => products.map(product => this.translator.translate(product, ctx, ['facetValues', ['facetValues', 'facet']])));
    }
    /**
     * @description
     * Returns all Channels to which the Product is assigned.
     */
    async getProductChannels(ctx, productId) {
        const product = await this.connection.getEntityOrThrow(ctx, product_entity_1.Product, productId, {
            relations: ['channels'],
            channelId: ctx.channelId,
        });
        return product.channels;
    }
    getFacetValuesForProduct(ctx, productId) {
        return this.connection
            .getRepository(ctx, product_entity_1.Product)
            .findOne({
            where: { id: productId },
            relations: ['facetValues'],
        })
            .then(variant => !variant ? [] : variant.facetValues.map(o => this.translator.translate(o, ctx, ['facet'])));
    }
    async findOneBySlug(ctx, slug, relations) {
        const qb = this.connection.getRepository(ctx, product_entity_1.Product).createQueryBuilder('product');
        const translationQb = this.connection
            .getRepository(ctx, product_translation_entity_1.ProductTranslation)
            .createQueryBuilder('_product_translation')
            .select('_product_translation.baseId')
            .andWhere('_product_translation.slug = :slug', { slug });
        qb.leftJoin('product.translations', 'translation')
            .andWhere('product.deletedAt IS NULL')
            .andWhere('product.id IN (' + translationQb.getQuery() + ')')
            .setParameters(translationQb.getParameters())
            .select('product.id', 'id')
            .addSelect(
        // eslint-disable-next-line max-len
        `CASE translation.languageCode WHEN '${ctx.languageCode}' THEN 2 WHEN '${ctx.channel.defaultLanguageCode}' THEN 1 ELSE 0 END`, 'sort_order')
            .orderBy('sort_order', 'DESC');
        // We use getRawOne here to simply get the ID as efficiently as possible,
        // which we then pass to the regular findOne() method which will handle
        // all the joins etc.
        const result = await qb.getRawOne();
        if (result) {
            return this.findOne(ctx, result.id, relations);
        }
        else {
            return undefined;
        }
    }
    async create(ctx, input) {
        await this.slugValidator.validateSlugs(ctx, input, product_translation_entity_1.ProductTranslation);
        const product = await this.translatableSaver.create({
            ctx,
            input,
            entityType: product_entity_1.Product,
            translationType: product_translation_entity_1.ProductTranslation,
            beforeSave: async (p) => {
                await this.channelService.assignToCurrentChannel(p, ctx);
                if (input.facetValueIds) {
                    p.facetValues = await this.facetValueService.findByIds(ctx, input.facetValueIds);
                }
                await this.assetService.updateFeaturedAsset(ctx, p, input);
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, product_entity_1.Product, input, product);
        await this.assetService.updateEntityAssets(ctx, product, input);
        await this.eventBus.publish(new product_event_1.ProductEvent(ctx, product, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, product.id));
    }
    async update(ctx, input) {
        const product = await this.connection.getEntityOrThrow(ctx, product_entity_1.Product, input.id, {
            channelId: ctx.channelId,
            relations: ['facetValues', 'facetValues.channels'],
        });
        await this.slugValidator.validateSlugs(ctx, input, product_translation_entity_1.ProductTranslation);
        const updatedProduct = await this.translatableSaver.update({
            ctx,
            input,
            entityType: product_entity_1.Product,
            translationType: product_translation_entity_1.ProductTranslation,
            beforeSave: async (p) => {
                if (input.facetValueIds) {
                    const facetValuesInOtherChannels = product.facetValues.filter(fv => fv.channels.every(channel => !(0, utils_1.idsAreEqual)(channel.id, ctx.channelId)));
                    p.facetValues = [
                        ...facetValuesInOtherChannels,
                        ...(await this.facetValueService.findByIds(ctx, input.facetValueIds)),
                    ];
                }
                await this.assetService.updateFeaturedAsset(ctx, p, input);
                await this.assetService.updateEntityAssets(ctx, p, input);
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, product_entity_1.Product, input, updatedProduct);
        await this.eventBus.publish(new product_event_1.ProductEvent(ctx, updatedProduct, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, updatedProduct.id));
    }
    async softDelete(ctx, productId) {
        const product = await this.connection.getEntityOrThrow(ctx, product_entity_1.Product, productId, {
            relationLoadStrategy: 'query',
            loadEagerRelations: false,
            channelId: ctx.channelId,
            relations: ['variants', 'optionGroups'],
        });
        product.deletedAt = new Date();
        await this.connection.getRepository(ctx, product_entity_1.Product).save(product, { reload: false });
        await this.eventBus.publish(new product_event_1.ProductEvent(ctx, product, 'deleted', productId));
        const variantResult = await this.productVariantService.softDelete(ctx, product.variants.map(v => v.id));
        if (variantResult.result === generated_types_1.DeletionResult.NOT_DELETED) {
            await this.connection.rollBackTransaction(ctx);
            return variantResult;
        }
        for (const optionGroup of product.optionGroups) {
            if (!optionGroup.deletedAt) {
                const groupResult = await this.productOptionGroupService.deleteGroupAndOptionsFromProduct(ctx, optionGroup.id, productId);
                if (groupResult.result === generated_types_1.DeletionResult.NOT_DELETED) {
                    await this.connection.rollBackTransaction(ctx);
                    return groupResult;
                }
            }
        }
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    /**
     * @description
     * Assigns a Product to the specified Channel, and optionally uses a `priceFactor` to set the ProductVariantPrices
     * on the new Channel.
     *
     * Internally, this method will also call {@link ProductVariantService} `assignProductVariantsToChannel()` for
     * each of the Product's variants, and will assign the Product's Assets to the Channel too.
     */
    async assignProductsToChannel(ctx, input) {
        const productsWithVariants = await this.connection.getRepository(ctx, product_entity_1.Product).find({
            where: { id: (0, typeorm_1.In)(input.productIds) },
            relations: ['variants', 'assets'],
        });
        await this.productVariantService.assignProductVariantsToChannel(ctx, {
            productVariantIds: [].concat(...productsWithVariants.map(p => p.variants.map(v => v.id))),
            channelId: input.channelId,
            priceFactor: input.priceFactor,
        });
        const assetIds = (0, unique_1.unique)([].concat(...productsWithVariants.map(p => p.assets.map(a => a.assetId))));
        await this.assetService.assignToChannel(ctx, { channelId: input.channelId, assetIds });
        const products = await this.connection
            .getRepository(ctx, product_entity_1.Product)
            .find({ where: { id: (0, typeorm_1.In)(input.productIds) } });
        for (const product of products) {
            await this.eventBus.publish(new product_channel_event_1.ProductChannelEvent(ctx, product, input.channelId, 'assigned'));
        }
        return this.findByIds(ctx, productsWithVariants.map(p => p.id));
    }
    async removeProductsFromChannel(ctx, input) {
        const productsWithVariants = await this.connection.getRepository(ctx, product_entity_1.Product).find({
            where: { id: (0, typeorm_1.In)(input.productIds) },
            relations: ['variants'],
        });
        await this.productVariantService.removeProductVariantsFromChannel(ctx, {
            productVariantIds: [].concat(...productsWithVariants.map(p => p.variants.map(v => v.id))),
            channelId: input.channelId,
        });
        const products = await this.connection
            .getRepository(ctx, product_entity_1.Product)
            .find({ where: { id: (0, typeorm_1.In)(input.productIds) } });
        for (const product of products) {
            await this.eventBus.publish(new product_channel_event_1.ProductChannelEvent(ctx, product, input.channelId, 'removed'));
        }
        return this.findByIds(ctx, productsWithVariants.map(p => p.id));
    }
    async addOptionGroupToProduct(ctx, productId, optionGroupId) {
        const product = await this.getProductWithOptionGroups(ctx, productId);
        const optionGroup = await this.connection.getRepository(ctx, product_option_group_entity_1.ProductOptionGroup).findOne({
            where: { id: optionGroupId },
            relations: ['product'],
        });
        if (!optionGroup) {
            throw new errors_1.EntityNotFoundError('ProductOptionGroup', optionGroupId);
        }
        if (optionGroup.product) {
            const translated = this.translator.translate(optionGroup.product, ctx);
            throw new errors_1.UserInputError('error.product-option-group-already-assigned', {
                groupCode: optionGroup.code,
                productName: translated.name,
            });
        }
        if (Array.isArray(product.optionGroups)) {
            product.optionGroups.push(optionGroup);
        }
        else {
            product.optionGroups = [optionGroup];
        }
        await this.connection.getRepository(ctx, product_entity_1.Product).save(product, { reload: false });
        await this.eventBus.publish(new product_option_group_change_event_1.ProductOptionGroupChangeEvent(ctx, product, optionGroupId, 'assigned'));
        return (0, utils_1.assertFound)(this.findOne(ctx, productId));
    }
    async removeOptionGroupFromProduct(ctx, productId, optionGroupId, force) {
        const product = await this.getProductWithOptionGroups(ctx, productId);
        const optionGroup = product.optionGroups.find(g => (0, utils_1.idsAreEqual)(g.id, optionGroupId));
        if (!optionGroup) {
            throw new errors_1.EntityNotFoundError('ProductOptionGroup', optionGroupId);
        }
        const optionIsInUse = product.variants.some(variant => variant.deletedAt == null &&
            variant.options.some(option => (0, utils_1.idsAreEqual)(option.groupId, optionGroupId)));
        if (optionIsInUse) {
            if (!force) {
                return new generated_graphql_admin_errors_1.ProductOptionInUseError({
                    optionGroupCode: optionGroup.code,
                    productVariantCount: product.variants.length,
                });
            }
            else {
                // We will force the removal of this ProductOptionGroup by first
                // removing all ProductOptions from the ProductVariants
                for (const variant of product.variants) {
                    variant.options = variant.options.filter(o => !(0, utils_1.idsAreEqual)(o.groupId, optionGroupId));
                }
                await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).save(product.variants, {
                    reload: false,
                });
            }
        }
        const result = await this.productOptionGroupService.deleteGroupAndOptionsFromProduct(ctx, optionGroupId, productId);
        product.optionGroups = product.optionGroups.filter(g => g.id !== optionGroupId);
        await this.connection.getRepository(ctx, product_entity_1.Product).save(product, { reload: false });
        if (result.result === generated_types_1.DeletionResult.NOT_DELETED) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            throw new errors_1.InternalServerError(result.message);
        }
        await this.eventBus.publish(new product_option_group_change_event_1.ProductOptionGroupChangeEvent(ctx, product, optionGroupId, 'removed'));
        return (0, utils_1.assertFound)(this.findOne(ctx, productId));
    }
    async getProductWithOptionGroups(ctx, productId) {
        const product = await this.connection.getRepository(ctx, product_entity_1.Product).findOne({
            relationLoadStrategy: 'query',
            loadEagerRelations: false,
            where: { id: productId, deletedAt: (0, typeorm_1.IsNull)() },
            relations: ['optionGroups', 'variants', 'variants.options'],
        });
        if (!product) {
            throw new errors_1.EntityNotFoundError('Product', productId);
        }
        return product;
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        channel_service_1.ChannelService,
        asset_service_1.AssetService,
        product_variant_service_1.ProductVariantService,
        facet_value_service_1.FacetValueService,
        list_query_builder_1.ListQueryBuilder,
        translatable_saver_1.TranslatableSaver,
        event_bus_1.EventBus,
        slug_validator_1.SlugValidator,
        custom_field_relation_service_1.CustomFieldRelationService,
        translator_service_1.TranslatorService,
        product_option_group_service_1.ProductOptionGroupService])
], ProductService);
//# sourceMappingURL=product.service.js.map