export * from './promotion-action';
export * from './promotion-condition';
export * from './actions/facet-values-percentage-discount-action';
export * from './actions/order-percentage-discount-action';
export * from './actions/product-percentage-discount-action';
export * from './actions/free-shipping-action';
export * from './actions/buy-x-get-y-free-action';
export * from './actions/order-fixed-discount-action';
export * from './conditions/has-facet-values-condition';
export * from './conditions/min-order-amount-condition';
export * from './conditions/contains-products-condition';
export * from './conditions/customer-group-condition';
export * from './conditions/buy-x-get-y-free-condition';
export * from './utils/facet-value-checker';
export declare const defaultPromotionActions: (
    | import('./promotion-action').PromotionItemAction<
          {},
          import('./promotion-condition').PromotionCondition<
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
                          languageCode: import('@vendure/common/lib/generated-types').LanguageCode.en;
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
                          languageCode: import('@vendure/common/lib/generated-types').LanguageCode.en;
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
          >[]
      >
    | import('./promotion-action').PromotionItemAction<
          {
              discount: {
                  type: 'float';
                  ui: {
                      component: string;
                      suffix: string;
                  };
              };
              facets: {
                  type: 'ID';
                  list: true;
                  ui: {
                      component: string;
                  };
              };
          },
          []
      >
    | import('./promotion-action').PromotionShippingAction<{}, []>
    | import('./promotion-action').PromotionOrderAction<
          {
              discount: {
                  type: 'int';
                  ui: {
                      component: string;
                  };
              };
          },
          []
      >
    | import('./promotion-action').PromotionOrderAction<
          {
              discount: {
                  type: 'float';
                  ui: {
                      component: string;
                      suffix: string;
                  };
              };
          },
          []
      >
    | import('./promotion-action').PromotionItemAction<
          {
              discount: {
                  type: 'float';
                  ui: {
                      component: string;
                      suffix: string;
                  };
              };
              productVariantIds: {
                  type: 'ID';
                  list: true;
                  ui: {
                      component: string;
                  };
                  label: {
                      languageCode: import('@vendure/common/lib/generated-types').LanguageCode.en;
                      value: string;
                  }[];
              };
          },
          []
      >
)[];
export declare const defaultPromotionConditions: (
    | import('./promotion-condition').PromotionCondition<
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
                      languageCode: import('@vendure/common/lib/generated-types').LanguageCode.en;
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
                      languageCode: import('@vendure/common/lib/generated-types').LanguageCode.en;
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
      >
    | import('./promotion-condition').PromotionCondition<
          {
              minimum: {
                  type: 'int';
                  defaultValue: number;
              };
              productVariantIds: {
                  type: 'ID';
                  list: true;
                  ui: {
                      component: string;
                  };
                  label: {
                      languageCode: import('@vendure/common/lib/generated-types').LanguageCode.en;
                      value: string;
                  }[];
              };
          },
          'contains_products',
          boolean
      >
    | import('./promotion-condition').PromotionCondition<
          {
              customerGroupId: {
                  type: 'ID';
                  ui: {
                      component: string;
                  };
                  label: {
                      languageCode: import('@vendure/common/lib/generated-types').LanguageCode.en;
                      value: string;
                  }[];
              };
          },
          'customer_group',
          boolean
      >
    | import('./promotion-condition').PromotionCondition<
          {
              minimum: {
                  type: 'int';
                  defaultValue: number;
              };
              facets: {
                  type: 'ID';
                  list: true;
                  ui: {
                      component: string;
                  };
              };
          },
          'at_least_n_with_facets',
          boolean
      >
    | import('./promotion-condition').PromotionCondition<
          {
              amount: {
                  type: 'int';
                  defaultValue: number;
                  ui: {
                      component: string;
                  };
              };
              taxInclusive: {
                  type: 'boolean';
                  defaultValue: false;
              };
          },
          'minimum_order_amount',
          boolean
      >
)[];
