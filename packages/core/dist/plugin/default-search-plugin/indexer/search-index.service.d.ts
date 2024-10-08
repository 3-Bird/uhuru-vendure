import { OnApplicationBootstrap } from '@nestjs/common';
import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../../api/common/request-context';
import { Asset } from '../../../entity/asset/asset.entity';
import { Product } from '../../../entity/product/product.entity';
import { ProductVariant } from '../../../entity/product-variant/product-variant.entity';
import { JobQueueService } from '../../../job-queue/job-queue.service';
import { UpdateIndexQueueJobData } from '../types';
import { IndexerController } from './indexer.controller';
/**
 * This service is responsible for messaging the {@link IndexerController} with search index updates.
 */
export declare class SearchIndexService implements OnApplicationBootstrap {
    private jobService;
    private indexerController;
    private updateIndexQueue;
    constructor(jobService: JobQueueService, indexerController: IndexerController);
    onApplicationBootstrap(): Promise<void>;
    reindex(
        ctx: RequestContext,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    updateProduct(
        ctx: RequestContext,
        product: Product,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    updateVariants(
        ctx: RequestContext,
        variants: ProductVariant[],
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    deleteProduct(
        ctx: RequestContext,
        product: Product,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    deleteVariant(
        ctx: RequestContext,
        variants: ProductVariant[],
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    updateVariantsById(
        ctx: RequestContext,
        ids: ID[],
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    updateAsset(
        ctx: RequestContext,
        asset: Asset,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    deleteAsset(
        ctx: RequestContext,
        asset: Asset,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    assignProductToChannel(
        ctx: RequestContext,
        productId: ID,
        channelId: ID,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    removeProductFromChannel(
        ctx: RequestContext,
        productId: ID,
        channelId: ID,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    assignVariantToChannel(
        ctx: RequestContext,
        productVariantId: ID,
        channelId: ID,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    removeVariantFromChannel(
        ctx: RequestContext,
        productVariantId: ID,
        channelId: ID,
    ): Promise<import('../../../job-queue/subscribable-job').SubscribableJob<UpdateIndexQueueJobData>>;
    private jobWithProgress;
}
