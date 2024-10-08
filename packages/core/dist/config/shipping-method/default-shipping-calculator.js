"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultShippingCalculator = exports.TaxSetting = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const shipping_calculator_1 = require("./shipping-calculator");
var TaxSetting;
(function (TaxSetting) {
    TaxSetting["include"] = "include";
    TaxSetting["exclude"] = "exclude";
    TaxSetting["auto"] = "auto";
})(TaxSetting || (exports.TaxSetting = TaxSetting = {}));
exports.defaultShippingCalculator = new shipping_calculator_1.ShippingCalculator({
    code: 'default-shipping-calculator',
    description: [{ languageCode: generated_types_1.LanguageCode.en, value: 'Default Flat-Rate Shipping Calculator' }],
    args: {
        rate: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: [{ languageCode: generated_types_1.LanguageCode.en, value: 'Shipping price' }],
        },
        includesTax: {
            type: 'string',
            defaultValue: TaxSetting.auto,
            ui: {
                component: 'select-form-input',
                options: [
                    {
                        label: [{ languageCode: generated_types_1.LanguageCode.en, value: 'Includes tax' }],
                        value: TaxSetting.include,
                    },
                    {
                        label: [{ languageCode: generated_types_1.LanguageCode.en, value: 'Excludes tax' }],
                        value: TaxSetting.exclude,
                    },
                    {
                        label: [{ languageCode: generated_types_1.LanguageCode.en, value: 'Auto (based on Channel)' }],
                        value: TaxSetting.auto,
                    },
                ],
            },
            label: [{ languageCode: generated_types_1.LanguageCode.en, value: 'Price includes tax' }],
        },
        taxRate: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'number-form-input', suffix: '%' },
            label: [{ languageCode: generated_types_1.LanguageCode.en, value: 'Tax rate' }],
        },
    },
    calculate: (ctx, order, args) => {
        return {
            price: args.rate,
            taxRate: args.taxRate,
            priceIncludesTax: getPriceIncludesTax(ctx, args.includesTax),
        };
    },
});
function getPriceIncludesTax(ctx, setting) {
    switch (setting) {
        case TaxSetting.auto:
            return ctx.channel.pricesIncludeTax;
        case TaxSetting.exclude:
            return false;
        case TaxSetting.include:
            return true;
    }
}
//# sourceMappingURL=default-shipping-calculator.js.map