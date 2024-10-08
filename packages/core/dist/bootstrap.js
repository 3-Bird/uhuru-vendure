"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSessionCookies = exports.getAllEntities = exports.preBootstrapConfig = exports.bootstrapWorker = exports.bootstrap = void 0;
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const cookieSession = require("cookie-session");
const semver_1 = require("semver");
const errors_1 = require("./common/error/errors");
const config_helpers_1 = require("./config/config-helpers");
const default_logger_1 = require("./config/logger/default-logger");
const vendure_logger_1 = require("./config/logger/vendure-logger");
const administrator_entity_1 = require("./entity/administrator/administrator.entity");
const entities_1 = require("./entity/entities");
const register_custom_entity_fields_1 = require("./entity/register-custom-entity-fields");
const run_entity_metadata_modifiers_1 = require("./entity/run-entity-metadata-modifiers");
const set_entity_id_strategy_1 = require("./entity/set-entity-id-strategy");
const set_money_strategy_1 = require("./entity/set-money-strategy");
const validate_custom_fields_config_1 = require("./entity/validate-custom-fields-config");
const plugin_metadata_1 = require("./plugin/plugin-metadata");
const plugin_utils_1 = require("./plugin/plugin-utils");
const process_context_1 = require("./process-context/process-context");
const version_1 = require("./version");
const vendure_worker_1 = require("./worker/vendure-worker");
/**
 * @description
 * Bootstraps the Vendure server. This is the entry point to the application.
 *
 * @example
 * ```ts
 * import { bootstrap } from '\@vendure/core';
 * import { config } from './vendure-config';
 *
 * bootstrap(config).catch(err => {
 *   console.log(err);
 *   process.exit(1);
 * });
 * ```
 *
 * ### Passing additional options
 *
 * Since v2.2.0, you can pass additional options to the NestJs application via the `options` parameter.
 * For example, to integrate with the [Nest Devtools](https://docs.nestjs.com/devtools/overview), you need to
 * pass the `snapshot` option:
 *
 * ```ts
 * import { bootstrap } from '\@vendure/core';
 * import { config } from './vendure-config';
 *
 * bootstrap(config, {
 *   // highlight-start
 *   nestApplicationOptions: {
 *     snapshot: true,
 *   }
 *   // highlight-end
 * }).catch(err => {
 *   console.log(err);
 *   process.exit(1);
 * });
 * ```
 * @docsCategory common
 * @docsPage bootstrap
 * @docsWeight 0
 * */
async function bootstrap(userConfig, options) {
    const config = await preBootstrapConfig(userConfig);
    vendure_logger_1.Logger.useLogger(config.logger);
    vendure_logger_1.Logger.info(`Bootstrapping Vendure Server (pid: ${process.pid})...`);
    checkPluginCompatibility(config);
    // The AppModule *must* be loaded only after the entities have been set in the
    // config, so that they are available when the AppModule decorator is evaluated.
    // eslint-disable-next-line
    const appModule = await import('./app.module.js');
    (0, process_context_1.setProcessContext)('server');
    const { hostname, port, cors, middleware } = config.apiOptions;
    default_logger_1.DefaultLogger.hideNestBoostrapLogs();
    const app = await core_1.NestFactory.create(appModule.AppModule, Object.assign({ cors, logger: new vendure_logger_1.Logger() }, options === null || options === void 0 ? void 0 : options.nestApplicationOptions));
    default_logger_1.DefaultLogger.restoreOriginalLogLevel();
    app.useLogger(new vendure_logger_1.Logger());
    const { tokenMethod } = config.authOptions;
    const usingCookie = tokenMethod === 'cookie' || (Array.isArray(tokenMethod) && tokenMethod.includes('cookie'));
    if (usingCookie) {
        configureSessionCookies(app, config);
    }
    const earlyMiddlewares = middleware.filter(mid => mid.beforeListen);
    earlyMiddlewares.forEach(mid => {
        app.use(mid.route, mid.handler);
    });
    await app.listen(port, hostname || '');
    app.enableShutdownHooks();
    logWelcomeMessage(config);
    return app;
}
exports.bootstrap = bootstrap;
/**
 * @description
 * Bootstraps a Vendure worker. Resolves to a {@link VendureWorker} object containing a reference to the underlying
 * NestJs [standalone application](https://docs.nestjs.com/standalone-applications) as well as convenience
 * methods for starting the job queue and health check server.
 *
 * Read more about the [Vendure Worker](/guides/developer-guide/worker-job-queue/).
 *
 * @example
 * ```ts
 * import { bootstrapWorker } from '\@vendure/core';
 * import { config } from './vendure-config';
 *
 * bootstrapWorker(config)
 *   .then(worker => worker.startJobQueue())
 *   .then(worker => worker.startHealthCheckServer({ port: 3020 }))
 *   .catch(err => {
 *     console.log(err);
 *     process.exit(1);
 *   });
 * ```
 * @docsCategory worker
 * @docsPage bootstrapWorker
 * @docsWeight 0
 * */
async function bootstrapWorker(userConfig, options) {
    var _a, _b;
    const vendureConfig = await preBootstrapConfig(userConfig);
    const config = disableSynchronize(vendureConfig);
    (_b = (_a = config.logger).setDefaultContext) === null || _b === void 0 ? void 0 : _b.call(_a, 'Vendure Worker');
    vendure_logger_1.Logger.useLogger(config.logger);
    vendure_logger_1.Logger.info(`Bootstrapping Vendure Worker (pid: ${process.pid})...`);
    checkPluginCompatibility(config);
    (0, process_context_1.setProcessContext)('worker');
    default_logger_1.DefaultLogger.hideNestBoostrapLogs();
    const WorkerModule = await import('./worker/worker.module.js').then(m => m.WorkerModule);
    const workerApp = await core_1.NestFactory.createApplicationContext(WorkerModule, Object.assign({ logger: new vendure_logger_1.Logger() }, options === null || options === void 0 ? void 0 : options.nestApplicationContextOptions));
    default_logger_1.DefaultLogger.restoreOriginalLogLevel();
    workerApp.useLogger(new vendure_logger_1.Logger());
    workerApp.enableShutdownHooks();
    await validateDbTablesForWorker(workerApp);
    vendure_logger_1.Logger.info('Vendure Worker is ready');
    return new vendure_worker_1.VendureWorker(workerApp);
}
exports.bootstrapWorker = bootstrapWorker;
/**
 * Setting the global config must be done prior to loading the AppModule.
 */
async function preBootstrapConfig(userConfig) {
    var _a, _b, _c;
    if (userConfig) {
        await (0, config_helpers_1.setConfig)(userConfig);
    }
    const entities = getAllEntities(userConfig);
    const { coreSubscribersMap } = await import('./entity/subscribers.js');
    await (0, config_helpers_1.setConfig)({
        dbConnectionOptions: {
            entities,
            subscribers: [
                ...((_b = (_a = userConfig.dbConnectionOptions) === null || _a === void 0 ? void 0 : _a.subscribers) !== null && _b !== void 0 ? _b : []),
                ...Object.values(coreSubscribersMap),
            ],
        },
    });
    let config = (0, config_helpers_1.getConfig)();
    // The logger is set here so that we are able to log any messages prior to the final
    // logger (which may depend on config coming from a plugin) being set.
    vendure_logger_1.Logger.useLogger(config.logger);
    config = await runPluginConfigurations(config);
    const entityIdStrategy = (_c = config.entityOptions.entityIdStrategy) !== null && _c !== void 0 ? _c : config.entityIdStrategy;
    (0, set_entity_id_strategy_1.setEntityIdStrategy)(entityIdStrategy, entities);
    const moneyStrategy = config.entityOptions.moneyStrategy;
    (0, set_money_strategy_1.setMoneyStrategy)(moneyStrategy, entities);
    const customFieldValidationResult = (0, validate_custom_fields_config_1.validateCustomFieldsConfig)(config.customFields, entities);
    if (!customFieldValidationResult.valid) {
        process.exitCode = 1;
        throw new Error('CustomFields config error:\n- ' + customFieldValidationResult.errors.join('\n- '));
    }
    (0, register_custom_entity_fields_1.registerCustomEntityFields)(config);
    await (0, run_entity_metadata_modifiers_1.runEntityMetadataModifiers)(config);
    setExposedHeaders(config);
    return config;
}
exports.preBootstrapConfig = preBootstrapConfig;
function checkPluginCompatibility(config) {
    for (const plugin of config.plugins) {
        const compatibility = (0, plugin_metadata_1.getCompatibility)(plugin);
        const pluginName = plugin.name;
        if (!compatibility) {
            vendure_logger_1.Logger.info(`The plugin "${pluginName}" does not specify a compatibility range, so it is not guaranteed to be compatible with this version of Vendure.`);
        }
        else {
            if (!(0, semver_1.satisfies)(version_1.VENDURE_VERSION, compatibility, { loose: true, includePrerelease: true })) {
                vendure_logger_1.Logger.error(`Plugin "${pluginName}" is not compatible with this version of Vendure. ` +
                    `It specifies a semver range of "${compatibility}" but the current version is "${version_1.VENDURE_VERSION}".`);
                throw new errors_1.InternalServerError(`Plugin "${pluginName}" is not compatible with this version of Vendure.`);
            }
        }
    }
}
/**
 * Initialize any configured plugins.
 */
async function runPluginConfigurations(config) {
    for (const plugin of config.plugins) {
        const configFn = (0, plugin_metadata_1.getConfigurationFunction)(plugin);
        if (typeof configFn === 'function') {
            const result = await configFn(config);
            Object.assign(config, result);
        }
    }
    return config;
}
/**
 * Returns an array of core entities and any additional entities defined in plugins.
 */
function getAllEntities(userConfig) {
    const coreEntities = Object.values(entities_1.coreEntitiesMap);
    const pluginEntities = (0, plugin_metadata_1.getEntitiesFromPlugins)(userConfig.plugins);
    const allEntities = coreEntities;
    // Check to ensure that no plugins are defining entities with names
    // which conflict with existing entities.
    for (const pluginEntity of pluginEntities) {
        if (allEntities.find(e => e.name === pluginEntity.name)) {
            throw new errors_1.InternalServerError('error.entity-name-conflict', { entityName: pluginEntity.name });
        }
        else {
            allEntities.push(pluginEntity);
        }
    }
    return allEntities;
}
exports.getAllEntities = getAllEntities;
/**
 * If the 'bearer' tokenMethod is being used, then we automatically expose the authTokenHeaderKey header
 * in the CORS options, making sure to preserve any user-configured exposedHeaders.
 */
function setExposedHeaders(config) {
    const { tokenMethod } = config.authOptions;
    const isUsingBearerToken = tokenMethod === 'bearer' || (Array.isArray(tokenMethod) && tokenMethod.includes('bearer'));
    if (isUsingBearerToken) {
        const authTokenHeaderKey = config.authOptions.authTokenHeaderKey;
        const corsOptions = config.apiOptions.cors;
        if (typeof corsOptions !== 'boolean') {
            const { exposedHeaders } = corsOptions;
            let exposedHeadersWithAuthKey;
            if (!exposedHeaders) {
                exposedHeadersWithAuthKey = [authTokenHeaderKey];
            }
            else if (typeof exposedHeaders === 'string') {
                exposedHeadersWithAuthKey = exposedHeaders
                    .split(',')
                    .map(x => x.trim())
                    .concat(authTokenHeaderKey);
            }
            else {
                exposedHeadersWithAuthKey = exposedHeaders.concat(authTokenHeaderKey);
            }
            corsOptions.exposedHeaders = exposedHeadersWithAuthKey;
        }
    }
}
function logWelcomeMessage(config) {
    const { port, shopApiPath, adminApiPath, hostname } = config.apiOptions;
    const apiCliGreetings = [];
    const pathToUrl = (path) => `http://${hostname || 'localhost'}:${port}/${path}`;
    apiCliGreetings.push(['Shop API', pathToUrl(shopApiPath)]);
    apiCliGreetings.push(['Admin API', pathToUrl(adminApiPath)]);
    apiCliGreetings.push(...(0, plugin_utils_1.getPluginStartupMessages)().map(({ label, path }) => [label, pathToUrl(path)]));
    const columnarGreetings = arrangeCliGreetingsInColumns(apiCliGreetings);
    const title = `Vendure server (v${version_1.VENDURE_VERSION}) now running on port ${port}`;
    const maxLineLength = Math.max(title.length, ...columnarGreetings.map(l => l.length));
    const titlePadLength = title.length < maxLineLength ? Math.floor((maxLineLength - title.length) / 2) : 0;
    vendure_logger_1.Logger.info('='.repeat(maxLineLength));
    vendure_logger_1.Logger.info(title.padStart(title.length + titlePadLength));
    vendure_logger_1.Logger.info('-'.repeat(maxLineLength).padStart(titlePadLength));
    columnarGreetings.forEach(line => vendure_logger_1.Logger.info(line));
    vendure_logger_1.Logger.info('='.repeat(maxLineLength));
}
function arrangeCliGreetingsInColumns(lines) {
    const columnWidth = Math.max(...lines.map(l => l[0].length)) + 2;
    return lines.map(l => `${(l[0] + ':').padEnd(columnWidth)}${l[1]}`);
}
/**
 * Fix race condition when modifying DB
 * See: https://github.com/vendure-ecommerce/vendure/issues/152
 */
function disableSynchronize(userConfig) {
    const config = Object.assign(Object.assign({}, userConfig), { dbConnectionOptions: Object.assign(Object.assign({}, userConfig.dbConnectionOptions), { synchronize: false }) });
    return config;
}
/**
 * Check that the Database tables exist. When running Vendure server & worker
 * concurrently for the first time, the worker will attempt to access the
 * DB tables before the server has populated them (assuming synchronize = true
 * in config). This method will use polling to check the existence of a known table
 * before allowing the rest of the worker bootstrap to continue.
 * @param worker
 */
async function validateDbTablesForWorker(worker) {
    const connection = worker.get((0, typeorm_1.getConnectionToken)());
    await new Promise(async (resolve, reject) => {
        const checkForTables = async () => {
            try {
                const adminCount = await connection.getRepository(administrator_entity_1.Administrator).count();
                return 0 < adminCount;
            }
            catch (e) {
                return false;
            }
        };
        const pollIntervalMs = 5000;
        let attempts = 0;
        const maxAttempts = 10;
        let validTableStructure = false;
        vendure_logger_1.Logger.verbose('Checking for expected DB table structure...');
        while (!validTableStructure && attempts < maxAttempts) {
            attempts++;
            validTableStructure = await checkForTables();
            if (validTableStructure) {
                vendure_logger_1.Logger.verbose('Table structure verified');
                resolve();
                return;
            }
            vendure_logger_1.Logger.verbose(`Table structure could not be verified, trying again after ${pollIntervalMs}ms (attempt ${attempts} of ${maxAttempts})`);
            await new Promise(resolve1 => setTimeout(resolve1, pollIntervalMs));
        }
        reject('Could not validate DB table structure. Aborting bootstrap.');
    });
}
function configureSessionCookies(app, userConfig) {
    var _a;
    const { cookieOptions } = userConfig.authOptions;
    // Globally set the cookie session middleware
    const cookieName = typeof (cookieOptions === null || cookieOptions === void 0 ? void 0 : cookieOptions.name) !== 'string' ? (_a = cookieOptions.name) === null || _a === void 0 ? void 0 : _a.shop : cookieOptions.name;
    app.use(cookieSession(Object.assign(Object.assign({}, cookieOptions), { name: cookieName !== null && cookieName !== void 0 ? cookieName : shared_constants_1.DEFAULT_COOKIE_NAME })));
}
exports.configureSessionCookies = configureSessionCookies;
//# sourceMappingURL=bootstrap.js.map