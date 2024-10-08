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
exports.FacetValueService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const request_context_1 = require("../../api/common/request-context");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const entity_1 = require("../../entity");
const facet_value_translation_entity_1 = require("../../entity/facet-value/facet-value-translation.entity");
const facet_value_entity_1 = require("../../entity/facet-value/facet-value.entity");
const event_bus_1 = require("../../event-bus");
const facet_value_event_1 = require("../../event-bus/events/facet-value-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const translate_entity_1 = require("../helpers/utils/translate-entity");
const channel_service_1 = require("./channel.service");
/**
 * @description
 * Contains methods relating to {@link FacetValue} entities.
 *
 * @docsCategory services
 */
let FacetValueService = class FacetValueService {
    constructor(connection, translatableSaver, configService, customFieldRelationService, channelService, eventBus, translator, listQueryBuilder) {
        this.connection = connection;
        this.translatableSaver = translatableSaver;
        this.configService = configService;
        this.customFieldRelationService = customFieldRelationService;
        this.channelService = channelService;
        this.eventBus = eventBus;
        this.translator = translator;
        this.listQueryBuilder = listQueryBuilder;
    }
    findAll(ctxOrLang, lang) {
        const [repository, languageCode] = ctxOrLang instanceof request_context_1.RequestContext
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                [this.connection.getRepository(ctxOrLang, facet_value_entity_1.FacetValue), lang]
            : [this.connection.rawConnection.getRepository(facet_value_entity_1.FacetValue), ctxOrLang];
        // TODO: Implement usage of channelLanguageCode
        return repository
            .find({
            relations: ['facet'],
        })
            .then(facetValues => facetValues.map(facetValue => (0, translate_entity_1.translateDeep)(facetValue, languageCode, ['facet'])));
    }
    /**
     * @description
     * Returns a PaginatedList of FacetValues.
     *
     * TODO: in v2 this should replace the `findAll()` method.
     * A separate method was created just to avoid a breaking change in v1.9.
     */
    findAllList(ctx, options, relations) {
        return this.listQueryBuilder
            .build(facet_value_entity_1.FacetValue, options, {
            ctx,
            relations: relations !== null && relations !== void 0 ? relations : ['facet'],
            channelId: ctx.channelId,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => {
            return {
                items: items.map(item => this.translator.translate(item, ctx, ['facet'])),
                totalItems,
            };
        });
    }
    findOne(ctx, id) {
        return this.connection
            .getRepository(ctx, facet_value_entity_1.FacetValue)
            .findOne({
            where: { id },
            relations: ['facet'],
        })
            .then(facetValue => { var _a; return (_a = (facetValue && this.translator.translate(facetValue, ctx, ['facet']))) !== null && _a !== void 0 ? _a : undefined; });
    }
    findByIds(ctx, ids) {
        const facetValues = this.connection.findByIdsInChannel(ctx, facet_value_entity_1.FacetValue, ids, ctx.channelId, {
            relations: ['facet'],
        });
        return facetValues.then(values => values.map(facetValue => this.translator.translate(facetValue, ctx, ['facet'])));
    }
    /**
     * @description
     * Returns all FacetValues belonging to the Facet with the given id.
     */
    findByFacetId(ctx, id) {
        return this.connection
            .getRepository(ctx, facet_value_entity_1.FacetValue)
            .find({
            where: {
                facet: { id },
            },
        })
            .then(values => values.map(facetValue => this.translator.translate(facetValue, ctx)));
    }
    /**
     * @description
     * Returns all FacetValues belonging to the Facet with the given id.
     */
    findByFacetIdList(ctx, id, options, relations) {
        return this.listQueryBuilder
            .build(facet_value_entity_1.FacetValue, options, {
            ctx,
            relations: relations !== null && relations !== void 0 ? relations : ['facet'],
            channelId: ctx.channelId,
            entityAlias: 'facetValue',
        })
            .andWhere('facetValue.facetId = :id', { id })
            .getManyAndCount()
            .then(([items, totalItems]) => {
            return {
                items: items.map(item => this.translator.translate(item, ctx, ['facet'])),
                totalItems,
            };
        });
    }
    async create(ctx, facet, input) {
        const facetValue = await this.translatableSaver.create({
            ctx,
            input,
            entityType: facet_value_entity_1.FacetValue,
            translationType: facet_value_translation_entity_1.FacetValueTranslation,
            beforeSave: async (fv) => {
                fv.facet = facet;
                await this.channelService.assignToCurrentChannel(fv, ctx);
            },
        });
        const facetValueWithRelations = await this.customFieldRelationService.updateRelations(ctx, facet_value_entity_1.FacetValue, input, facetValue);
        await this.eventBus.publish(new facet_value_event_1.FacetValueEvent(ctx, facetValueWithRelations, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, facetValue.id));
    }
    async update(ctx, input) {
        const facetValue = await this.translatableSaver.update({
            ctx,
            input,
            entityType: facet_value_entity_1.FacetValue,
            translationType: facet_value_translation_entity_1.FacetValueTranslation,
        });
        await this.customFieldRelationService.updateRelations(ctx, facet_value_entity_1.FacetValue, input, facetValue);
        await this.eventBus.publish(new facet_value_event_1.FacetValueEvent(ctx, facetValue, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, facetValue.id));
    }
    async delete(ctx, id, force = false) {
        const { productCount, variantCount } = await this.checkFacetValueUsage(ctx, [id]);
        const isInUse = !!(productCount || variantCount);
        const both = !!(productCount && variantCount) ? 'both' : 'single';
        let message = '';
        let result;
        const facetValue = await this.connection.getEntityOrThrow(ctx, facet_value_entity_1.FacetValue, id);
        const i18nVars = {
            products: productCount,
            variants: variantCount,
            both,
            facetValueCode: facetValue.code,
        };
        // Create a new facetValue so that the id is still available
        // after deletion (the .remove() method sets it to undefined)
        const deletedFacetValue = new facet_value_entity_1.FacetValue(facetValue);
        if (!isInUse) {
            await this.connection.getRepository(ctx, facet_value_entity_1.FacetValue).remove(facetValue);
            await this.eventBus.publish(new facet_value_event_1.FacetValueEvent(ctx, deletedFacetValue, 'deleted', id));
            result = generated_types_1.DeletionResult.DELETED;
        }
        else if (force) {
            await this.connection.getRepository(ctx, facet_value_entity_1.FacetValue).remove(facetValue);
            await this.eventBus.publish(new facet_value_event_1.FacetValueEvent(ctx, deletedFacetValue, 'deleted', id));
            message = ctx.translate('message.facet-value-force-deleted', i18nVars);
            result = generated_types_1.DeletionResult.DELETED;
        }
        else {
            message = ctx.translate('message.facet-value-used', i18nVars);
            result = generated_types_1.DeletionResult.NOT_DELETED;
        }
        return {
            result,
            message,
        };
    }
    /**
     * @description
     * Checks for usage of the given FacetValues in any Products or Variants, and returns the counts.
     */
    async checkFacetValueUsage(ctx, facetValueIds, channelId) {
        const consumingProductsQb = this.connection
            .getRepository(ctx, entity_1.Product)
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.facetValues', 'facetValues')
            .where('facetValues.id IN (:...facetValueIds)', { facetValueIds })
            .andWhere('product.deletedAt IS NULL');
        const consumingVariantsQb = this.connection
            .getRepository(ctx, entity_1.ProductVariant)
            .createQueryBuilder('variant')
            .leftJoinAndSelect('variant.facetValues', 'facetValues')
            .where('facetValues.id IN (:...facetValueIds)', { facetValueIds })
            .andWhere('variant.deletedAt IS NULL');
        if (channelId) {
            consumingProductsQb
                .leftJoin('product.channels', 'product_channel')
                .leftJoin('facetValues.channels', 'channel')
                .andWhere('product_channel.id = :channelId')
                .andWhere('channel.id = :channelId')
                .setParameter('channelId', channelId);
            consumingVariantsQb
                .leftJoin('variant.channels', 'variant_channel')
                .leftJoin('facetValues.channels', 'channel')
                .andWhere('variant_channel.id = :channelId')
                .andWhere('channel.id = :channelId')
                .setParameter('channelId', channelId);
        }
        return {
            productCount: await consumingProductsQb.getCount(),
            variantCount: await consumingVariantsQb.getCount(),
        };
    }
};
exports.FacetValueService = FacetValueService;
exports.FacetValueService = FacetValueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        translatable_saver_1.TranslatableSaver,
        config_service_1.ConfigService,
        custom_field_relation_service_1.CustomFieldRelationService,
        channel_service_1.ChannelService,
        event_bus_1.EventBus,
        translator_service_1.TranslatorService,
        list_query_builder_1.ListQueryBuilder])
], FacetValueService);
//# sourceMappingURL=facet-value.service.js.map