"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryErrorHandlerStrategy = void 0;
const graphql_1 = require("@nestjs/graphql");
const node_1 = require("@sentry/node");
const core_1 = require("@vendure/core");
const sentry_service_1 = require("./sentry.service");
class SentryErrorHandlerStrategy {
    init(injector) {
        this.sentryService = injector.get(sentry_service_1.SentryService);
    }
    handleServerError(exception, { host }) {
        // We only care about errors which have at least a Warn log level
        const shouldLogError = exception instanceof core_1.I18nError ? exception.logLevel <= core_1.LogLevel.Warn : true;
        if (shouldLogError) {
            if ((host === null || host === void 0 ? void 0 : host.getType()) === 'graphql') {
                const gqlContext = graphql_1.GqlExecutionContext.create(host);
                const info = gqlContext.getInfo();
                (0, node_1.setContext)('GraphQL Error Context', {
                    fieldName: info.fieldName,
                    path: info.path,
                });
            }
            const variables = exception.variables;
            if (variables) {
                (0, node_1.setContext)('GraphQL Error Variables', variables);
            }
            this.sentryService.captureException(exception);
        }
    }
    handleWorkerError(exception, { job }) {
        (0, node_1.setContext)('Worker Context', {
            queueName: job.queueName,
            jobId: job.id,
        });
        this.sentryService.captureException(exception);
    }
}
exports.SentryErrorHandlerStrategy = SentryErrorHandlerStrategy;
//# sourceMappingURL=sentry-error-handler-strategy.js.map