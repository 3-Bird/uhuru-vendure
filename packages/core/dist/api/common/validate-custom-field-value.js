"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCustomFieldValue = void 0;
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const errors_1 = require("../../common/error/errors");
const user_has_permissions_on_custom_field_1 = require("./user-has-permissions-on-custom-field");
/**
 * Validates the value of a custom field input against any configured constraints.
 * If validation fails, an error is thrown.
 */
async function validateCustomFieldValue(config, value, injector, ctx) {
    if (config.readonly) {
        throw new errors_1.UserInputError('error.field-invalid-readonly', { name: config.name });
    }
    if (config.nullable === false) {
        if (value === null) {
            throw new errors_1.UserInputError('error.field-invalid-non-nullable', {
                name: config.name,
            });
        }
    }
    if (config.requiresPermission) {
        if (!(0, user_has_permissions_on_custom_field_1.userHasPermissionsOnCustomField)(ctx, config)) {
            throw new errors_1.UserInputError('error.field-invalid-no-permission', { name: config.name });
        }
    }
    if (config.list === true && Array.isArray(value)) {
        for (const singleValue of value) {
            validateSingleValue(config, singleValue);
        }
    }
    else {
        validateSingleValue(config, value);
    }
    await validateCustomFunction(config, value, injector, ctx);
}
exports.validateCustomFieldValue = validateCustomFieldValue;
function validateSingleValue(config, value) {
    switch (config.type) {
        case 'string':
        case 'localeString':
            validateStringField(config, value);
            break;
        case 'int':
        case 'float':
            validateNumberField(config, value);
            break;
        case 'datetime':
            validateDateTimeField(config, value);
            break;
        case 'boolean':
        case 'relation':
        case 'text':
        case 'localeText':
            break;
        default:
            (0, shared_utils_1.assertNever)(config);
    }
}
async function validateCustomFunction(config, value, injector, ctx) {
    if (typeof config.validate === 'function') {
        const error = await config.validate(value, injector, ctx);
        if (typeof error === 'string') {
            throw new errors_1.UserInputError(error);
        }
        if (Array.isArray(error)) {
            const localizedError = error.find(e => e.languageCode === ctx.languageCode) || error[0];
            throw new errors_1.UserInputError(localizedError.value);
        }
    }
}
function validateStringField(config, value) {
    const { pattern } = config;
    if (pattern) {
        const re = new RegExp(pattern);
        if (!re.test(value)) {
            throw new errors_1.UserInputError('error.field-invalid-string-pattern', {
                name: config.name,
                value,
                pattern,
            });
        }
    }
    const options = config.options;
    if (options) {
        const validOptions = options.map(o => o.value);
        if (value === null && config.nullable === true) {
            return;
        }
        if (!validOptions.includes(value)) {
            throw new errors_1.UserInputError('error.field-invalid-string-option', {
                name: config.name,
                value,
                validOptions: validOptions.map(o => `'${o}'`).join(', '),
            });
        }
    }
}
function validateNumberField(config, value) {
    const { min, max } = config;
    if (min != null && value < min) {
        throw new errors_1.UserInputError('error.field-invalid-number-range-min', { name: config.name, value, min });
    }
    if (max != null && max < value) {
        throw new errors_1.UserInputError('error.field-invalid-number-range-max', { name: config.name, value, max });
    }
}
function validateDateTimeField(config, value) {
    const { min, max } = config;
    const valueDate = new Date(value);
    if (min != null && valueDate < new Date(min)) {
        throw new errors_1.UserInputError('error.field-invalid-datetime-range-min', {
            name: config.name,
            value: valueDate.toISOString(),
            min,
        });
    }
    if (max != null && new Date(max) < valueDate) {
        throw new errors_1.UserInputError('error.field-invalid-datetime-range-max', {
            name: config.name,
            value: valueDate.toISOString(),
            max,
        });
    }
}
//# sourceMappingURL=validate-custom-field-value.js.map