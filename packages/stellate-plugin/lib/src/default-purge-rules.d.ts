import {
    CollectionEvent,
    CollectionModificationEvent,
    ProductChannelEvent,
    ProductEvent,
    ProductVariantChannelEvent,
    ProductVariantEvent,
    StockMovementEvent,
    TaxRateEvent,
} from '@vendure/core';
import { PurgeRule } from './purge-rule';
export declare const purgeProductsOnProductEvent: PurgeRule<ProductEvent>;
export declare const purgeProductVariantsOnProductVariantEvent: PurgeRule<ProductVariantEvent>;
export declare const purgeProductsOnChannelEvent: PurgeRule<ProductChannelEvent>;
export declare const purgeProductVariantsOnChannelEvent: PurgeRule<ProductVariantChannelEvent>;
export declare const purgeProductVariantsOnStockMovementEvent: PurgeRule<StockMovementEvent>;
export declare const purgeCollectionsOnCollectionModificationEvent: PurgeRule<CollectionModificationEvent>;
export declare const purgeCollectionsOnCollectionEvent: PurgeRule<CollectionEvent>;
export declare const purgeAllOnTaxRateEvent: PurgeRule<TaxRateEvent>;
export declare const defaultPurgeRules: (
    | PurgeRule<ProductEvent>
    | PurgeRule<ProductVariantEvent>
    | PurgeRule<ProductChannelEvent>
    | PurgeRule<ProductVariantChannelEvent>
    | PurgeRule<StockMovementEvent>
    | PurgeRule<CollectionModificationEvent>
    | PurgeRule<CollectionEvent>
    | PurgeRule<TaxRateEvent>
)[];
