"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryPlugin = void 0;
const core_1 = require("@vendure/core");
const admin_test_resolver_1 = require("./api/admin-test.resolver");
const api_extensions_1 = require("./api/api-extensions");
const error_test_service_1 = require("./api/error-test.service");
const constants_1 = require("./constants");
const sentry_apollo_plugin_1 = require("./sentry-apollo-plugin");
const sentry_context_middleware_1 = require("./sentry-context.middleware");
const sentry_error_handler_strategy_1 = require("./sentry-error-handler-strategy");
const sentry_service_1 = require("./sentry.service");
const SentryOptionsProvider = {
    provide: constants_1.SENTRY_PLUGIN_OPTIONS,
    useFactory: () => SentryPlugin.options,
};
/**
 * @description
 * This plugin integrates the [Sentry](https://sentry.io) error tracking & performance monitoring
 * service with your Vendure server. In addition to capturing errors, it also provides built-in
 * support for [tracing](https://docs.sentry.io/product/sentry-basics/concepts/tracing/) as well as
 * enriching your Sentry events with additional context about the request.
 *
 * ## Pre-requisites
 *
 * This plugin depends on access to Sentry, which can be self-hosted or used as a cloud service.
 *
 * If using the hosted SaaS option, you must have a Sentry account and a project set up ([sign up here](https://sentry.io/signup/)). When setting up your project,
 * select the "Node.js" platform and no framework.
 *
 * Once set up, you will be given a [Data Source Name (DSN)](https://docs.sentry.io/product/sentry-basics/concepts/dsn-explainer/)
 * which you will need to provide to the plugin.
 *
 * ## Installation
 *
 * Install this plugin as well as the `@sentry/node` package:
 *
 * ```sh
 * npm install --save \@vendure/sentry-plugin \@sentry/node
 * ```
 *
 * ## Configuration
 *
 * Before using the plugin, you must configure it with the DSN provided by Sentry:
 *
 * ```ts
 * import { VendureConfig } from '\@vendure/core';
 * import { SentryPlugin } from '\@vendure/sentry-plugin';
 *
 * export const config: VendureConfig = {
 *     // ...
 *     plugins: [
 *         // ...
 *         // highlight-start
 *         SentryPlugin.init({
 *             dsn: process.env.SENTRY_DSN,
 *             // Optional configuration
 *             includeErrorTestMutation: true,
 *             enableTracing: true,
 *             // you can also pass in any of the options from \@sentry/node
 *             // for instance:
 *             tracesSampleRate: 1.0,
 *         }),
 *         // highlight-end
 *     ],
 * };
 *```
 *
 * ## Tracing
 *
 * This plugin includes built-in support for [tracing](https://docs.sentry.io/product/sentry-basics/concepts/tracing/), which allows you to see the performance of your
 * GraphQL resolvers in the Sentry dashboard. To enable tracing, set the `enableTracing` option to `true` as shown above.
 *
 * ## Instrumenting your own code
 *
 * You may want to add your own custom spans to your code. To do so, you can use the `Sentry` object
 * just as you would in any Node application. For example:
 *
 * ```ts
 * import * as Sentry from "\@sentry/node";
 *
 * export class MyService {
 *     async myMethod() {
 *          Sentry.setContext('My Custom Context,{
 *              key: 'value',
 *          });
 *     }
 * }
 * ```
 *
 * ## Error test mutation
 *
 * To test whether your Sentry configuration is working correctly, you can set the `includeErrorTestMutation` option to `true`. This will add a mutation to the Admin API
 * which will throw an error of the type specified in the `errorType` argument. For example:
 *
 * ```graphql
 * mutation CreateTestError {
 *     createTestError(errorType: DATABASE_ERROR)
 * }
 * ```
 *
 * You should then be able to see the error in your Sentry dashboard (it may take a couple of minutes to appear).
 *
 * @docsCategory core plugins/SentryPlugin
 */
let SentryPlugin = class SentryPlugin {
    configure(consumer) {
        consumer.apply(sentry_context_middleware_1.SentryContextMiddleware).forRoutes('*');
    }
    static init(options) {
        this.options = options;
        return this;
    }
};
exports.SentryPlugin = SentryPlugin;
SentryPlugin.options = {};
exports.SentryPlugin = SentryPlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        providers: [SentryOptionsProvider, sentry_service_1.SentryService, error_test_service_1.ErrorTestService],
        configuration: config => {
            config.apiOptions.apolloServerPlugins.push(new sentry_apollo_plugin_1.SentryApolloPlugin({
                enableTracing: !!SentryPlugin.options.enableTracing,
            }));
            config.systemOptions.errorHandlers.push(new sentry_error_handler_strategy_1.SentryErrorHandlerStrategy());
            return config;
        },
        adminApiExtensions: {
            schema: () => (SentryPlugin.options.includeErrorTestMutation ? api_extensions_1.testApiExtensions : undefined),
            resolvers: () => (SentryPlugin.options.includeErrorTestMutation ? [admin_test_resolver_1.SentryAdminTestResolver] : []),
        },
        exports: [sentry_service_1.SentryService],
        compatibility: '^3.0.0',
    })
], SentryPlugin);
//# sourceMappingURL=sentry-plugin.js.map