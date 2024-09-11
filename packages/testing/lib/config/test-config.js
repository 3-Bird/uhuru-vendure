"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConfig = exports.E2E_DEFAULT_CHANNEL_TOKEN = void 0;
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const core_1 = require("@vendure/core");
const testing_asset_preview_strategy_1 = require("./testing-asset-preview-strategy");
const testing_asset_storage_strategy_1 = require("./testing-asset-storage-strategy");
const testing_entity_id_strategy_1 = require("./testing-entity-id-strategy");
exports.E2E_DEFAULT_CHANNEL_TOKEN = 'e2e-default-channel';
const logger = process.env.LOG ? new core_1.DefaultLogger() : new core_1.NoopLogger();
/**
 * @description
 * A {@link VendureConfig} object used for e2e tests. This configuration uses sqljs as the database
 * and configures some special settings which are optimized for e2e tests:
 *
 * * `entityIdStrategy: new TestingEntityIdStrategy()` This ID strategy uses auto-increment IDs but encodes all IDs
 * to be prepended with the string `'T_'`, so ID `1` becomes `'T_1'`.
 * * `logger: new NoopLogger()` Do no output logs by default
 * * `assetStorageStrategy: new TestingAssetStorageStrategy()` This strategy does not actually persist any binary data to disk.
 * * `assetPreviewStrategy: new TestingAssetPreviewStrategy()` This strategy is a no-op.
 *
 * ## Logging
 * By default, the testConfig does not output any log messages. This is most desirable to keep a clean CI output.
 * However, for debugging purposes, it can make it hard to figure out why tests fail.
 *
 * You can enable default logging behaviour with the environment variable `LOG`:
 *
 * ```
 * LOG=true yarn e2e
 * ```
 *
 * @docsCategory testing
 */
exports.testConfig = (0, core_1.mergeConfig)(core_1.defaultConfig, {
    apiOptions: {
        port: 3050,
        adminApiPath: shared_constants_1.ADMIN_API_PATH,
        shopApiPath: shared_constants_1.SHOP_API_PATH,
        cors: true,
    },
    defaultChannelToken: exports.E2E_DEFAULT_CHANNEL_TOKEN,
    authOptions: {
        tokenMethod: 'bearer',
        requireVerification: true,
        cookieOptions: {
            secret: 'some-secret',
        },
    },
    dbConnectionOptions: {
        type: 'sqljs',
        database: new Uint8Array([]),
        location: '',
        autoSave: false,
        logging: false,
    },
    promotionOptions: {},
    customFields: {},
    entityOptions: { entityIdStrategy: new testing_entity_id_strategy_1.TestingEntityIdStrategy() },
    paymentOptions: {
        paymentMethodHandlers: [],
    },
    logger,
    importExportOptions: {},
    assetOptions: {
        assetNamingStrategy: new core_1.DefaultAssetNamingStrategy(),
        assetStorageStrategy: new testing_asset_storage_strategy_1.TestingAssetStorageStrategy(),
        assetPreviewStrategy: new testing_asset_preview_strategy_1.TestingAssetPreviewStrategy(),
    },
});
//# sourceMappingURL=test-config.js.map