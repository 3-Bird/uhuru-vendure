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
exports.ShippingMethodService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const omit_1 = require("@vendure/common/lib/omit");
const typeorm_1 = require("typeorm");
const errors_1 = require("../../common/error/errors");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const vendure_logger_1 = require("../../config/logger/vendure-logger");
const transactional_connection_1 = require("../../connection/transactional-connection");
const shipping_method_translation_entity_1 = require("../../entity/shipping-method/shipping-method-translation.entity");
const shipping_method_entity_1 = require("../../entity/shipping-method/shipping-method.entity");
const event_bus_1 = require("../../event-bus");
const shipping_method_event_1 = require("../../event-bus/events/shipping-method-event");
const config_arg_service_1 = require("../helpers/config-arg/config-arg.service");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const channel_service_1 = require("./channel.service");
const role_service_1 = require("./role.service");
/**
 * @description
 * Contains methods relating to {@link ShippingMethod} entities.
 *
 * @docsCategory services
 */
let ShippingMethodService = class ShippingMethodService {
    constructor(connection, configService, roleService, listQueryBuilder, channelService, configArgService, translatableSaver, customFieldRelationService, eventBus, translator) {
        this.connection = connection;
        this.configService = configService;
        this.roleService = roleService;
        this.listQueryBuilder = listQueryBuilder;
        this.channelService = channelService;
        this.configArgService = configArgService;
        this.translatableSaver = translatableSaver;
        this.customFieldRelationService = customFieldRelationService;
        this.eventBus = eventBus;
        this.translator = translator;
    }
    /** @internal */
    async initShippingMethods() {
        if (this.configService.shippingOptions.fulfillmentHandlers.length === 0) {
            throw new Error('No FulfillmentHandlers were found.' +
                ' Please ensure the VendureConfig.shippingOptions.fulfillmentHandlers array contains at least one FulfillmentHandler.');
        }
        await this.verifyShippingMethods();
    }
    findAll(ctx, options, relations = []) {
        return this.listQueryBuilder
            .build(shipping_method_entity_1.ShippingMethod, options, {
            relations,
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            channelId: ctx.channelId,
            ctx,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items: items.map(i => this.translator.translate(i, ctx)),
            totalItems,
        }));
    }
    async findOne(ctx, shippingMethodId, includeDeleted = false, relations = []) {
        var _a;
        const shippingMethod = await this.connection.findOneInChannel(ctx, shipping_method_entity_1.ShippingMethod, shippingMethodId, ctx.channelId, Object.assign({ relations }, (includeDeleted === false ? { where: { deletedAt: (0, typeorm_1.IsNull)() } } : {})));
        return (_a = (shippingMethod && this.translator.translate(shippingMethod, ctx))) !== null && _a !== void 0 ? _a : undefined;
    }
    async create(ctx, input) {
        const shippingMethod = await this.translatableSaver.create({
            ctx,
            input,
            entityType: shipping_method_entity_1.ShippingMethod,
            translationType: shipping_method_translation_entity_1.ShippingMethodTranslation,
            beforeSave: method => {
                method.fulfillmentHandlerCode = this.ensureValidFulfillmentHandlerCode(method.code, input.fulfillmentHandler);
                method.checker = this.configArgService.parseInput('ShippingEligibilityChecker', input.checker);
                method.calculator = this.configArgService.parseInput('ShippingCalculator', input.calculator);
            },
        });
        await this.channelService.assignToCurrentChannel(shippingMethod, ctx);
        const newShippingMethod = await this.connection
            .getRepository(ctx, shipping_method_entity_1.ShippingMethod)
            .save(shippingMethod);
        const shippingMethodWithRelations = await this.customFieldRelationService.updateRelations(ctx, shipping_method_entity_1.ShippingMethod, input, newShippingMethod);
        await this.eventBus.publish(new shipping_method_event_1.ShippingMethodEvent(ctx, shippingMethodWithRelations, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, newShippingMethod.id));
    }
    async update(ctx, input) {
        const shippingMethod = await this.findOne(ctx, input.id);
        if (!shippingMethod) {
            throw new errors_1.EntityNotFoundError('ShippingMethod', input.id);
        }
        const updatedShippingMethod = await this.translatableSaver.update({
            ctx,
            input: (0, omit_1.omit)(input, ['checker', 'calculator']),
            entityType: shipping_method_entity_1.ShippingMethod,
            translationType: shipping_method_translation_entity_1.ShippingMethodTranslation,
        });
        if (input.checker) {
            updatedShippingMethod.checker = this.configArgService.parseInput('ShippingEligibilityChecker', input.checker);
        }
        if (input.calculator) {
            updatedShippingMethod.calculator = this.configArgService.parseInput('ShippingCalculator', input.calculator);
        }
        if (input.fulfillmentHandler) {
            updatedShippingMethod.fulfillmentHandlerCode = this.ensureValidFulfillmentHandlerCode(updatedShippingMethod.code, input.fulfillmentHandler);
        }
        await this.customFieldRelationService.updateRelations(ctx, shipping_method_entity_1.ShippingMethod, input, updatedShippingMethod);
        await this.connection
            .getRepository(ctx, shipping_method_entity_1.ShippingMethod)
            .save(updatedShippingMethod, { reload: false });
        await this.eventBus.publish(new shipping_method_event_1.ShippingMethodEvent(ctx, shippingMethod, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, shippingMethod.id));
    }
    async softDelete(ctx, id) {
        const shippingMethod = await this.connection.getEntityOrThrow(ctx, shipping_method_entity_1.ShippingMethod, id, {
            channelId: ctx.channelId,
            where: { deletedAt: (0, typeorm_1.IsNull)() },
        });
        shippingMethod.deletedAt = new Date();
        await this.connection.getRepository(ctx, shipping_method_entity_1.ShippingMethod).save(shippingMethod, { reload: false });
        await this.eventBus.publish(new shipping_method_event_1.ShippingMethodEvent(ctx, shippingMethod, 'deleted', id));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    async assignShippingMethodsToChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.UpdateShippingMethod,
            generated_types_1.Permission.UpdateSettings,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        for (const shippingMethodId of input.shippingMethodIds) {
            const shippingMethod = await this.connection.findOneInChannel(ctx, shipping_method_entity_1.ShippingMethod, shippingMethodId, ctx.channelId);
            await this.channelService.assignToChannels(ctx, shipping_method_entity_1.ShippingMethod, shippingMethodId, [
                input.channelId,
            ]);
        }
        return this.connection
            .findByIdsInChannel(ctx, shipping_method_entity_1.ShippingMethod, input.shippingMethodIds, ctx.channelId, {})
            .then(methods => methods.map(method => this.translator.translate(method, ctx)));
    }
    async removeShippingMethodsFromChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.DeleteShippingMethod,
            generated_types_1.Permission.DeleteSettings,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        if ((0, utils_1.idsAreEqual)(input.channelId, defaultChannel.id)) {
            throw new errors_1.UserInputError('error.items-cannot-be-removed-from-default-channel');
        }
        for (const shippingMethodId of input.shippingMethodIds) {
            const shippingMethod = await this.connection.getEntityOrThrow(ctx, shipping_method_entity_1.ShippingMethod, shippingMethodId);
            await this.channelService.removeFromChannels(ctx, shipping_method_entity_1.ShippingMethod, shippingMethodId, [
                input.channelId,
            ]);
        }
        return this.connection
            .findByIdsInChannel(ctx, shipping_method_entity_1.ShippingMethod, input.shippingMethodIds, ctx.channelId, {})
            .then(methods => methods.map(method => this.translator.translate(method, ctx)));
    }
    getShippingEligibilityCheckers(ctx) {
        return this.configArgService
            .getDefinitions('ShippingEligibilityChecker')
            .map(x => x.toGraphQlType(ctx));
    }
    getShippingCalculators(ctx) {
        return this.configArgService.getDefinitions('ShippingCalculator').map(x => x.toGraphQlType(ctx));
    }
    getFulfillmentHandlers(ctx) {
        return this.configArgService.getDefinitions('FulfillmentHandler').map(x => x.toGraphQlType(ctx));
    }
    async getActiveShippingMethods(ctx) {
        const shippingMethods = await this.connection.getRepository(ctx, shipping_method_entity_1.ShippingMethod).find({
            relations: ['channels'],
            where: { deletedAt: (0, typeorm_1.IsNull)() },
        });
        return shippingMethods
            .filter(sm => sm.channels.find(c => (0, utils_1.idsAreEqual)(c.id, ctx.channelId)))
            .map(m => this.translator.translate(m, ctx));
    }
    /**
     * Ensures that all ShippingMethods have a valid fulfillmentHandlerCode
     */
    async verifyShippingMethods() {
        const activeShippingMethods = await this.connection.rawConnection.getRepository(shipping_method_entity_1.ShippingMethod).find({
            where: { deletedAt: (0, typeorm_1.IsNull)() },
        });
        for (const method of activeShippingMethods) {
            const handlerCode = method.fulfillmentHandlerCode;
            const verifiedHandlerCode = this.ensureValidFulfillmentHandlerCode(method.code, handlerCode);
            if (handlerCode !== verifiedHandlerCode) {
                method.fulfillmentHandlerCode = verifiedHandlerCode;
                await this.connection.rawConnection.getRepository(shipping_method_entity_1.ShippingMethod).save(method);
            }
        }
    }
    ensureValidFulfillmentHandlerCode(shippingMethodCode, fulfillmentHandlerCode) {
        const { fulfillmentHandlers } = this.configService.shippingOptions;
        let handler = fulfillmentHandlers.find(h => h.code === fulfillmentHandlerCode);
        if (!handler) {
            handler = fulfillmentHandlers[0];
            vendure_logger_1.Logger.error(`The ShippingMethod "${shippingMethodCode}" references an invalid FulfillmentHandler.\n` +
                `The FulfillmentHandler with code "${fulfillmentHandlerCode}" was not found. Using "${handler.code}" instead.`);
        }
        return handler.code;
    }
};
exports.ShippingMethodService = ShippingMethodService;
exports.ShippingMethodService = ShippingMethodService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_service_1.ConfigService,
        role_service_1.RoleService,
        list_query_builder_1.ListQueryBuilder,
        channel_service_1.ChannelService,
        config_arg_service_1.ConfigArgService,
        translatable_saver_1.TranslatableSaver,
        custom_field_relation_service_1.CustomFieldRelationService,
        event_bus_1.EventBus,
        translator_service_1.TranslatorService])
], ShippingMethodService);
//# sourceMappingURL=shipping-method.service.js.map