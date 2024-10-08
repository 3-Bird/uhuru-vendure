import { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SearchReindexResponse } from '@vendure/common/lib/generated-types';
import { Type } from '@vendure/common/lib/shared-types';
import { EventBus } from '../../event-bus/event-bus';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { SearchIndexService } from './indexer/search-index.service';
import { DefaultSearchPluginInitOptions } from './types';
export interface DefaultSearchReindexResponse extends SearchReindexResponse {
    timeTaken: number;
    indexedItemCount: number;
}
/**
 * @description
 * The DefaultSearchPlugin provides a full-text Product search based on the full-text searching capabilities of the
 * underlying database.
 *
 * The DefaultSearchPlugin is bundled with the `\@vendure/core` package. If you are not using an alternative search
 * plugin, then make sure this one is used, otherwise you will not be able to search products via the
 * [`search` query](/reference/graphql-api/shop/queries#search).
 *
 * :::caution
 * Note that the quality of the fulltext search capabilities varies depending on the underlying database being used. For example,
 * the MySQL & Postgres implementations will typically yield better results than the SQLite implementation.
 * :::
 *
 *
 * @example
 * ```ts
 * import { DefaultSearchPlugin, VendureConfig } from '\@vendure/core';
 *
 * export const config: VendureConfig = {
 *   // Add an instance of the plugin to the plugins array
 *   plugins: [
 *     DefaultSearchPlugin.init({
 *       indexStockStatus: true,
 *       bufferUpdates: true,
 *     }),
 *   ],
 * };
 * ```
 *
 * @docsCategory DefaultSearchPlugin
 */
export declare class DefaultSearchPlugin implements OnApplicationBootstrap, OnApplicationShutdown {
    private eventBus;
    private searchIndexService;
    private jobQueueService;
    private moduleRef;
    static options: DefaultSearchPluginInitOptions;
    /** @internal */
    constructor(
        eventBus: EventBus,
        searchIndexService: SearchIndexService,
        jobQueueService: JobQueueService,
        moduleRef: ModuleRef,
    );
    static init(options: DefaultSearchPluginInitOptions): Type<DefaultSearchPlugin>;
    /** @internal */
    onApplicationBootstrap(): Promise<void>;
    /** @internal */
    onApplicationShutdown(signal?: string): Promise<void>;
    private initSearchStrategy;
    private destroySearchStrategy;
    /**
     * If the `indexStockStatus` option is set to `true`, we dynamically add a couple of
     * columns to the SearchIndexItem entity. This is done in this way to allow us to add
     * support for indexing the stock status, while preventing a backwards-incompatible
     * schema change.
     */
    private static addStockColumnsToEntity;
}
