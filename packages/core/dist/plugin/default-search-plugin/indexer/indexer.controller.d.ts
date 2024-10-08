import { Observable } from 'rxjs';
import { RequestContextCacheService } from '../../../cache/request-context-cache.service';
import { ConfigService } from '../../../config/config.service';
import { TransactionalConnection } from '../../../connection/transactional-connection';
import { Job } from '../../../job-queue/job';
import { EntityHydrator } from '../../../service/helpers/entity-hydrator/entity-hydrator.service';
import { ProductPriceApplicator } from '../../../service/helpers/product-price-applicator/product-price-applicator';
import { ProductVariantService } from '../../../service/services/product-variant.service';
import {
    DefaultSearchPluginInitOptions,
    ProductChannelMessageData,
    ReindexMessageResponse,
    UpdateAssetMessageData,
    UpdateIndexQueueJobData,
    UpdateProductMessageData,
    UpdateVariantMessageData,
    UpdateVariantsByIdJobData,
    VariantChannelMessageData,
} from '../types';
export declare const BATCH_SIZE = 1000;
export declare const productRelations: string[];
export declare const variantRelations: string[];
export declare const workerLoggerCtx = 'DefaultSearchPlugin Worker';
export declare class IndexerController {
    private connection;
    private entityHydrator;
    private productPriceApplicator;
    private configService;
    private requestContextCache;
    private productVariantService;
    private options;
    private queue;
    constructor(
        connection: TransactionalConnection,
        entityHydrator: EntityHydrator,
        productPriceApplicator: ProductPriceApplicator,
        configService: ConfigService,
        requestContextCache: RequestContextCacheService,
        productVariantService: ProductVariantService,
        options: DefaultSearchPluginInitOptions,
    );
    reindex(job: Job<UpdateIndexQueueJobData>): Observable<ReindexMessageResponse>;
    updateVariantsById(job: Job<UpdateVariantsByIdJobData>): Observable<ReindexMessageResponse>;
    updateProduct(data: UpdateProductMessageData): Promise<boolean>;
    updateVariants(data: UpdateVariantMessageData): Promise<boolean>;
    deleteProduct(data: UpdateProductMessageData): Promise<boolean>;
    deleteVariant(data: UpdateVariantMessageData): Promise<boolean>;
    assignProductToChannel(data: ProductChannelMessageData): Promise<boolean>;
    removeProductFromChannel(data: ProductChannelMessageData): Promise<boolean>;
    assignVariantToChannel(data: VariantChannelMessageData): Promise<boolean>;
    removeVariantFromChannel(data: VariantChannelMessageData): Promise<boolean>;
    updateAsset(data: UpdateAssetMessageData): Promise<boolean>;
    deleteAsset(data: UpdateAssetMessageData): Promise<boolean>;
    private updateProductInChannel;
    private updateVariantsInChannel;
    private deleteProductInChannel;
    private loadChannel;
    private getAllChannels;
    private getSearchIndexQueryBuilder;
    private getProductInChannelQueryBuilder;
    private saveVariants;
    /**
     * If a Product has no variants, we create a synthetic variant for the purposes
     * of making that product visible via the search query.
     */
    private saveSyntheticVariant;
    /**
     * Removes any synthetic variants for the given product
     */
    private removeSyntheticVariants;
    private getTranslation;
    private getFacetIds;
    private getFacetValueIds;
    /**
     * Remove items from the search index
     */
    private removeSearchIndexItems;
    /**
     * Prevent postgres errors from too-long indices
     * https://github.com/vendure-ecommerce/vendure/issues/745
     */
    private constrainDescription;
}
