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
exports.FacetService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const typeorm_1 = require("typeorm");
const request_context_1 = require("../../api/common/request-context");
const common_2 = require("../../common");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const facet_translation_entity_1 = require("../../entity/facet/facet-translation.entity");
const facet_entity_1 = require("../../entity/facet/facet.entity");
const facet_value_entity_1 = require("../../entity/facet-value/facet-value.entity");
const event_bus_1 = require("../../event-bus");
const facet_event_1 = require("../../event-bus/events/facet-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const translate_entity_1 = require("../helpers/utils/translate-entity");
const channel_service_1 = require("./channel.service");
const facet_value_service_1 = require("./facet-value.service");
const role_service_1 = require("./role.service");
/**
 * @description
 * Contains methods relating to {@link Facet} entities.
 *
 * @docsCategory services
 */
let FacetService = class FacetService {
    constructor(connection, facetValueService, translatableSaver, listQueryBuilder, configService, channelService, customFieldRelationService, eventBus, translator, roleService) {
        this.connection = connection;
        this.facetValueService = facetValueService;
        this.translatableSaver = translatableSaver;
        this.listQueryBuilder = listQueryBuilder;
        this.configService = configService;
        this.channelService = channelService;
        this.customFieldRelationService = customFieldRelationService;
        this.eventBus = eventBus;
        this.translator = translator;
        this.roleService = roleService;
    }
    findAll(ctx, options, relations) {
        return this.listQueryBuilder
            .build(facet_entity_1.Facet, options, {
            relations: relations !== null && relations !== void 0 ? relations : ['values', 'values.facet', 'channels'],
            ctx,
            channelId: ctx.channelId,
        })
            .getManyAndCount()
            .then(([facets, totalItems]) => {
            const items = facets.map(facet => this.translator.translate(facet, ctx, ['values', ['values', 'facet']]));
            return {
                items,
                totalItems,
            };
        });
    }
    findOne(ctx, facetId, relations) {
        return this.connection
            .findOneInChannel(ctx, facet_entity_1.Facet, facetId, ctx.channelId, {
            relations: relations !== null && relations !== void 0 ? relations : ['values', 'values.facet', 'channels'],
        })
            .then(facet => {
            var _a;
            return (_a = (facet && this.translator.translate(facet, ctx, ['values', ['values', 'facet']]))) !== null && _a !== void 0 ? _a : undefined;
        });
    }
    findByCode(ctxOrFacetCode, facetCodeOrLang, lang) {
        const relations = ['values', 'values.facet'];
        const [repository, facetCode, languageCode] = ctxOrFacetCode instanceof request_context_1.RequestContext
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                [this.connection.getRepository(ctxOrFacetCode, facet_entity_1.Facet), facetCodeOrLang, lang]
            : [
                this.connection.rawConnection.getRepository(facet_entity_1.Facet),
                ctxOrFacetCode,
                facetCodeOrLang,
            ];
        // TODO: Implement usage of channelLanguageCode
        return repository
            .findOne({
            where: {
                code: facetCode,
            },
            relations,
        })
            .then(facet => {
            var _a;
            return (_a = (facet && (0, translate_entity_1.translateDeep)(facet, languageCode, ['values', ['values', 'facet']]))) !== null && _a !== void 0 ? _a : undefined;
        });
    }
    /**
     * @description
     * Returns the Facet which contains the given FacetValue id.
     */
    async findByFacetValueId(ctx, id) {
        const facet = await this.connection
            .getRepository(ctx, facet_entity_1.Facet)
            .createQueryBuilder('facet')
            .leftJoinAndSelect('facet.translations', 'translations')
            .leftJoin('facet.values', 'facetValue')
            .where('facetValue.id = :id', { id })
            .getOne();
        if (facet) {
            return this.translator.translate(facet, ctx);
        }
    }
    async create(ctx, input) {
        const facet = await this.translatableSaver.create({
            ctx,
            input,
            entityType: facet_entity_1.Facet,
            translationType: facet_translation_entity_1.FacetTranslation,
            beforeSave: async (f) => {
                f.code = await this.ensureUniqueCode(ctx, f.code);
                await this.channelService.assignToCurrentChannel(f, ctx);
            },
        });
        const facetWithRelations = await this.customFieldRelationService.updateRelations(ctx, facet_entity_1.Facet, input, facet);
        await this.eventBus.publish(new facet_event_1.FacetEvent(ctx, facetWithRelations, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, facet.id));
    }
    async update(ctx, input) {
        const facet = await this.translatableSaver.update({
            ctx,
            input,
            entityType: facet_entity_1.Facet,
            translationType: facet_translation_entity_1.FacetTranslation,
            beforeSave: async (f) => {
                if (f.code) {
                    f.code = await this.ensureUniqueCode(ctx, f.code, f.id);
                }
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, facet_entity_1.Facet, input, facet);
        await this.eventBus.publish(new facet_event_1.FacetEvent(ctx, facet, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, facet.id));
    }
    async delete(ctx, id, force = false) {
        const facet = await this.connection.getEntityOrThrow(ctx, facet_entity_1.Facet, id, {
            relations: ['values'],
            channelId: ctx.channelId,
        });
        let productCount = 0;
        let variantCount = 0;
        if (facet.values.length) {
            const counts = await this.facetValueService.checkFacetValueUsage(ctx, facet.values.map(fv => fv.id));
            productCount = counts.productCount;
            variantCount = counts.variantCount;
        }
        const isInUse = !!(productCount || variantCount);
        const both = !!(productCount && variantCount) ? 'both' : 'single';
        const i18nVars = { products: productCount, variants: variantCount, both, facetCode: facet.code };
        let message = '';
        let result;
        const deletedFacet = new facet_entity_1.Facet(facet);
        if (!isInUse) {
            await this.connection.getRepository(ctx, facet_entity_1.Facet).remove(facet);
            await this.eventBus.publish(new facet_event_1.FacetEvent(ctx, deletedFacet, 'deleted', id));
            result = generated_types_1.DeletionResult.DELETED;
        }
        else if (force) {
            await this.connection.getRepository(ctx, facet_entity_1.Facet).remove(facet);
            await this.eventBus.publish(new facet_event_1.FacetEvent(ctx, deletedFacet, 'deleted', id));
            message = ctx.translate('message.facet-force-deleted', i18nVars);
            result = generated_types_1.DeletionResult.DELETED;
        }
        else {
            message = ctx.translate('message.facet-used', i18nVars);
            result = generated_types_1.DeletionResult.NOT_DELETED;
        }
        return {
            result,
            message,
        };
    }
    /**
     * Checks to ensure the Facet code is unique. If there is a conflict, then the code is suffixed
     * with an incrementing integer.
     */
    async ensureUniqueCode(ctx, code, id) {
        let candidate = code;
        let suffix = 1;
        let conflict = false;
        const alreadySuffixed = /-\d+$/;
        do {
            const match = await this.connection
                .getRepository(ctx, facet_entity_1.Facet)
                .findOne({ where: { code: candidate } });
            conflict = !!match && ((id != null && !(0, utils_1.idsAreEqual)(match.id, id)) || id == null);
            if (conflict) {
                suffix++;
                if (alreadySuffixed.test(candidate)) {
                    candidate = candidate.replace(alreadySuffixed, `-${suffix}`);
                }
                else {
                    candidate = `${candidate}-${suffix}`;
                }
            }
        } while (conflict);
        return candidate;
    }
    /**
     * @description
     * Assigns Facets to the specified Channel
     */
    async assignFacetsToChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.UpdateFacet,
            generated_types_1.Permission.UpdateCatalog,
        ]);
        if (!hasPermission) {
            throw new common_2.ForbiddenError();
        }
        const facetsToAssign = await this.connection
            .getRepository(ctx, facet_entity_1.Facet)
            .find({ where: { id: (0, typeorm_1.In)(input.facetIds) }, relations: ['values'] });
        const valuesToAssign = facetsToAssign.reduce((values, facet) => [...values, ...facet.values], []);
        await Promise.all([
            ...facetsToAssign.map(async (facet) => {
                return this.channelService.assignToChannels(ctx, facet_entity_1.Facet, facet.id, [input.channelId]);
            }),
            ...valuesToAssign.map(async (value) => this.channelService.assignToChannels(ctx, facet_value_entity_1.FacetValue, value.id, [input.channelId])),
        ]);
        return this.connection
            .findByIdsInChannel(ctx, facet_entity_1.Facet, facetsToAssign.map(f => f.id), ctx.channelId, {})
            .then(facets => facets.map(facet => (0, translate_entity_1.translateDeep)(facet, ctx.languageCode)));
    }
    /**
     * @description
     * Remove Facets from the specified Channel
     */
    async removeFacetsFromChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.DeleteFacet,
            generated_types_1.Permission.DeleteCatalog,
        ]);
        if (!hasPermission) {
            throw new common_2.ForbiddenError();
        }
        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        if ((0, utils_1.idsAreEqual)(input.channelId, defaultChannel.id)) {
            throw new common_2.UserInputError('error.items-cannot-be-removed-from-default-channel');
        }
        const facetsToRemove = await this.connection
            .getRepository(ctx, facet_entity_1.Facet)
            .find({ where: { id: (0, typeorm_1.In)(input.facetIds) }, relations: ['values'] });
        const results = [];
        for (const facet of facetsToRemove) {
            let productCount = 0;
            let variantCount = 0;
            if (facet.values.length) {
                const counts = await this.facetValueService.checkFacetValueUsage(ctx, facet.values.map(fv => fv.id), input.channelId);
                productCount = counts.productCount;
                variantCount = counts.variantCount;
                const isInUse = !!(productCount || variantCount);
                const both = !!(productCount && variantCount) ? 'both' : 'single';
                const i18nVars = { products: productCount, variants: variantCount, both };
                let result;
                if (!isInUse || input.force) {
                    await this.channelService.removeFromChannels(ctx, facet_entity_1.Facet, facet.id, [input.channelId]);
                    await Promise.all(facet.values.map(fv => this.channelService.removeFromChannels(ctx, facet_value_entity_1.FacetValue, fv.id, [input.channelId])));
                    result = await this.findOne(ctx, facet.id);
                    if (result) {
                        results.push(result);
                    }
                }
                else {
                    results.push(new common_2.FacetInUseError({ facetCode: facet.code, productCount, variantCount }));
                }
            }
        }
        return results;
    }
};
exports.FacetService = FacetService;
exports.FacetService = FacetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        facet_value_service_1.FacetValueService,
        translatable_saver_1.TranslatableSaver,
        list_query_builder_1.ListQueryBuilder,
        config_service_1.ConfigService,
        channel_service_1.ChannelService,
        custom_field_relation_service_1.CustomFieldRelationService,
        event_bus_1.EventBus,
        translator_service_1.TranslatorService,
        role_service_1.RoleService])
], FacetService);
//# sourceMappingURL=facet.service.js.map