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
exports.PaymentMethodService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const errors_1 = require("../../common/error/errors");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const payment_method_translation_entity_1 = require("../../entity/payment-method/payment-method-translation.entity");
const payment_method_entity_1 = require("../../entity/payment-method/payment-method.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const payment_method_event_1 = require("../../event-bus/events/payment-method-event");
const config_arg_service_1 = require("../helpers/config-arg/config-arg.service");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const channel_service_1 = require("./channel.service");
const role_service_1 = require("./role.service");
/**
 * @description
 * Contains methods relating to {@link PaymentMethod} entities.
 *
 * @docsCategory services
 */
let PaymentMethodService = class PaymentMethodService {
    constructor(connection, configService, roleService, listQueryBuilder, eventBus, configArgService, channelService, customFieldRelationService, translatableSaver, translator) {
        this.connection = connection;
        this.configService = configService;
        this.roleService = roleService;
        this.listQueryBuilder = listQueryBuilder;
        this.eventBus = eventBus;
        this.configArgService = configArgService;
        this.channelService = channelService;
        this.customFieldRelationService = customFieldRelationService;
        this.translatableSaver = translatableSaver;
        this.translator = translator;
    }
    findAll(ctx, options, relations = []) {
        return this.listQueryBuilder
            .build(payment_method_entity_1.PaymentMethod, options, { ctx, relations, channelId: ctx.channelId })
            .getManyAndCount()
            .then(([methods, totalItems]) => {
            const items = methods.map(m => this.translator.translate(m, ctx));
            return {
                items,
                totalItems,
            };
        });
    }
    findOne(ctx, paymentMethodId, relations = []) {
        return this.connection
            .findOneInChannel(ctx, payment_method_entity_1.PaymentMethod, paymentMethodId, ctx.channelId, {
            relations,
        })
            .then(paymentMethod => {
            if (paymentMethod) {
                return this.translator.translate(paymentMethod, ctx);
            }
        });
    }
    async create(ctx, input) {
        const savedPaymentMethod = await this.translatableSaver.create({
            ctx,
            input,
            entityType: payment_method_entity_1.PaymentMethod,
            translationType: payment_method_translation_entity_1.PaymentMethodTranslation,
            beforeSave: async (pm) => {
                pm.handler = this.configArgService.parseInput('PaymentMethodHandler', input.handler);
                if (input.checker) {
                    pm.checker = this.configArgService.parseInput('PaymentMethodEligibilityChecker', input.checker);
                }
                await this.channelService.assignToCurrentChannel(pm, ctx);
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, payment_method_entity_1.PaymentMethod, input, savedPaymentMethod);
        await this.eventBus.publish(new payment_method_event_1.PaymentMethodEvent(ctx, savedPaymentMethod, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, savedPaymentMethod.id));
    }
    async update(ctx, input) {
        const updatedPaymentMethod = await this.translatableSaver.update({
            ctx,
            input,
            entityType: payment_method_entity_1.PaymentMethod,
            translationType: payment_method_translation_entity_1.PaymentMethodTranslation,
            beforeSave: async (pm) => {
                if (input.checker) {
                    pm.checker = this.configArgService.parseInput('PaymentMethodEligibilityChecker', input.checker);
                }
                if (input.checker === null) {
                    pm.checker = null;
                }
                if (input.handler) {
                    pm.handler = this.configArgService.parseInput('PaymentMethodHandler', input.handler);
                }
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, payment_method_entity_1.PaymentMethod, input, updatedPaymentMethod);
        await this.eventBus.publish(new payment_method_event_1.PaymentMethodEvent(ctx, updatedPaymentMethod, 'updated', input));
        await this.connection.getRepository(ctx, payment_method_entity_1.PaymentMethod).save(updatedPaymentMethod, { reload: false });
        return (0, utils_1.assertFound)(this.findOne(ctx, updatedPaymentMethod.id));
    }
    async delete(ctx, paymentMethodId, force = false) {
        const paymentMethod = await this.connection.getEntityOrThrow(ctx, payment_method_entity_1.PaymentMethod, paymentMethodId, {
            relations: ['channels'],
            channelId: ctx.channelId,
        });
        if (ctx.channel.code === shared_constants_1.DEFAULT_CHANNEL_CODE) {
            const nonDefaultChannels = paymentMethod.channels.filter(channel => channel.code !== shared_constants_1.DEFAULT_CHANNEL_CODE);
            if (0 < nonDefaultChannels.length && !force) {
                const message = ctx.translate('message.payment-method-used-in-channels', {
                    channelCodes: nonDefaultChannels.map(c => c.code).join(', '),
                });
                const result = generated_types_1.DeletionResult.NOT_DELETED;
                return { result, message };
            }
            try {
                const deletedPaymentMethod = new payment_method_entity_1.PaymentMethod(paymentMethod);
                await this.connection.getRepository(ctx, payment_method_entity_1.PaymentMethod).remove(paymentMethod);
                await this.eventBus.publish(new payment_method_event_1.PaymentMethodEvent(ctx, deletedPaymentMethod, 'deleted', paymentMethodId));
                return {
                    result: generated_types_1.DeletionResult.DELETED,
                };
            }
            catch (e) {
                return {
                    result: generated_types_1.DeletionResult.NOT_DELETED,
                    message: e.message || String(e),
                };
            }
        }
        else {
            // If not deleting from the default channel, we will not actually delete,
            // but will remove from the current channel
            paymentMethod.channels = paymentMethod.channels.filter(c => !(0, utils_1.idsAreEqual)(c.id, ctx.channelId));
            await this.connection.getRepository(ctx, payment_method_entity_1.PaymentMethod).save(paymentMethod);
            await this.eventBus.publish(new payment_method_event_1.PaymentMethodEvent(ctx, paymentMethod, 'deleted', paymentMethodId));
            return {
                result: generated_types_1.DeletionResult.DELETED,
            };
        }
    }
    async assignPaymentMethodsToChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.UpdatePaymentMethod,
            generated_types_1.Permission.UpdateSettings,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        for (const paymentMethodId of input.paymentMethodIds) {
            const paymentMethod = await this.connection.findOneInChannel(ctx, payment_method_entity_1.PaymentMethod, paymentMethodId, ctx.channelId);
            await this.channelService.assignToChannels(ctx, payment_method_entity_1.PaymentMethod, paymentMethodId, [
                input.channelId,
            ]);
        }
        return this.connection
            .findByIdsInChannel(ctx, payment_method_entity_1.PaymentMethod, input.paymentMethodIds, ctx.channelId, {})
            .then(methods => methods.map(method => this.translator.translate(method, ctx)));
    }
    async removePaymentMethodsFromChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.DeletePaymentMethod,
            generated_types_1.Permission.DeleteSettings,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        if ((0, utils_1.idsAreEqual)(input.channelId, defaultChannel.id)) {
            throw new errors_1.UserInputError('error.items-cannot-be-removed-from-default-channel');
        }
        for (const paymentMethodId of input.paymentMethodIds) {
            const paymentMethod = await this.connection.getEntityOrThrow(ctx, payment_method_entity_1.PaymentMethod, paymentMethodId);
            await this.channelService.removeFromChannels(ctx, payment_method_entity_1.PaymentMethod, paymentMethodId, [
                input.channelId,
            ]);
        }
        return this.connection
            .findByIdsInChannel(ctx, payment_method_entity_1.PaymentMethod, input.paymentMethodIds, ctx.channelId, {})
            .then(methods => methods.map(method => this.translator.translate(method, ctx)));
    }
    getPaymentMethodEligibilityCheckers(ctx) {
        return this.configArgService
            .getDefinitions('PaymentMethodEligibilityChecker')
            .map(x => x.toGraphQlType(ctx));
    }
    getPaymentMethodHandlers(ctx) {
        return this.configArgService.getDefinitions('PaymentMethodHandler').map(x => x.toGraphQlType(ctx));
    }
    async getEligiblePaymentMethods(ctx, order) {
        const paymentMethods = await this.connection
            .getRepository(ctx, payment_method_entity_1.PaymentMethod)
            .find({ where: { enabled: true }, relations: ['channels'] });
        const results = [];
        const paymentMethodsInChannel = paymentMethods
            .filter(p => p.channels.find(pc => (0, utils_1.idsAreEqual)(pc.id, ctx.channelId)))
            .map(p => this.translator.translate(p, ctx));
        for (const method of paymentMethodsInChannel) {
            let isEligible = true;
            let eligibilityMessage;
            if (method.checker) {
                const checker = this.configArgService.getByCode('PaymentMethodEligibilityChecker', method.checker.code);
                const eligible = await checker.check(ctx, order, method.checker.args, method);
                if (eligible === false || typeof eligible === 'string') {
                    isEligible = false;
                    eligibilityMessage = typeof eligible === 'string' ? eligible : undefined;
                }
            }
            results.push({
                id: method.id,
                code: method.code,
                name: method.name,
                description: method.description,
                isEligible,
                eligibilityMessage,
                customFields: method.customFields,
            });
        }
        return results;
    }
    async getMethodAndOperations(ctx, method) {
        const paymentMethod = await this.connection
            .getRepository(ctx, payment_method_entity_1.PaymentMethod)
            .createQueryBuilder('method')
            .leftJoin('method.channels', 'channel')
            .where('method.code = :code', { code: method })
            .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
            .getOne();
        if (!paymentMethod) {
            throw new errors_1.UserInputError('error.payment-method-not-found', { method });
        }
        const handler = this.configArgService.getByCode('PaymentMethodHandler', paymentMethod.handler.code);
        const checker = paymentMethod.checker &&
            this.configArgService.getByCode('PaymentMethodEligibilityChecker', paymentMethod.checker.code);
        return { paymentMethod, handler, checker };
    }
};
exports.PaymentMethodService = PaymentMethodService;
exports.PaymentMethodService = PaymentMethodService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_service_1.ConfigService,
        role_service_1.RoleService,
        list_query_builder_1.ListQueryBuilder,
        event_bus_1.EventBus,
        config_arg_service_1.ConfigArgService,
        channel_service_1.ChannelService,
        custom_field_relation_service_1.CustomFieldRelationService,
        translatable_saver_1.TranslatableSaver,
        translator_service_1.TranslatorService])
], PaymentMethodService);
//# sourceMappingURL=payment-method.service.js.map