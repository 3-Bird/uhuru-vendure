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
exports.FastImporterService = void 0;
const common_1 = require("@nestjs/common");
const normalize_string_1 = require("@vendure/common/lib/normalize-string");
const unique_1 = require("@vendure/common/lib/unique");
const request_context_1 = require("../../../api/common/request-context");
const transactional_connection_1 = require("../../../connection/transactional-connection");
const product_asset_entity_1 = require("../../../entity/product/product-asset.entity");
const product_translation_entity_1 = require("../../../entity/product/product-translation.entity");
const product_entity_1 = require("../../../entity/product/product.entity");
const product_option_translation_entity_1 = require("../../../entity/product-option/product-option-translation.entity");
const product_option_entity_1 = require("../../../entity/product-option/product-option.entity");
const product_option_group_translation_entity_1 = require("../../../entity/product-option-group/product-option-group-translation.entity");
const product_option_group_entity_1 = require("../../../entity/product-option-group/product-option-group.entity");
const product_variant_asset_entity_1 = require("../../../entity/product-variant/product-variant-asset.entity");
const product_variant_price_entity_1 = require("../../../entity/product-variant/product-variant-price.entity");
const product_variant_translation_entity_1 = require("../../../entity/product-variant/product-variant-translation.entity");
const product_variant_entity_1 = require("../../../entity/product-variant/product-variant.entity");
const request_context_service_1 = require("../../../service/helpers/request-context/request-context.service");
const translatable_saver_1 = require("../../../service/helpers/translatable-saver/translatable-saver");
const channel_service_1 = require("../../../service/services/channel.service");
const stock_movement_service_1 = require("../../../service/services/stock-movement.service");
/**
 * @description
 * A service to import entities into the database. This replaces the regular `create` methods of the service layer with faster
 * versions which skip much of the defensive checks and other DB calls which are not needed when running an import. It also
 * does not publish any events, so e.g. will not trigger search index jobs.
 *
 * In testing, the use of the FastImporterService approximately doubled the speed of bulk imports.
 *
 * @docsCategory import-export
 */
let FastImporterService = class FastImporterService {
    /** @internal */
    constructor(connection, channelService, stockMovementService, translatableSaver, requestContextService) {
        this.connection = connection;
        this.channelService = channelService;
        this.stockMovementService = stockMovementService;
        this.translatableSaver = translatableSaver;
        this.requestContextService = requestContextService;
    }
    /**
     * @description
     * This should be called prior to any of the import methods, as it establishes the
     * default Channel as well as the context in which the new entities will be created.
     *
     * Passing a `channel` argument means that Products and ProductVariants will be assigned
     * to that Channel.
     */
    async initialize(channel) {
        this.importCtx = channel
            ? await this.requestContextService.create({
                apiType: 'admin',
                channelOrToken: channel,
            })
            : request_context_1.RequestContext.empty();
        this.defaultChannel = await this.channelService.getDefaultChannel(this.importCtx);
    }
    async createProduct(input) {
        this.ensureInitialized();
        // https://github.com/vendure-ecommerce/vendure/issues/2053
        // normalizes slug without validation for faster performance
        input.translations.map(translation => {
            translation.slug = (0, normalize_string_1.normalizeString)(translation.slug, '-');
        });
        const product = await this.translatableSaver.create({
            ctx: this.importCtx,
            input,
            entityType: product_entity_1.Product,
            translationType: product_translation_entity_1.ProductTranslation,
            beforeSave: async (p) => {
                p.channels = (0, unique_1.unique)([this.defaultChannel, this.importCtx.channel], 'id');
                if (input.facetValueIds) {
                    p.facetValues = input.facetValueIds.map(id => ({ id }));
                }
                if (input.featuredAssetId) {
                    p.featuredAsset = { id: input.featuredAssetId };
                }
            },
        });
        if (input.assetIds) {
            const productAssets = input.assetIds.map((id, i) => new product_asset_entity_1.ProductAsset({
                assetId: id,
                productId: product.id,
                position: i,
            }));
            await this.connection
                .getRepository(this.importCtx, product_asset_entity_1.ProductAsset)
                .save(productAssets, { reload: false });
        }
        return product.id;
    }
    async createProductOptionGroup(input) {
        this.ensureInitialized();
        const group = await this.translatableSaver.create({
            ctx: this.importCtx,
            input,
            entityType: product_option_group_entity_1.ProductOptionGroup,
            translationType: product_option_group_translation_entity_1.ProductOptionGroupTranslation,
        });
        return group.id;
    }
    async createProductOption(input) {
        this.ensureInitialized();
        const option = await this.translatableSaver.create({
            ctx: this.importCtx,
            input,
            entityType: product_option_entity_1.ProductOption,
            translationType: product_option_translation_entity_1.ProductOptionTranslation,
            beforeSave: po => (po.group = { id: input.productOptionGroupId }),
        });
        return option.id;
    }
    async addOptionGroupToProduct(productId, optionGroupId) {
        this.ensureInitialized();
        await this.connection
            .getRepository(this.importCtx, product_entity_1.Product)
            .createQueryBuilder()
            .relation('optionGroups')
            .of(productId)
            .add(optionGroupId);
    }
    async createProductVariant(input) {
        var _a;
        this.ensureInitialized();
        if (!input.optionIds) {
            input.optionIds = [];
        }
        if (input.price == null) {
            input.price = 0;
        }
        const inputWithoutPrice = Object.assign({}, input);
        delete inputWithoutPrice.price;
        const createdVariant = await this.translatableSaver.create({
            ctx: this.importCtx,
            input: inputWithoutPrice,
            entityType: product_variant_entity_1.ProductVariant,
            translationType: product_variant_translation_entity_1.ProductVariantTranslation,
            beforeSave: async (variant) => {
                variant.channels = (0, unique_1.unique)([this.defaultChannel, this.importCtx.channel], 'id');
                const { optionIds } = input;
                if (optionIds && optionIds.length) {
                    variant.options = optionIds.map(id => ({ id }));
                }
                if (input.facetValueIds) {
                    variant.facetValues = input.facetValueIds.map(id => ({ id }));
                }
                variant.product = { id: input.productId };
                variant.taxCategory = { id: input.taxCategoryId };
                if (input.featuredAssetId) {
                    variant.featuredAsset = { id: input.featuredAssetId };
                }
            },
        });
        if (input.assetIds) {
            const variantAssets = input.assetIds.map((id, i) => new product_variant_asset_entity_1.ProductVariantAsset({
                assetId: id,
                productVariantId: createdVariant.id,
                position: i,
            }));
            await this.connection
                .getRepository(this.importCtx, product_variant_asset_entity_1.ProductVariantAsset)
                .save(variantAssets, { reload: false });
        }
        await this.stockMovementService.adjustProductVariantStock(this.importCtx, createdVariant.id, (_a = input.stockOnHand) !== null && _a !== void 0 ? _a : 0);
        const assignedChannelIds = (0, unique_1.unique)([this.defaultChannel, this.importCtx.channel], 'id').map(c => c.id);
        for (const channelId of assignedChannelIds) {
            const variantPrice = new product_variant_price_entity_1.ProductVariantPrice({
                price: input.price,
                channelId,
                currencyCode: this.defaultChannel.defaultCurrencyCode,
            });
            variantPrice.variant = createdVariant;
            await this.connection
                .getRepository(this.importCtx, product_variant_price_entity_1.ProductVariantPrice)
                .save(variantPrice, { reload: false });
        }
        return createdVariant.id;
    }
    ensureInitialized() {
        if (!this.defaultChannel || !this.importCtx) {
            throw new Error("The FastImporterService must be initialized with a call to 'initialize()' before importing data");
        }
    }
};
exports.FastImporterService = FastImporterService;
exports.FastImporterService = FastImporterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        channel_service_1.ChannelService,
        stock_movement_service_1.StockMovementService,
        translatable_saver_1.TranslatableSaver,
        request_context_service_1.RequestContextService])
], FastImporterService);
//# sourceMappingURL=fast-importer.service.js.map