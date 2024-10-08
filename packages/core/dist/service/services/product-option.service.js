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
exports.ProductOptionService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const utils_1 = require("../../common/utils");
const vendure_logger_1 = require("../../config/logger/vendure-logger");
const transactional_connection_1 = require("../../connection/transactional-connection");
const product_option_translation_entity_1 = require("../../entity/product-option/product-option-translation.entity");
const product_option_entity_1 = require("../../entity/product-option/product-option.entity");
const product_option_group_entity_1 = require("../../entity/product-option-group/product-option-group.entity");
const product_variant_entity_1 = require("../../entity/product-variant/product-variant.entity");
const event_bus_1 = require("../../event-bus");
const product_option_event_1 = require("../../event-bus/events/product-option-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
/**
 * @description
 * Contains methods relating to {@link ProductOption} entities.
 *
 * @docsCategory services
 */
let ProductOptionService = class ProductOptionService {
    constructor(connection, translatableSaver, customFieldRelationService, eventBus, translator) {
        this.connection = connection;
        this.translatableSaver = translatableSaver;
        this.customFieldRelationService = customFieldRelationService;
        this.eventBus = eventBus;
        this.translator = translator;
    }
    findAll(ctx) {
        return this.connection
            .getRepository(ctx, product_option_entity_1.ProductOption)
            .find({
            relations: ['group'],
        })
            .then(options => options.map(option => this.translator.translate(option, ctx)));
    }
    findOne(ctx, id) {
        return this.connection
            .getRepository(ctx, product_option_entity_1.ProductOption)
            .findOne({
            where: { id },
            relations: ['group'],
        })
            .then(option => { var _a; return (_a = (option && this.translator.translate(option, ctx))) !== null && _a !== void 0 ? _a : undefined; });
    }
    async create(ctx, group, input) {
        const productOptionGroup = group instanceof product_option_group_entity_1.ProductOptionGroup
            ? group
            : await this.connection.getEntityOrThrow(ctx, product_option_group_entity_1.ProductOptionGroup, group);
        const option = await this.translatableSaver.create({
            ctx,
            input,
            entityType: product_option_entity_1.ProductOption,
            translationType: product_option_translation_entity_1.ProductOptionTranslation,
            beforeSave: po => (po.group = productOptionGroup),
        });
        const optionWithRelations = await this.customFieldRelationService.updateRelations(ctx, product_option_entity_1.ProductOption, input, option);
        await this.eventBus.publish(new product_option_event_1.ProductOptionEvent(ctx, optionWithRelations, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, option.id));
    }
    async update(ctx, input) {
        const option = await this.translatableSaver.update({
            ctx,
            input,
            entityType: product_option_entity_1.ProductOption,
            translationType: product_option_translation_entity_1.ProductOptionTranslation,
        });
        await this.customFieldRelationService.updateRelations(ctx, product_option_entity_1.ProductOption, input, option);
        await this.eventBus.publish(new product_option_event_1.ProductOptionEvent(ctx, option, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, option.id));
    }
    /**
     * @description
     * Deletes a ProductOption.
     *
     * - If the ProductOption is used by any ProductVariants, the deletion will fail.
     * - If the ProductOption is used only by soft-deleted ProductVariants, the option will itself
     *   be soft-deleted.
     * - If the ProductOption is not used by any ProductVariant at all, it will be hard-deleted.
     */
    async delete(ctx, id) {
        const productOption = await this.connection.getEntityOrThrow(ctx, product_option_entity_1.ProductOption, id);
        const deletedProductOption = new product_option_entity_1.ProductOption(productOption);
        const inUseByActiveVariants = await this.isInUse(ctx, productOption, 'active');
        if (0 < inUseByActiveVariants) {
            return {
                result: generated_types_1.DeletionResult.NOT_DELETED,
                message: ctx.translate('message.product-option-used', {
                    code: productOption.code,
                    count: inUseByActiveVariants,
                }),
            };
        }
        const isInUseBySoftDeletedVariants = await this.isInUse(ctx, productOption, 'soft-deleted');
        if (0 < isInUseBySoftDeletedVariants) {
            // soft delete
            productOption.deletedAt = new Date();
            await this.connection.getRepository(ctx, product_option_entity_1.ProductOption).save(productOption, { reload: false });
        }
        else {
            // hard delete
            try {
                await this.connection.getRepository(ctx, product_option_entity_1.ProductOption).remove(productOption);
            }
            catch (e) {
                vendure_logger_1.Logger.error(e.message, undefined, e.stack);
            }
        }
        await this.eventBus.publish(new product_option_event_1.ProductOptionEvent(ctx, deletedProductOption, 'deleted', id));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    async isInUse(ctx, productOption, variantState) {
        return this.connection
            .getRepository(ctx, product_variant_entity_1.ProductVariant)
            .createQueryBuilder('variant')
            .leftJoin('variant.options', 'option')
            .where(variantState === 'active' ? 'variant.deletedAt IS NULL' : 'variant.deletedAt IS NOT NULL')
            .andWhere('option.id = :id', { id: productOption.id })
            .getCount();
    }
};
exports.ProductOptionService = ProductOptionService;
exports.ProductOptionService = ProductOptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        translatable_saver_1.TranslatableSaver,
        custom_field_relation_service_1.CustomFieldRelationService,
        event_bus_1.EventBus,
        translator_service_1.TranslatorService])
], ProductOptionService);
//# sourceMappingURL=product-option.service.js.map