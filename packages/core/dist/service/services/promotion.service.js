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
exports.PromotionService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const unique_1 = require("@vendure/common/lib/unique");
const typeorm_1 = require("typeorm");
const errors_1 = require("../../common/error/errors");
const generated_graphql_admin_errors_1 = require("../../common/error/generated-graphql-admin-errors");
const generated_graphql_shop_errors_1 = require("../../common/error/generated-graphql-shop-errors");
const adjustment_source_1 = require("../../common/types/adjustment-source");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const order_entity_1 = require("../../entity/order/order.entity");
const promotion_translation_entity_1 = require("../../entity/promotion/promotion-translation.entity");
const promotion_entity_1 = require("../../entity/promotion/promotion.entity");
const event_bus_1 = require("../../event-bus");
const promotion_event_1 = require("../../event-bus/events/promotion-event");
const config_arg_service_1 = require("../helpers/config-arg/config-arg.service");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const channel_service_1 = require("./channel.service");
/**
 * @description
 * Contains methods relating to {@link Promotion} entities.
 *
 * @docsCategory services
 */
let PromotionService = class PromotionService {
    constructor(connection, configService, channelService, listQueryBuilder, configArgService, customFieldRelationService, eventBus, translatableSaver, translator) {
        this.connection = connection;
        this.configService = configService;
        this.channelService = channelService;
        this.listQueryBuilder = listQueryBuilder;
        this.configArgService = configArgService;
        this.customFieldRelationService = customFieldRelationService;
        this.eventBus = eventBus;
        this.translatableSaver = translatableSaver;
        this.translator = translator;
        this.availableConditions = [];
        this.availableActions = [];
        this.availableConditions = this.configService.promotionOptions.promotionConditions || [];
        this.availableActions = this.configService.promotionOptions.promotionActions || [];
    }
    findAll(ctx, options, relations = []) {
        return this.listQueryBuilder
            .build(promotion_entity_1.Promotion, options, {
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            channelId: ctx.channelId,
            relations,
            ctx,
        })
            .getManyAndCount()
            .then(([promotions, totalItems]) => {
            const items = promotions.map(promotion => this.translator.translate(promotion, ctx));
            return {
                items,
                totalItems,
            };
        });
    }
    async findOne(ctx, adjustmentSourceId, relations = []) {
        return this.connection
            .findOneInChannel(ctx, promotion_entity_1.Promotion, adjustmentSourceId, ctx.channelId, {
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            relations,
        })
            .then(promotion => { var _a; return (_a = (promotion && this.translator.translate(promotion, ctx))) !== null && _a !== void 0 ? _a : undefined; });
    }
    getPromotionConditions(ctx) {
        return this.availableConditions.map(x => x.toGraphQlType(ctx));
    }
    getPromotionActions(ctx) {
        return this.availableActions.map(x => x.toGraphQlType(ctx));
    }
    async createPromotion(ctx, input) {
        const conditions = input.conditions.map(c => this.configArgService.parseInput('PromotionCondition', c));
        const actions = input.actions.map(a => this.configArgService.parseInput('PromotionAction', a));
        this.validateRequiredConditions(conditions, actions);
        if (conditions.length === 0 && !input.couponCode) {
            return new generated_graphql_admin_errors_1.MissingConditionsError();
        }
        const newPromotion = await this.translatableSaver.create({
            ctx,
            input,
            entityType: promotion_entity_1.Promotion,
            translationType: promotion_translation_entity_1.PromotionTranslation,
            beforeSave: async (p) => {
                p.priorityScore = this.calculatePriorityScore(input);
                p.conditions = conditions;
                p.actions = actions;
                await this.channelService.assignToCurrentChannel(p, ctx);
            },
        });
        const promotionWithRelations = await this.customFieldRelationService.updateRelations(ctx, promotion_entity_1.Promotion, input, newPromotion);
        await this.eventBus.publish(new promotion_event_1.PromotionEvent(ctx, promotionWithRelations, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, newPromotion.id));
    }
    async updatePromotion(ctx, input) {
        const promotion = await this.connection.getEntityOrThrow(ctx, promotion_entity_1.Promotion, input.id, {
            channelId: ctx.channelId,
        });
        const hasConditions = input.conditions
            ? input.conditions.length > 0
            : promotion.conditions.length > 0;
        const hasCouponCode = input.couponCode != null ? !!input.couponCode : !!promotion.couponCode;
        if (!hasConditions && !hasCouponCode) {
            return new generated_graphql_admin_errors_1.MissingConditionsError();
        }
        const updatedPromotion = await this.translatableSaver.update({
            ctx,
            input,
            entityType: promotion_entity_1.Promotion,
            translationType: promotion_translation_entity_1.PromotionTranslation,
            beforeSave: async (p) => {
                p.priorityScore = this.calculatePriorityScore(input);
                if (input.conditions) {
                    p.conditions = input.conditions.map(c => this.configArgService.parseInput('PromotionCondition', c));
                }
                if (input.actions) {
                    p.actions = input.actions.map(a => this.configArgService.parseInput('PromotionAction', a));
                }
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, promotion_entity_1.Promotion, input, updatedPromotion);
        await this.eventBus.publish(new promotion_event_1.PromotionEvent(ctx, promotion, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, updatedPromotion.id));
    }
    async softDeletePromotion(ctx, promotionId) {
        const promotion = await this.connection.getEntityOrThrow(ctx, promotion_entity_1.Promotion, promotionId);
        await this.connection
            .getRepository(ctx, promotion_entity_1.Promotion)
            .update({ id: promotionId }, { deletedAt: new Date() });
        await this.eventBus.publish(new promotion_event_1.PromotionEvent(ctx, promotion, 'deleted', promotionId));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    async assignPromotionsToChannel(ctx, input) {
        const promotions = await this.connection.findByIdsInChannel(ctx, promotion_entity_1.Promotion, input.promotionIds, ctx.channelId, {});
        for (const promotion of promotions) {
            await this.channelService.assignToChannels(ctx, promotion_entity_1.Promotion, promotion.id, [input.channelId]);
        }
        return promotions.map(p => this.translator.translate(p, ctx));
    }
    async removePromotionsFromChannel(ctx, input) {
        const promotions = await this.connection.findByIdsInChannel(ctx, promotion_entity_1.Promotion, input.promotionIds, ctx.channelId, {});
        for (const promotion of promotions) {
            await this.channelService.removeFromChannels(ctx, promotion_entity_1.Promotion, promotion.id, [input.channelId]);
        }
        return promotions.map(p => this.translator.translate(p, ctx));
    }
    /**
     * @description
     * Checks the validity of a coupon code, by checking that it is associated with an existing,
     * enabled and non-expired Promotion. Additionally, if there is a usage limit on the coupon code,
     * this method will enforce that limit against the specified Customer.
     */
    async validateCouponCode(ctx, couponCode, customerId) {
        const promotion = await this.connection.getRepository(ctx, promotion_entity_1.Promotion).findOne({
            where: {
                couponCode,
                enabled: true,
                deletedAt: (0, typeorm_1.IsNull)(),
            },
            relations: ['channels'],
        });
        if (!promotion ||
            promotion.couponCode !== couponCode ||
            !promotion.channels.find(c => (0, utils_1.idsAreEqual)(c.id, ctx.channelId))) {
            return new generated_graphql_shop_errors_1.CouponCodeInvalidError({ couponCode });
        }
        if (promotion.endsAt && +promotion.endsAt < +new Date()) {
            return new generated_graphql_shop_errors_1.CouponCodeExpiredError({ couponCode });
        }
        if (customerId && promotion.perCustomerUsageLimit != null) {
            const usageCount = await this.countPromotionUsagesForCustomer(ctx, promotion.id, customerId);
            if (promotion.perCustomerUsageLimit <= usageCount) {
                return new generated_graphql_shop_errors_1.CouponCodeLimitError({ couponCode, limit: promotion.perCustomerUsageLimit });
            }
        }
        if (promotion.usageLimit !== null) {
            const usageCount = await this.countPromotionUsages(ctx, promotion.id);
            if (promotion.usageLimit <= usageCount) {
                return new generated_graphql_shop_errors_1.CouponCodeLimitError({ couponCode, limit: promotion.usageLimit });
            }
        }
        return promotion;
    }
    getActivePromotionsInChannel(ctx) {
        return this.connection
            .getRepository(ctx, promotion_entity_1.Promotion)
            .createQueryBuilder('promotion')
            .leftJoin('promotion.channels', 'channel')
            .leftJoinAndSelect('promotion.translations', 'translation')
            .where('channel.id = :channelId', { channelId: ctx.channelId })
            .andWhere('promotion.deletedAt IS NULL')
            .andWhere('promotion.enabled = :enabled', { enabled: true })
            .orderBy('promotion.priorityScore', 'ASC')
            .getMany()
            .then(promotions => promotions.map(p => this.translator.translate(p, ctx)));
    }
    async getActivePromotionsOnOrder(ctx, orderId) {
        var _a;
        const order = await this.connection
            .getRepository(ctx, order_entity_1.Order)
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.promotions', 'promotions')
            .where('order.id = :orderId', { orderId })
            .getOne();
        return (_a = order === null || order === void 0 ? void 0 : order.promotions) !== null && _a !== void 0 ? _a : [];
    }
    async runPromotionSideEffects(ctx, order, promotionsPre) {
        const promotionsPost = order.promotions;
        for (const activePre of promotionsPre) {
            if (!promotionsPost.find(p => (0, utils_1.idsAreEqual)(p.id, activePre.id))) {
                // activePre is no longer active, so call onDeactivate
                await activePre.deactivate(ctx, order);
            }
        }
        for (const activePost of promotionsPost) {
            if (!promotionsPre.find(p => (0, utils_1.idsAreEqual)(p.id, activePost.id))) {
                // activePost was not previously active, so call onActivate
                await activePost.activate(ctx, order);
            }
        }
    }
    /**
     * @description
     * Used internally to associate a Promotion with an Order, once an Order has been placed.
     *
     * @deprecated This method is no longer used and will be removed in v2.0
     */
    async addPromotionsToOrder(ctx, order) {
        const allPromotionIds = order.discounts.map(a => adjustment_source_1.AdjustmentSource.decodeSourceId(a.adjustmentSource).id);
        const promotionIds = (0, unique_1.unique)(allPromotionIds);
        const promotions = await this.connection
            .getRepository(ctx, promotion_entity_1.Promotion)
            .find({ where: { id: (0, typeorm_1.In)(promotionIds) } });
        order.promotions = promotions;
        return this.connection.getRepository(ctx, order_entity_1.Order).save(order);
    }
    async countPromotionUsagesForCustomer(ctx, promotionId, customerId) {
        const qb = this.connection
            .getRepository(ctx, order_entity_1.Order)
            .createQueryBuilder('order')
            .leftJoin('order.promotions', 'promotion')
            .where('promotion.id = :promotionId', { promotionId })
            .andWhere('order.customer = :customerId', { customerId })
            .andWhere('order.state != :state', { state: 'Cancelled' })
            .andWhere('order.active = :active', { active: false });
        return qb.getCount();
    }
    async countPromotionUsages(ctx, promotionId) {
        const qb = this.connection
            .getRepository(ctx, order_entity_1.Order)
            .createQueryBuilder('order')
            .leftJoin('order.promotions', 'promotion')
            .where('promotion.id = :promotionId', { promotionId })
            .andWhere('order.state != :state', { state: 'Cancelled' })
            .andWhere('order.active = :active', { active: false });
        return qb.getCount();
    }
    calculatePriorityScore(input) {
        const conditions = input.conditions
            ? input.conditions.map(c => this.configArgService.getByCode('PromotionCondition', c.code))
            : [];
        const actions = input.actions
            ? input.actions.map(c => this.configArgService.getByCode('PromotionAction', c.code))
            : [];
        return [...conditions, ...actions].reduce((score, op) => score + op.priorityValue, 0);
    }
    validateRequiredConditions(conditions, actions) {
        const conditionCodes = conditions.reduce((codeMap, { code }) => (Object.assign(Object.assign({}, codeMap), { [code]: code })), {});
        for (const { code: actionCode } of actions) {
            const actionDef = this.configArgService.getByCode('PromotionAction', actionCode);
            const actionDependencies = actionDef.conditions || [];
            if (!actionDependencies || actionDependencies.length === 0) {
                continue;
            }
            const missingConditions = actionDependencies.filter(condition => !conditionCodes[condition.code]);
            if (missingConditions.length) {
                throw new errors_1.UserInputError('error.conditions-required-for-action', {
                    action: actionCode,
                    conditions: missingConditions.map(c => c.code).join(', '),
                });
            }
        }
    }
};
exports.PromotionService = PromotionService;
exports.PromotionService = PromotionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_service_1.ConfigService,
        channel_service_1.ChannelService,
        list_query_builder_1.ListQueryBuilder,
        config_arg_service_1.ConfigArgService,
        custom_field_relation_service_1.CustomFieldRelationService,
        event_bus_1.EventBus,
        translatable_saver_1.TranslatableSaver,
        translator_service_1.TranslatorService])
], PromotionService);
//# sourceMappingURL=promotion.service.js.map