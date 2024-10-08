import { DynamicModule, Type } from '@nestjs/common';
import { LanguageCode } from '@vendure/common/lib/generated-types';
import { DataSourceOptions } from 'typeorm';
import { CustomFields } from './custom-field/custom-field-types';
import { EntityIdStrategy } from './entity/entity-id-strategy';
import { VendureLogger } from './logger/vendure-logger';
import {
    ApiOptions,
    AssetOptions,
    AuthOptions,
    CatalogOptions,
    EntityOptions,
    ImportExportOptions,
    JobQueueOptions,
    OrderOptions,
    PaymentOptions,
    PromotionOptions,
    ShippingOptions,
    SystemOptions,
    TaxOptions,
    VendureConfig,
} from './vendure-config';
export declare class ConfigService implements VendureConfig {
    private activeConfig;
    private allCustomFieldsConfig;
    constructor();
    get apiOptions(): Required<ApiOptions>;
    get authOptions(): Required<AuthOptions>;
    get catalogOptions(): Required<CatalogOptions>;
    get defaultChannelToken(): string | null;
    get defaultLanguageCode(): LanguageCode;
    get entityOptions(): Required<Omit<EntityOptions, 'entityIdStrategy'>> & EntityOptions;
    get entityIdStrategy(): EntityIdStrategy<any>;
    get assetOptions(): Required<AssetOptions>;
    get dbConnectionOptions(): DataSourceOptions;
    get promotionOptions(): Required<PromotionOptions>;
    get shippingOptions(): Required<ShippingOptions>;
    get orderOptions(): Required<OrderOptions>;
    get paymentOptions(): Required<PaymentOptions>;
    get taxOptions(): Required<TaxOptions>;
    get importExportOptions(): Required<ImportExportOptions>;
    get customFields(): Required<CustomFields>;
    get plugins(): Array<DynamicModule | Type<any>>;
    get logger(): VendureLogger;
    get jobQueueOptions(): Required<JobQueueOptions>;
    get systemOptions(): Required<SystemOptions>;
    private getCustomFieldsForAllEntities;
}
