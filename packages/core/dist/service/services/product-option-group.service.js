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
exports.ProductOptionGroupService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const typeorm_1 = require("typeorm");
const utils_1 = require("../../common/utils");
const vendure_logger_1 = require("../../config/logger/vendure-logger");
const transactional_connection_1 = require("../../connection/transactional-connection");
const product_entity_1 = require("../../entity/product/product.entity");
const product_option_group_translation_entity_1 = require("../../entity/product-option-group/product-option-group-translation.entity");
const product_option_group_entity_1 = require("../../entity/product-option-group/product-option-group.entity");
const product_variant_entity_1 = require("../../entity/product-variant/product-variant.entity");
const event_bus_1 = require("../../event-bus");
const product_option_group_event_1 = require("../../event-bus/events/product-option-group-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const product_option_service_1 = require("./product-option.service");
/**
 * @description
 * Contains methods relating to {@link ProductOptionGroup} entities.
 *
 * @docsCategory services
 */
let ProductOptionGroupService = class ProductOptionGroupService {
    constructor(connection, translatableSaver, customFieldRelationService, productOptionService, eventBus, translator) {
        this.connection = connection;
        this.translatableSaver = translatableSaver;
        this.customFieldRelationService = customFieldRelationService;
        this.productOptionService = productOptionService;
        this.eventBus = eventBus;
        this.translator = translator;
    }
    findAll(ctx, filterTerm, relations) {
        const findOptions = {
            relations: relations !== null && relations !== void 0 ? relations : ['options'],
        };
        if (filterTerm) {
            findOptions.where = {
                code: (0, typeorm_1.Like)(`%${filterTerm}%`),
            };
        }
        return this.connection
            .getRepository(ctx, product_option_group_entity_1.ProductOptionGroup)
            .find(findOptions)
            .then(groups => groups.map(group => this.translator.translate(group, ctx, ['options'])));
    }
    findOne(ctx, id, relations) {
        return this.connection
            .getRepository(ctx, product_option_group_entity_1.ProductOptionGroup)
            .findOne({
            where: { id },
            relations: relations !== null && relations !== void 0 ? relations : ['options'],
        })
            .then(group => { var _a; return (_a = (group && this.translator.translate(group, ctx, ['options']))) !== null && _a !== void 0 ? _a : undefined; });
    }
    getOptionGroupsByProductId(ctx, id) {
        return this.connection
            .getRepository(ctx, product_option_group_entity_1.ProductOptionGroup)
            .find({
            relations: ['options'],
            where: {
                product: { id },
            },
            order: {
                id: 'ASC',
            },
        })
            .then(groups => groups.map(group => this.translator.translate(group, ctx, ['options'])));
    }
    async create(ctx, input) {
        const group = await this.translatableSaver.create({
            ctx,
            input,
            entityType: product_option_group_entity_1.ProductOptionGroup,
            translationType: product_option_group_translation_entity_1.ProductOptionGroupTranslation,
        });
        const groupWithRelations = await this.customFieldRelationService.updateRelations(ctx, product_option_group_entity_1.ProductOptionGroup, input, group);
        await this.eventBus.publish(new product_option_group_event_1.ProductOptionGroupEvent(ctx, groupWithRelations, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, group.id));
    }
    async update(ctx, input) {
        const group = await this.translatableSaver.update({
            ctx,
            input,
            entityType: product_option_group_entity_1.ProductOptionGroup,
            translationType: product_option_group_translation_entity_1.ProductOptionGroupTranslation,
        });
        await this.customFieldRelationService.updateRelations(ctx, product_option_group_entity_1.ProductOptionGroup, input, group);
        await this.eventBus.publish(new product_option_group_event_1.ProductOptionGroupEvent(ctx, group, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, group.id));
    }
    /**
     * @description
     * Deletes the ProductOptionGroup and any associated ProductOptions. If the ProductOptionGroup
     * is still referenced by a soft-deleted Product, then a soft-delete will be used to preserve
     * referential integrity. Otherwise a hard-delete will be performed.
     */
    async deleteGroupAndOptionsFromProduct(ctx, id, productId) {
        const optionGroup = await this.connection.getEntityOrThrow(ctx, product_option_group_entity_1.ProductOptionGroup, id, {
            relationLoadStrategy: 'query',
            loadEagerRelations: false,
            relations: ['options', 'product'],
        });
        const deletedOptionGroup = new product_option_group_entity_1.ProductOptionGroup(optionGroup);
        const inUseByActiveProducts = await this.isInUseByOtherProducts(ctx, optionGroup, productId);
        if (0 < inUseByActiveProducts) {
            return {
                result: generated_types_1.DeletionResult.NOT_DELETED,
                message: ctx.translate('message.product-option-group-used', {
                    code: optionGroup.code,
                    count: inUseByActiveProducts,
                }),
            };
        }
        const optionsToDelete = optionGroup.options && optionGroup.options.filter(group => !group.deletedAt);
        for (const option of optionsToDelete) {
            const { result, message } = await this.productOptionService.delete(ctx, option.id);
            if (result === generated_types_1.DeletionResult.NOT_DELETED) {
                await this.connection.rollBackTransaction(ctx);
                return { result, message };
            }
        }
        const hasOptionsWhichAreInUse = await this.groupOptionsAreInUse(ctx, optionGroup);
        if (0 < hasOptionsWhichAreInUse) {
            // soft delete
            optionGroup.deletedAt = new Date();
            await this.connection.getRepository(ctx, product_option_group_entity_1.ProductOptionGroup).save(optionGroup, { reload: false });
        }
        else {
            // hard delete
            const product = await this.connection.getRepository(ctx, product_entity_1.Product).findOne({
                relationLoadStrategy: 'query',
                loadEagerRelations: false,
                where: { id: productId },
                relations: ['optionGroups'],
            });
            if (product) {
                product.optionGroups = product.optionGroups.filter(og => !(0, utils_1.idsAreEqual)(og.id, id));
                await this.connection.getRepository(ctx, product_entity_1.Product).save(product, { reload: false });
            }
            try {
                await this.connection.getRepository(ctx, product_option_group_entity_1.ProductOptionGroup).remove(optionGroup);
            }
            catch (e) {
                vendure_logger_1.Logger.error(e.message, undefined, e.stack);
            }
        }
        await this.eventBus.publish(new product_option_group_event_1.ProductOptionGroupEvent(ctx, deletedOptionGroup, 'deleted', id));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    async isInUseByOtherProducts(ctx, productOptionGroup, targetProductId) {
        return this.connection
            .getRepository(ctx, product_entity_1.Product)
            .createQueryBuilder('product')
            .leftJoin('product.optionGroups', 'optionGroup')
            .where('product.deletedAt IS NULL')
            .andWhere('optionGroup.id = :id', { id: productOptionGroup.id })
            .andWhere('product.id != :productId', { productId: targetProductId })
            .getCount();
    }
    async groupOptionsAreInUse(ctx, productOptionGroup) {
        return this.connection
            .getRepository(ctx, product_variant_entity_1.ProductVariant)
            .createQueryBuilder('variant')
            .leftJoin('variant.options', 'option')
            .where('option.groupId = :groupId', { groupId: productOptionGroup.id })
            .getCount();
    }
};
exports.ProductOptionGroupService = ProductOptionGroupService;
exports.ProductOptionGroupService = ProductOptionGroupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        translatable_saver_1.TranslatableSaver,
        custom_field_relation_service_1.CustomFieldRelationService,
        product_option_service_1.ProductOptionService,
        event_bus_1.EventBus,
        translator_service_1.TranslatorService])
], ProductOptionGroupService);
//# sourceMappingURL=product-option-group.service.js.map