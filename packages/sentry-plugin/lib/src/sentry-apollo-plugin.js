"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryApolloPlugin = void 0;
const node_1 = require("@sentry/node");
const constants_1 = require("./constants");
/**
 * Based on https://github.com/ntegral/nestjs-sentry/issues/97#issuecomment-1252446807
 */
class SentryApolloPlugin {
    constructor(options) {
        this.options = options;
    }
    async requestDidStart({ request, contextValue, }) {
        const { enableTracing } = this.options;
        const transaction = contextValue.req[constants_1.SENTRY_TRANSACTION_KEY];
        if (request.operationName) {
            if (enableTracing) {
                // set the transaction Name if we have named queries
                transaction === null || transaction === void 0 ? void 0 : transaction.setName(request.operationName);
            }
            (0, node_1.setContext)('Graphql Request', {
                operation_name: request.operationName,
                variables: request.variables,
            });
        }
        return {
            // hook for transaction finished
            async willSendResponse(context) {
                transaction === null || transaction === void 0 ? void 0 : transaction.finish();
            },
            async executionDidStart() {
                return {
                    // hook for each new resolver
                    willResolveField({ info }) {
                        if (enableTracing) {
                            const span = transaction === null || transaction === void 0 ? void 0 : transaction.startChild({
                                op: 'resolver',
                                description: `${info.parentType.name}.${info.fieldName}`,
                            });
                            return () => {
                                span === null || span === void 0 ? void 0 : span.finish();
                            };
                        }
                    },
                };
            },
        };
    }
}
exports.SentryApolloPlugin = SentryApolloPlugin;
//# sourceMappingURL=sentry-apollo-plugin.js.map