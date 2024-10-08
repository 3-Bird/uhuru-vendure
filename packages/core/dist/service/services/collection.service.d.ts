import { OnModuleInit } from '@nestjs/common';
import {
    AssignCollectionsToChannelInput,
    ConfigurableOperationDefinition,
    CreateCollectionInput,
    DeletionResponse,
    MoveCollectionInput,
    PreviewCollectionVariantsInput,
    RemoveCollectionsFromChannelInput,
    UpdateCollectionInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { RequestContext, SerializedRequestContext } from '../../api/common/request-context';
import { RelationPaths } from '../../api/decorators/relations.decorator';
import { ListQueryOptions } from '../../common/types/common-types';
import { Translated } from '../../common/types/locale-types';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Collection } from '../../entity/collection/collection.entity';
import { ProductVariant } from '../../entity/product-variant/product-variant.entity';
import { EventBus } from '../../event-bus/event-bus';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { ConfigArgService } from '../helpers/config-arg/config-arg.service';
import { CustomFieldRelationService } from '../helpers/custom-field-relation/custom-field-relation.service';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { SlugValidator } from '../helpers/slug-validator/slug-validator';
import { TranslatableSaver } from '../helpers/translatable-saver/translatable-saver';
import { TranslatorService } from '../helpers/translator/translator.service';
import { AssetService } from './asset.service';
import { ChannelService } from './channel.service';
import { RoleService } from './role.service';
export type ApplyCollectionFiltersJobData = {
    ctx: SerializedRequestContext;
    collectionIds: ID[];
    applyToChangedVariantsOnly?: boolean;
};
/**
 * @description
 * Contains methods relating to {@link Collection} entities.
 *
 * @docsCategory services
 */
export declare class CollectionService implements OnModuleInit {
    private connection;
    private channelService;
    private assetService;
    private listQueryBuilder;
    private translatableSaver;
    private eventBus;
    private jobQueueService;
    private configService;
    private slugValidator;
    private configArgService;
    private customFieldRelationService;
    private translator;
    private roleService;
    private rootCollection;
    private applyFiltersQueue;
    constructor(
        connection: TransactionalConnection,
        channelService: ChannelService,
        assetService: AssetService,
        listQueryBuilder: ListQueryBuilder,
        translatableSaver: TranslatableSaver,
        eventBus: EventBus,
        jobQueueService: JobQueueService,
        configService: ConfigService,
        slugValidator: SlugValidator,
        configArgService: ConfigArgService,
        customFieldRelationService: CustomFieldRelationService,
        translator: TranslatorService,
        roleService: RoleService,
    );
    /**
     * @internal
     */
    onModuleInit(): Promise<void>;
    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<Collection> & {
            topLevelOnly?: boolean;
        },
        relations?: RelationPaths<Collection>,
    ): Promise<PaginatedList<Translated<Collection>>>;
    findOne(
        ctx: RequestContext,
        collectionId: ID,
        relations?: RelationPaths<Collection>,
    ): Promise<Translated<Collection> | undefined>;
    findByIds(
        ctx: RequestContext,
        ids: ID[],
        relations?: RelationPaths<Collection>,
    ): Promise<Array<Translated<Collection>>>;
    findOneBySlug(
        ctx: RequestContext,
        slug: string,
        relations?: RelationPaths<Collection>,
    ): Promise<Translated<Collection> | undefined>;
    /**
     * @description
     * Returns all configured CollectionFilters, as specified by the {@link CatalogOptions}.
     */
    getAvailableFilters(ctx: RequestContext): ConfigurableOperationDefinition[];
    getParent(ctx: RequestContext, collectionId: ID): Promise<Collection | undefined>;
    /**
     * @description
     * Returns all child Collections of the Collection with the given id.
     */
    getChildren(ctx: RequestContext, collectionId: ID): Promise<Collection[]>;
    /**
     * @description
     * Returns an array of name/id pairs representing all ancestor Collections up
     * to the Root Collection.
     */
    getBreadcrumbs(
        ctx: RequestContext,
        collection: Collection,
    ): Promise<
        Array<{
            name: string;
            id: ID;
            slug: string;
        }>
    >;
    /**
     * @description
     * Returns all Collections which are associated with the given Product ID.
     */
    getCollectionsByProductId(
        ctx: RequestContext,
        productId: ID,
        publicOnly: boolean,
    ): Promise<Array<Translated<Collection>>>;
    /**
     * @description
     * Returns the descendants of a Collection as a flat array. The depth of the traversal can be limited
     * with the maxDepth argument. So to get only the immediate children, set maxDepth = 1.
     */
    getDescendants(
        ctx: RequestContext,
        rootId: ID,
        maxDepth?: number,
    ): Promise<Array<Translated<Collection>>>;
    /**
     * @description
     * Gets the ancestors of a given collection. Note that since ProductCategories are implemented as an adjacency list, this method
     * will produce more queries the deeper the collection is in the tree.
     */
    getAncestors(collectionId: ID): Promise<Collection[]>;
    getAncestors(collectionId: ID, ctx: RequestContext): Promise<Array<Translated<Collection>>>;
    previewCollectionVariants(
        ctx: RequestContext,
        input: PreviewCollectionVariantsInput,
        options?: ListQueryOptions<ProductVariant>,
        relations?: RelationPaths<Collection>,
    ): Promise<PaginatedList<ProductVariant>>;
    create(ctx: RequestContext, input: CreateCollectionInput): Promise<Translated<Collection>>;
    update(ctx: RequestContext, input: UpdateCollectionInput): Promise<Translated<Collection>>;
    delete(ctx: RequestContext, id: ID): Promise<DeletionResponse>;
    /**
     * @description
     * Moves a Collection by specifying the parent Collection ID, and an index representing the order amongst
     * its siblings.
     */
    move(ctx: RequestContext, input: MoveCollectionInput): Promise<Translated<Collection>>;
    private getCollectionFiltersFromInput;
    private chunkArray;
    /**
     * Applies the CollectionFilters and returns the IDs of ProductVariants that need to be added or removed.
     */
    private applyCollectionFiltersInternal;
    /**
     * Gets all filters of ancestor Collections while respecting the `inheritFilters` setting of each.
     * As soon as `inheritFilters === false` is encountered, the collected filters are returned.
     */
    private getAncestorFilters;
    /**
     * Returns the IDs of the Collection's ProductVariants.
     */
    getCollectionProductVariantIds(collection: Collection, ctx?: RequestContext): Promise<ID[]>;
    /**
     * Returns the next position value in the given parent collection.
     */
    private getNextPositionInParent;
    private getParentCollection;
    private getRootCollection;
    /**
     * @description
     * Assigns Collections to the specified Channel
     */
    assignCollectionsToChannel(
        ctx: RequestContext,
        input: AssignCollectionsToChannelInput,
    ): Promise<Array<Translated<Collection>>>;
    /**
     * @description
     * Remove Collections from the specified Channel
     */
    removeCollectionsFromChannel(
        ctx: RequestContext,
        input: RemoveCollectionsFromChannelInput,
    ): Promise<Array<Translated<Collection>>>;
}
