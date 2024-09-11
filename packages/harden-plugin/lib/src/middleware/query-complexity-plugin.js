"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultVendureComplexityEstimator = exports.QueryComplexityPlugin = void 0;
const core_1 = require("@vendure/core");
const graphql_1 = require("graphql");
const graphql_query_complexity_1 = require("graphql-query-complexity");
const constants_1 = require("../constants");
/**
 * @description
 * Implements query complexity analysis on Shop API requests.
 */
class QueryComplexityPlugin {
    constructor(options) {
        this.options = options;
    }
    async requestDidStart({ schema }) {
        var _a;
        const maxQueryComplexity = (_a = this.options.maxQueryComplexity) !== null && _a !== void 0 ? _a : 1000;
        return {
            didResolveOperation: async ({ request, document }) => {
                var _a, _b, _c, _d, _e, _f;
                if (isAdminApi(schema)) {
                    // We don't want to apply the cost analysis on the
                    // Admin API, since any expensive operations would require
                    // an authenticated session.
                    return;
                }
                const query = request.operationName
                    ? (0, graphql_1.separateOperations)(document)[request.operationName]
                    : document;
                if (this.options.logComplexityScore === true) {
                    core_1.Logger.debug(`Calculating complexity of "${(_a = request.operationName) !== null && _a !== void 0 ? _a : 'anonymous'}"`, constants_1.loggerCtx);
                }
                const complexity = (0, graphql_query_complexity_1.getComplexity)({
                    schema,
                    query,
                    variables: request.variables,
                    estimators: (_b = this.options.queryComplexityEstimators) !== null && _b !== void 0 ? _b : [
                        defaultVendureComplexityEstimator((_c = this.options.customComplexityFactors) !== null && _c !== void 0 ? _c : {}, (_d = this.options.logComplexityScore) !== null && _d !== void 0 ? _d : false),
                        (0, graphql_query_complexity_1.simpleEstimator)({ defaultComplexity: 1 }),
                    ],
                });
                if (this.options.logComplexityScore === true) {
                    core_1.Logger.verbose(`Query complexity "${(_e = request.operationName) !== null && _e !== void 0 ? _e : 'anonymous'}": ${complexity}`, constants_1.loggerCtx);
                }
                if (complexity >= maxQueryComplexity) {
                    core_1.Logger.error(`Query complexity of "${(_f = request.operationName) !== null && _f !== void 0 ? _f : 'anonymous'}" is ${complexity}, which exceeds the maximum of ${maxQueryComplexity}`, constants_1.loggerCtx);
                    throw new core_1.InternalServerError('Query is too complex');
                }
            },
        };
    }
}
exports.QueryComplexityPlugin = QueryComplexityPlugin;
function isAdminApi(schema) {
    const queryType = schema.getQueryType();
    if (queryType) {
        return !!queryType.getFields().administrators;
    }
    return false;
}
/**
 * @description
 * A complexity estimator which takes into account List and PaginatedList types and can
 * be further configured by providing a customComplexityFactors object.
 *
 * When selecting PaginatedList types, the "take" argument is used to estimate a complexity
 * factor. If the "take" argument is omitted, a default factor of 1000 is applied.
 *
 * @docsCategory core plugins/HardenPlugin
 */
function defaultVendureComplexityEstimator(customComplexityFactors, logFieldScores) {
    return (options) => {
        var _a, _b;
        const { type, args, childComplexity, field } = options;
        const namedType = (0, graphql_1.getNamedType)(field.type);
        const path = `${type.name}.${field.name}`;
        let result = childComplexity + 1;
        const customFactor = customComplexityFactors[path];
        if (customFactor != null) {
            result = Math.max(childComplexity, 1) * customFactor;
        }
        else {
            if ((0, graphql_1.isObjectType)(namedType)) {
                const isPaginatedList = !!namedType.getInterfaces().find(i => i.name === 'PaginatedList');
                if (isPaginatedList) {
                    const take = (_b = (_a = args.options) === null || _a === void 0 ? void 0 : _a.take) !== null && _b !== void 0 ? _b : 1000;
                    result = childComplexity + Math.round(Math.log(childComplexity) * take);
                }
            }
            if ((0, graphql_1.isListType)((0, graphql_1.getNullableType)(field.type))) {
                result = childComplexity * 5;
            }
        }
        if (logFieldScores) {
            core_1.Logger.debug(`${path}: ${field.type.toString()}\tchildComplexity: ${childComplexity}, score: ${result}`, constants_1.loggerCtx);
        }
        return result;
    };
}
exports.defaultVendureComplexityEstimator = defaultVendureComplexityEstimator;
//# sourceMappingURL=query-complexity-plugin.js.map