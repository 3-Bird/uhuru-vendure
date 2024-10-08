"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFilterParams = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const DateUtils_1 = require("typeorm/util/DateUtils");
const errors_1 = require("../../../common/error/errors");
const connection_utils_1 = require("./connection-utils");
const get_calculated_columns_1 = require("./get-calculated-columns");
function parseFilterParams(connection, entity, filterParams, customPropertyMap, entityAlias) {
    if (!filterParams) {
        return [];
    }
    const { columns, translationColumns, alias: defaultAlias } = (0, connection_utils_1.getColumnMetadata)(connection, entity);
    const alias = entityAlias !== null && entityAlias !== void 0 ? entityAlias : defaultAlias;
    const calculatedColumns = (0, get_calculated_columns_1.getCalculatedColumns)(entity);
    const dbType = connection.options.type;
    let argIndex = 1;
    function buildConditionsForField(key, operation) {
        const output = [];
        const calculatedColumnDef = calculatedColumns.find(c => c.name === key);
        const instruction = calculatedColumnDef === null || calculatedColumnDef === void 0 ? void 0 : calculatedColumnDef.listQuery;
        const calculatedColumnExpression = instruction === null || instruction === void 0 ? void 0 : instruction.expression;
        for (const [operator, operand] of Object.entries(operation)) {
            let fieldName;
            if (columns.find(c => c.propertyName === key)) {
                fieldName = `${alias}.${key}`;
            }
            else if (translationColumns.find(c => c.propertyName === key)) {
                const translationsAlias = [alias, 'translations'].join('__');
                fieldName = `${translationsAlias}.${key}`;
            }
            else if (calculatedColumnExpression) {
                fieldName = (0, connection_utils_1.escapeCalculatedColumnExpression)(connection, calculatedColumnExpression);
            }
            else if (customPropertyMap === null || customPropertyMap === void 0 ? void 0 : customPropertyMap[key]) {
                fieldName = customPropertyMap[key];
            }
            else {
                throw new errors_1.UserInputError('error.invalid-filter-field');
            }
            const condition = buildWhereCondition(fieldName, operator, operand, argIndex, dbType);
            output.push(condition);
            argIndex++;
        }
        return output;
    }
    function processFilterParameter(param) {
        const result = [];
        for (const [key, operation] of Object.entries(param)) {
            if (key === '_and' || key === '_or') {
                result.push({
                    operator: key === '_and' ? generated_types_1.LogicalOperator.AND : generated_types_1.LogicalOperator.OR,
                    conditions: operation.map(o => processFilterParameter(o)).flat(),
                });
            }
            else if (operation && !Array.isArray(operation)) {
                result.push(...buildConditionsForField(key, operation));
            }
        }
        return result;
    }
    const conditions = processFilterParameter(filterParams);
    return conditions;
}
exports.parseFilterParams = parseFilterParams;
function buildWhereCondition(fieldName, operator, operand, argIndex, dbType) {
    switch (operator) {
        case 'eq':
            return {
                clause: `${fieldName} = :arg${argIndex}`,
                parameters: { [`arg${argIndex}`]: convertDate(operand) },
            };
        case 'notEq':
            return {
                clause: `${fieldName} != :arg${argIndex}`,
                parameters: { [`arg${argIndex}`]: convertDate(operand) },
            };
        case 'inList':
        case 'contains': {
            const LIKE = dbType === 'postgres' ? 'ILIKE' : 'LIKE';
            return {
                clause: `${fieldName} ${LIKE} :arg${argIndex}`,
                parameters: {
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    [`arg${argIndex}`]: `%${typeof operand === 'string' ? operand.trim() : operand}%`,
                },
            };
        }
        case 'notContains': {
            const LIKE = dbType === 'postgres' ? 'ILIKE' : 'LIKE';
            return {
                clause: `${fieldName} NOT ${LIKE} :arg${argIndex}`,
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                parameters: { [`arg${argIndex}`]: `%${operand.trim()}%` },
            };
        }
        case 'in': {
            if (Array.isArray(operand) && operand.length) {
                return {
                    clause: `${fieldName} IN (:...arg${argIndex})`,
                    parameters: { [`arg${argIndex}`]: operand },
                };
            }
            else {
                // "in" with an empty set should always return nothing
                return {
                    clause: '1 = 0',
                    parameters: {},
                };
            }
        }
        case 'notIn': {
            if (Array.isArray(operand) && operand.length) {
                return {
                    clause: `${fieldName} NOT IN (:...arg${argIndex})`,
                    parameters: { [`arg${argIndex}`]: operand },
                };
            }
            else {
                // "notIn" with an empty set should always return all
                return {
                    clause: '1 = 1',
                    parameters: {},
                };
            }
        }
        case 'regex':
            return {
                clause: getRegexpClause(fieldName, argIndex, dbType),
                parameters: { [`arg${argIndex}`]: operand },
            };
        case 'lt':
        case 'before':
            return {
                clause: `${fieldName} < :arg${argIndex}`,
                parameters: { [`arg${argIndex}`]: convertDate(operand) },
            };
        case 'gt':
        case 'after':
            return {
                clause: `${fieldName} > :arg${argIndex}`,
                parameters: { [`arg${argIndex}`]: convertDate(operand) },
            };
        case 'lte':
            return {
                clause: `${fieldName} <= :arg${argIndex}`,
                parameters: { [`arg${argIndex}`]: operand },
            };
        case 'gte':
            return {
                clause: `${fieldName} >= :arg${argIndex}`,
                parameters: { [`arg${argIndex}`]: operand },
            };
        case 'between':
            return {
                clause: `${fieldName} BETWEEN :arg${argIndex}_a AND :arg${argIndex}_b`,
                parameters: {
                    [`arg${argIndex}_a`]: convertDate(operand.start),
                    [`arg${argIndex}_b`]: convertDate(operand.end),
                },
            };
        case 'isNull':
            return {
                clause: operand === true ? `${fieldName} IS NULL` : `${fieldName} IS NOT NULL`,
                parameters: {},
            };
        default:
            (0, shared_utils_1.assertNever)(operator);
    }
    return {
        clause: '1',
        parameters: {},
    };
}
/**
 * Converts a JS Date object to a string format recognized by all DB engines.
 * See https://github.com/vendure-ecommerce/vendure/issues/251
 */
function convertDate(input) {
    if (input instanceof Date) {
        return DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(input);
    }
    return input;
}
/**
 * Returns a valid regexp clause based on the current DB driver type.
 */
function getRegexpClause(fieldName, argIndex, dbType) {
    switch (dbType) {
        case 'mariadb':
        case 'mysql':
        case 'sqljs':
        case 'better-sqlite3':
        case 'aurora-mysql':
            return `${fieldName} REGEXP :arg${argIndex}`;
        case 'postgres':
        case 'aurora-postgres':
        case 'cockroachdb':
            return `${fieldName} ~* :arg${argIndex}`;
        // The node-sqlite3 driver does not support user-defined functions
        // and therefore we are unable to define a custom regexp
        // function. See https://github.com/mapbox/node-sqlite3/issues/140
        case 'sqlite':
        default:
            throw new errors_1.InternalServerError(`The 'regex' filter is not available when using the '${dbType}' driver`);
    }
}
//# sourceMappingURL=parse-filter-params.js.map