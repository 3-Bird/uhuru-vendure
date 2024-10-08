import { LanguageCode } from '@vendure/common/lib/generated-types';
import { PromotionCondition } from '../promotion-condition';
export declare const buyXGetYFreeCondition: PromotionCondition<
    {
        amountX: {
            type: 'int';
            defaultValue: number;
        };
        variantIdsX: {
            type: 'ID';
            list: true;
            ui: {
                component: string;
            };
            label: {
                languageCode: LanguageCode.en;
                value: string;
            }[];
        };
        amountY: {
            type: 'int';
            defaultValue: number;
        };
        variantIdsY: {
            type: 'ID';
            list: true;
            ui: {
                component: string;
            };
            label: {
                languageCode: LanguageCode.en;
                value: string;
            }[];
        };
    },
    'buy_x_get_y_free',
    | false
    | {
          freeItemsPerLine: {
              [lineId: string]: number;
          };
      }
>;
