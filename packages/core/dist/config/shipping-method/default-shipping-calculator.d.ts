import { LanguageCode } from '@vendure/common/lib/generated-types';
import { ShippingCalculator } from './shipping-calculator';
export declare enum TaxSetting {
    include = 'include',
    exclude = 'exclude',
    auto = 'auto',
}
export declare const defaultShippingCalculator: ShippingCalculator<{
    rate: {
        type: 'int';
        defaultValue: number;
        ui: {
            component: string;
        };
        label: {
            languageCode: LanguageCode.en;
            value: string;
        }[];
    };
    includesTax: {
        type: 'string';
        defaultValue: TaxSetting;
        ui: {
            component: string;
            options: {
                label: {
                    languageCode: LanguageCode;
                    value: string;
                }[];
                value: TaxSetting;
            }[];
        };
        label: {
            languageCode: LanguageCode.en;
            value: string;
        }[];
    };
    taxRate: {
        type: 'int';
        defaultValue: number;
        ui: {
            component: string;
            suffix: string;
        };
        label: {
            languageCode: LanguageCode.en;
            value: string;
        }[];
    };
}>;
