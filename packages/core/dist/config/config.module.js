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
exports.ConfigModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const injector_1 = require("../common/injector");
const config_helpers_1 = require("./config-helpers");
const config_service_1 = require("./config.service");
let ConfigModule = class ConfigModule {
    constructor(configService, moduleRef) {
        this.configService = configService;
        this.moduleRef = moduleRef;
    }
    async onApplicationBootstrap() {
        await this.initInjectableStrategies();
        await this.initConfigurableOperations();
    }
    async onApplicationShutdown(signal) {
        await this.destroyInjectableStrategies();
        await this.destroyConfigurableOperations();
        /**
         * When the application shuts down, we reset the activeConfig to the default. Usually this is
         * redundant, as the app shutdown would normally coincide with the process ending. However, in some
         * circumstances, such as when running migrations immediately followed by app bootstrap, the activeConfig
         * will persist between these two applications and mutations e.g. to the CustomFields will result in
         * hard-to-debug errors. So resetting is a precaution against this scenario.
         */
        (0, config_helpers_1.resetConfig)();
    }
    async initInjectableStrategies() {
        const injector = new injector_1.Injector(this.moduleRef);
        for (const strategy of this.getInjectableStrategies()) {
            if (typeof strategy.init === 'function') {
                await strategy.init(injector);
            }
        }
    }
    async destroyInjectableStrategies() {
        for (const strategy of this.getInjectableStrategies()) {
            if (typeof strategy.destroy === 'function') {
                await strategy.destroy();
            }
        }
    }
    async initConfigurableOperations() {
        const injector = new injector_1.Injector(this.moduleRef);
        for (const operation of this.getConfigurableOperations()) {
            await operation.init(injector);
        }
    }
    async destroyConfigurableOperations() {
        for (const operation of this.getConfigurableOperations()) {
            await operation.destroy();
        }
    }
    getInjectableStrategies() {
        const { assetNamingStrategy, assetPreviewStrategy, assetStorageStrategy } = this.configService.assetOptions;
        const { productVariantPriceCalculationStrategy, productVariantPriceSelectionStrategy, productVariantPriceUpdateStrategy, stockDisplayStrategy, stockLocationStrategy, } = this.configService.catalogOptions;
        const { adminAuthenticationStrategy, shopAuthenticationStrategy, sessionCacheStrategy, passwordHashingStrategy, passwordValidationStrategy, } = this.configService.authOptions;
        const { taxZoneStrategy, taxLineCalculationStrategy } = this.configService.taxOptions;
        const { jobQueueStrategy, jobBufferStorageStrategy } = this.configService.jobQueueOptions;
        const { mergeStrategy, checkoutMergeStrategy, orderItemPriceCalculationStrategy, process: orderProcess, orderCodeStrategy, orderByCodeAccessStrategy, stockAllocationStrategy, activeOrderStrategy, changedPriceHandlingStrategy, orderSellerStrategy, guestCheckoutStrategy, } = this.configService.orderOptions;
        const { customFulfillmentProcess, process: fulfillmentProcess, shippingLineAssignmentStrategy, } = this.configService.shippingOptions;
        const { customPaymentProcess, process: paymentProcess } = this.configService.paymentOptions;
        const { entityIdStrategy: entityIdStrategyDeprecated } = this.configService;
        const { entityIdStrategy: entityIdStrategyCurrent } = this.configService.entityOptions;
        const { healthChecks, errorHandlers } = this.configService.systemOptions;
        const { assetImportStrategy } = this.configService.importExportOptions;
        const { refundProcess: refundProcess } = this.configService.paymentOptions;
        const entityIdStrategy = entityIdStrategyCurrent !== null && entityIdStrategyCurrent !== void 0 ? entityIdStrategyCurrent : entityIdStrategyDeprecated;
        return [
            ...adminAuthenticationStrategy,
            ...shopAuthenticationStrategy,
            sessionCacheStrategy,
            passwordHashingStrategy,
            passwordValidationStrategy,
            assetNamingStrategy,
            assetPreviewStrategy,
            assetStorageStrategy,
            taxZoneStrategy,
            taxLineCalculationStrategy,
            jobQueueStrategy,
            jobBufferStorageStrategy,
            mergeStrategy,
            checkoutMergeStrategy,
            orderCodeStrategy,
            orderByCodeAccessStrategy,
            entityIdStrategy,
            productVariantPriceCalculationStrategy,
            productVariantPriceUpdateStrategy,
            orderItemPriceCalculationStrategy,
            ...orderProcess,
            ...customFulfillmentProcess,
            ...fulfillmentProcess,
            ...customPaymentProcess,
            ...paymentProcess,
            stockAllocationStrategy,
            stockDisplayStrategy,
            ...healthChecks,
            ...errorHandlers,
            assetImportStrategy,
            changedPriceHandlingStrategy,
            ...(Array.isArray(activeOrderStrategy) ? activeOrderStrategy : [activeOrderStrategy]),
            orderSellerStrategy,
            shippingLineAssignmentStrategy,
            stockLocationStrategy,
            productVariantPriceSelectionStrategy,
            guestCheckoutStrategy,
            ...refundProcess,
        ];
    }
    getConfigurableOperations() {
        const { paymentMethodHandlers, paymentMethodEligibilityCheckers } = this.configService.paymentOptions;
        const { collectionFilters } = this.configService.catalogOptions;
        const { entityDuplicators } = this.configService.entityOptions;
        const { promotionActions, promotionConditions } = this.configService.promotionOptions;
        const { shippingCalculators, shippingEligibilityCheckers, fulfillmentHandlers } = this.configService.shippingOptions;
        return [
            ...(paymentMethodEligibilityCheckers || []),
            ...paymentMethodHandlers,
            ...collectionFilters,
            ...(promotionActions || []),
            ...(promotionConditions || []),
            ...(shippingCalculators || []),
            ...(shippingEligibilityCheckers || []),
            ...(fulfillmentHandlers || []),
            ...(entityDuplicators || []),
        ];
    }
};
exports.ConfigModule = ConfigModule;
exports.ConfigModule = ConfigModule = __decorate([
    (0, common_1.Module)({
        providers: [config_service_1.ConfigService],
        exports: [config_service_1.ConfigService],
    }),
    __metadata("design:paramtypes", [config_service_1.ConfigService,
        core_1.ModuleRef])
], ConfigModule);
//# sourceMappingURL=config.module.js.map