"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestServer = void 0;
const core_1 = require("@nestjs/core");
const core_2 = require("@vendure/core");
const bootstrap_1 = require("@vendure/core/dist/bootstrap");
const populate_for_testing_1 = require("./data-population/populate-for-testing");
const initializers_1 = require("./initializers/initializers");
/* eslint-disable no-console */
/**
 * @description
 * A real Vendure server against which the e2e tests should be run.
 *
 * @docsCategory testing
 */
class TestServer {
    constructor(vendureConfig) {
        this.vendureConfig = vendureConfig;
    }
    /**
     * @description
     * Bootstraps an instance of Vendure server and populates the database according to the options
     * passed in. Should be called in the `beforeAll` function.
     *
     * The populated data is saved into an .sqlite file for each test file. On subsequent runs, this file
     * is loaded so that the populate step can be skipped, which speeds up the tests significantly.
     */
    async init(options) {
        const { type } = this.vendureConfig.dbConnectionOptions;
        const { dbConnectionOptions } = this.vendureConfig;
        const testFilename = this.getCallerFilename(1);
        const initializer = (0, initializers_1.getInitializerFor)(type);
        try {
            await initializer.init(testFilename, dbConnectionOptions);
            const populateFn = () => this.populateInitialData(this.vendureConfig, options);
            await initializer.populate(populateFn);
            await initializer.destroy();
        }
        catch (e) {
            throw e;
        }
        await this.bootstrap();
    }
    /**
     * @description
     * Bootstraps a Vendure server instance. Generally the `.init()` method should be used, as that will also
     * populate the test data. However, the `bootstrap()` method is sometimes useful in tests which need to
     * start and stop a Vendure instance multiple times without re-populating data.
     */
    async bootstrap() {
        this.app = await this.bootstrapForTesting(this.vendureConfig);
    }
    /**
     * @description
     * Destroy the Vendure server instance and clean up all resources.
     * Should be called after all tests have run, e.g. in an `afterAll` function.
     */
    async destroy() {
        var _a;
        // allow a grace period of any outstanding async tasks to complete
        await new Promise(resolve => global.setTimeout(resolve, 500));
        await ((_a = this.app) === null || _a === void 0 ? void 0 : _a.close());
    }
    getCallerFilename(depth) {
        let stack;
        let file;
        let frame;
        const pst = Error.prepareStackTrace;
        Error.prepareStackTrace = (_, _stack) => {
            Error.prepareStackTrace = pst;
            return _stack;
        };
        stack = new Error().stack;
        stack = stack.slice(depth + 1);
        do {
            frame = stack.shift();
            file = frame && frame.getFileName();
        } while (stack.length && file === 'module.js');
        return file;
    }
    /**
     * Populates an .sqlite database file based on the PopulateOptions.
     */
    async populateInitialData(testingConfig, options) {
        const app = await (0, populate_for_testing_1.populateForTesting)(testingConfig, this.bootstrapForTesting, Object.assign({ logging: false }, options));
        await app.close();
    }
    /**
     * Bootstraps an instance of the Vendure server for testing against.
     */
    async bootstrapForTesting(userConfig) {
        const config = await (0, bootstrap_1.preBootstrapConfig)(userConfig);
        core_2.Logger.useLogger(config.logger);
        const appModule = await import('@vendure/core/dist/app.module.js');
        try {
            core_2.DefaultLogger.hideNestBoostrapLogs();
            const app = await core_1.NestFactory.create(appModule.AppModule, {
                cors: config.apiOptions.cors,
                logger: new core_2.Logger(),
                abortOnError: false,
            });
            const { tokenMethod } = config.authOptions;
            const usingCookie = tokenMethod === 'cookie' || (Array.isArray(tokenMethod) && tokenMethod.includes('cookie'));
            if (usingCookie) {
                (0, bootstrap_1.configureSessionCookies)(app, config);
            }
            const earlyMiddlewares = config.apiOptions.middleware.filter(mid => mid.beforeListen);
            earlyMiddlewares.forEach(mid => {
                app.use(mid.route, mid.handler);
            });
            await app.listen(config.apiOptions.port);
            await app.get(core_2.JobQueueService).start();
            core_2.DefaultLogger.restoreOriginalLogLevel();
            return app;
        }
        catch (e) {
            console.log(e);
            throw e;
        }
    }
}
exports.TestServer = TestServer;
//# sourceMappingURL=test-server.js.map