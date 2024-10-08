"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const crypto_1 = require("crypto");
const typeorm_health_check_strategy_1 = require("../health-check/typeorm-health-check-strategy");
const in_memory_job_queue_strategy_1 = require("../job-queue/in-memory-job-queue-strategy");
const in_memory_job_buffer_storage_strategy_1 = require("../job-queue/job-buffer/in-memory-job-buffer-storage-strategy");
const default_asset_import_strategy_1 = require("./asset-import-strategy/default-asset-import-strategy");
const default_asset_naming_strategy_1 = require("./asset-naming-strategy/default-asset-naming-strategy");
const no_asset_preview_strategy_1 = require("./asset-preview-strategy/no-asset-preview-strategy");
const no_asset_storage_strategy_1 = require("./asset-storage-strategy/no-asset-storage-strategy");
const bcrypt_password_hashing_strategy_1 = require("./auth/bcrypt-password-hashing-strategy");
const default_password_validation_strategy_1 = require("./auth/default-password-validation-strategy");
const native_authentication_strategy_1 = require("./auth/native-authentication-strategy");
const default_collection_filters_1 = require("./catalog/default-collection-filters");
const default_product_variant_price_calculation_strategy_1 = require("./catalog/default-product-variant-price-calculation-strategy");
const default_product_variant_price_selection_strategy_1 = require("./catalog/default-product-variant-price-selection-strategy");
const default_product_variant_price_update_strategy_1 = require("./catalog/default-product-variant-price-update-strategy");
const default_stock_display_strategy_1 = require("./catalog/default-stock-display-strategy");
const default_stock_location_strategy_1 = require("./catalog/default-stock-location-strategy");
const auto_increment_id_strategy_1 = require("./entity/auto-increment-id-strategy");
const default_money_strategy_1 = require("./entity/default-money-strategy");
const index_1 = require("./entity/entity-duplicators/index");
const default_fulfillment_process_1 = require("./fulfillment/default-fulfillment-process");
const manual_fulfillment_handler_1 = require("./fulfillment/manual-fulfillment-handler");
const default_logger_1 = require("./logger/default-logger");
const default_active_order_strategy_1 = require("./order/default-active-order-strategy");
const default_changed_price_handling_strategy_1 = require("./order/default-changed-price-handling-strategy");
const default_guest_checkout_strategy_1 = require("./order/default-guest-checkout-strategy");
const default_order_item_price_calculation_strategy_1 = require("./order/default-order-item-price-calculation-strategy");
const default_order_placed_strategy_1 = require("./order/default-order-placed-strategy");
const default_order_process_1 = require("./order/default-order-process");
const default_order_seller_strategy_1 = require("./order/default-order-seller-strategy");
const default_stock_allocation_strategy_1 = require("./order/default-stock-allocation-strategy");
const merge_orders_strategy_1 = require("./order/merge-orders-strategy");
const order_by_code_access_strategy_1 = require("./order/order-by-code-access-strategy");
const order_code_strategy_1 = require("./order/order-code-strategy");
const use_guest_strategy_1 = require("./order/use-guest-strategy");
const default_payment_process_1 = require("./payment/default-payment-process");
const promotion_1 = require("./promotion");
const default_refund_process_1 = require("./refund/default-refund-process");
const in_memory_session_cache_strategy_1 = require("./session-cache/in-memory-session-cache-strategy");
const default_shipping_calculator_1 = require("./shipping-method/default-shipping-calculator");
const default_shipping_eligibility_checker_1 = require("./shipping-method/default-shipping-eligibility-checker");
const default_shipping_line_assignment_strategy_1 = require("./shipping-method/default-shipping-line-assignment-strategy");
const default_tax_line_calculation_strategy_1 = require("./tax/default-tax-line-calculation-strategy");
const default_tax_zone_strategy_1 = require("./tax/default-tax-zone-strategy");
/**
 * @description
 * The default configuration settings which are used if not explicitly overridden in the bootstrap() call.
 *
 * @docsCategory configuration
 */
exports.defaultConfig = {
    defaultChannelToken: null,
    defaultLanguageCode: generated_types_1.LanguageCode.en,
    logger: new default_logger_1.DefaultLogger(),
    apiOptions: {
        hostname: '',
        port: 3000,
        adminApiPath: 'admin-api',
        adminApiPlayground: false,
        adminApiDebug: false,
        adminListQueryLimit: 1000,
        adminApiValidationRules: [],
        shopApiPath: 'shop-api',
        shopApiPlayground: false,
        shopApiDebug: false,
        shopListQueryLimit: 100,
        shopApiValidationRules: [],
        channelTokenKey: shared_constants_1.DEFAULT_CHANNEL_TOKEN_KEY,
        cors: {
            origin: true,
            credentials: true,
        },
        middleware: [],
        introspection: true,
        apolloServerPlugins: [],
    },
    entityIdStrategy: new auto_increment_id_strategy_1.AutoIncrementIdStrategy(),
    authOptions: {
        disableAuth: false,
        tokenMethod: 'cookie',
        cookieOptions: {
            secret: (0, crypto_1.randomBytes)(16).toString('base64url'),
            httpOnly: true,
            sameSite: 'lax',
        },
        authTokenHeaderKey: shared_constants_1.DEFAULT_AUTH_TOKEN_HEADER_KEY,
        sessionDuration: '1y',
        sessionCacheStrategy: new in_memory_session_cache_strategy_1.InMemorySessionCacheStrategy(),
        sessionCacheTTL: 300,
        requireVerification: true,
        verificationTokenDuration: '7d',
        superadminCredentials: {
            identifier: shared_constants_1.SUPER_ADMIN_USER_IDENTIFIER,
            password: shared_constants_1.SUPER_ADMIN_USER_PASSWORD,
        },
        shopAuthenticationStrategy: [new native_authentication_strategy_1.NativeAuthenticationStrategy()],
        adminAuthenticationStrategy: [new native_authentication_strategy_1.NativeAuthenticationStrategy()],
        customPermissions: [],
        passwordHashingStrategy: new bcrypt_password_hashing_strategy_1.BcryptPasswordHashingStrategy(),
        passwordValidationStrategy: new default_password_validation_strategy_1.DefaultPasswordValidationStrategy({ minLength: 4 }),
    },
    catalogOptions: {
        collectionFilters: default_collection_filters_1.defaultCollectionFilters,
        productVariantPriceSelectionStrategy: new default_product_variant_price_selection_strategy_1.DefaultProductVariantPriceSelectionStrategy(),
        productVariantPriceCalculationStrategy: new default_product_variant_price_calculation_strategy_1.DefaultProductVariantPriceCalculationStrategy(),
        productVariantPriceUpdateStrategy: new default_product_variant_price_update_strategy_1.DefaultProductVariantPriceUpdateStrategy({
            syncPricesAcrossChannels: false,
        }),
        stockDisplayStrategy: new default_stock_display_strategy_1.DefaultStockDisplayStrategy(),
        stockLocationStrategy: new default_stock_location_strategy_1.DefaultStockLocationStrategy(),
    },
    assetOptions: {
        assetNamingStrategy: new default_asset_naming_strategy_1.DefaultAssetNamingStrategy(),
        assetStorageStrategy: new no_asset_storage_strategy_1.NoAssetStorageStrategy(),
        assetPreviewStrategy: new no_asset_preview_strategy_1.NoAssetPreviewStrategy(),
        permittedFileTypes: ['image/*', 'video/*', 'audio/*', '.pdf'],
        uploadMaxFileSize: 20971520,
    },
    dbConnectionOptions: {
        timezone: 'Z',
        type: 'mysql',
    },
    entityOptions: {
        entityIdStrategy: new auto_increment_id_strategy_1.AutoIncrementIdStrategy(),
        moneyStrategy: new default_money_strategy_1.DefaultMoneyStrategy(),
        entityDuplicators: index_1.defaultEntityDuplicators,
        channelCacheTtl: 30000,
        zoneCacheTtl: 30000,
        taxRateCacheTtl: 30000,
        metadataModifiers: [],
    },
    promotionOptions: {
        promotionConditions: promotion_1.defaultPromotionConditions,
        promotionActions: promotion_1.defaultPromotionActions,
    },
    shippingOptions: {
        shippingEligibilityCheckers: [default_shipping_eligibility_checker_1.defaultShippingEligibilityChecker],
        shippingCalculators: [default_shipping_calculator_1.defaultShippingCalculator],
        shippingLineAssignmentStrategy: new default_shipping_line_assignment_strategy_1.DefaultShippingLineAssignmentStrategy(),
        customFulfillmentProcess: [],
        process: [default_fulfillment_process_1.defaultFulfillmentProcess],
        fulfillmentHandlers: [manual_fulfillment_handler_1.manualFulfillmentHandler],
    },
    orderOptions: {
        orderItemsLimit: 999,
        orderLineItemsLimit: 999,
        orderItemPriceCalculationStrategy: new default_order_item_price_calculation_strategy_1.DefaultOrderItemPriceCalculationStrategy(),
        mergeStrategy: new merge_orders_strategy_1.MergeOrdersStrategy(),
        checkoutMergeStrategy: new use_guest_strategy_1.UseGuestStrategy(),
        process: [default_order_process_1.defaultOrderProcess],
        stockAllocationStrategy: new default_stock_allocation_strategy_1.DefaultStockAllocationStrategy(),
        orderCodeStrategy: new order_code_strategy_1.DefaultOrderCodeStrategy(),
        orderByCodeAccessStrategy: new order_by_code_access_strategy_1.DefaultOrderByCodeAccessStrategy('2h'),
        changedPriceHandlingStrategy: new default_changed_price_handling_strategy_1.DefaultChangedPriceHandlingStrategy(),
        orderPlacedStrategy: new default_order_placed_strategy_1.DefaultOrderPlacedStrategy(),
        activeOrderStrategy: new default_active_order_strategy_1.DefaultActiveOrderStrategy(),
        orderSellerStrategy: new default_order_seller_strategy_1.DefaultOrderSellerStrategy(),
        guestCheckoutStrategy: new default_guest_checkout_strategy_1.DefaultGuestCheckoutStrategy(),
    },
    paymentOptions: {
        paymentMethodEligibilityCheckers: [],
        paymentMethodHandlers: [],
        customPaymentProcess: [],
        process: [default_payment_process_1.defaultPaymentProcess],
        refundProcess: [default_refund_process_1.defaultRefundProcess],
    },
    taxOptions: {
        taxZoneStrategy: new default_tax_zone_strategy_1.DefaultTaxZoneStrategy(),
        taxLineCalculationStrategy: new default_tax_line_calculation_strategy_1.DefaultTaxLineCalculationStrategy(),
    },
    importExportOptions: {
        importAssetsDir: __dirname,
        assetImportStrategy: new default_asset_import_strategy_1.DefaultAssetImportStrategy(),
    },
    jobQueueOptions: {
        jobQueueStrategy: new in_memory_job_queue_strategy_1.InMemoryJobQueueStrategy(),
        jobBufferStorageStrategy: new in_memory_job_buffer_storage_strategy_1.InMemoryJobBufferStorageStrategy(),
        activeQueues: [],
        prefix: '',
    },
    customFields: {
        Address: [],
        Administrator: [],
        Asset: [],
        Channel: [],
        Collection: [],
        Customer: [],
        CustomerGroup: [],
        Facet: [],
        FacetValue: [],
        Fulfillment: [],
        GlobalSettings: [],
        Order: [],
        OrderLine: [],
        PaymentMethod: [],
        Product: [],
        ProductOption: [],
        ProductOptionGroup: [],
        ProductVariant: [],
        ProductVariantPrice: [],
        Promotion: [],
        Region: [],
        Seller: [],
        ShippingMethod: [],
        StockLocation: [],
        TaxCategory: [],
        TaxRate: [],
        User: [],
        Zone: [],
    },
    plugins: [],
    systemOptions: {
        healthChecks: [new typeorm_health_check_strategy_1.TypeORMHealthCheckStrategy()],
        errorHandlers: [],
    },
};
//# sourceMappingURL=default-config.js.map