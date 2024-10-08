/// <reference types="node" />
/// <reference types="node" />
import {
    AssetListOptions,
    AssignAssetsToChannelInput,
    CreateAssetInput,
    CreateAssetResult,
    DeletionResponse,
    UpdateAssetInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { ReadStream } from 'fs-extra';
import { Readable } from 'stream';
import { RequestContext } from '../../api/common/request-context';
import { RelationPaths } from '../../api/decorators/relations.decorator';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Asset } from '../../entity/asset/asset.entity';
import { OrderableAsset } from '../../entity/asset/orderable-asset.entity';
import { VendureEntity } from '../../entity/base/base.entity';
import { EventBus } from '../../event-bus/event-bus';
import { CustomFieldRelationService } from '../helpers/custom-field-relation/custom-field-relation.service';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { ChannelService } from './channel.service';
import { RoleService } from './role.service';
import { TagService } from './tag.service';
/**
 * @description
 * Certain entities (Product, ProductVariant, Collection) use this interface
 * to model a featured asset and then a list of assets with a defined order.
 *
 * @docsCategory services
 * @docsPage AssetService
 */
export interface EntityWithAssets extends VendureEntity {
    featuredAsset: Asset | null;
    assets: OrderableAsset[];
}
/**
 * @description
 * Used when updating entities which implement {@link EntityWithAssets}.
 *
 * @docsCategory services
 * @docsPage AssetService
 */
export interface EntityAssetInput {
    assetIds?: ID[] | null;
    featuredAssetId?: ID | null;
}
/**
 * @description
 * Contains methods relating to {@link Asset} entities.
 *
 * @docsCategory services
 * @docsWeight 0
 */
export declare class AssetService {
    private connection;
    private configService;
    private listQueryBuilder;
    private eventBus;
    private tagService;
    private channelService;
    private roleService;
    private customFieldRelationService;
    private permittedMimeTypes;
    constructor(
        connection: TransactionalConnection,
        configService: ConfigService,
        listQueryBuilder: ListQueryBuilder,
        eventBus: EventBus,
        tagService: TagService,
        channelService: ChannelService,
        roleService: RoleService,
        customFieldRelationService: CustomFieldRelationService,
    );
    findOne(ctx: RequestContext, id: ID, relations?: RelationPaths<Asset>): Promise<Asset | undefined>;
    findAll(
        ctx: RequestContext,
        options?: AssetListOptions,
        relations?: RelationPaths<Asset>,
    ): Promise<PaginatedList<Asset>>;
    getFeaturedAsset<T extends Omit<EntityWithAssets, 'assets'>>(
        ctx: RequestContext,
        entity: T,
    ): Promise<Asset | undefined>;
    /**
     * @description
     * Returns the Assets of an entity which has a well-ordered list of Assets, such as Product,
     * ProductVariant or Collection.
     */
    getEntityAssets<T extends EntityWithAssets>(ctx: RequestContext, entity: T): Promise<Asset[] | undefined>;
    updateFeaturedAsset<T extends EntityWithAssets>(
        ctx: RequestContext,
        entity: T,
        input: EntityAssetInput,
    ): Promise<T>;
    /**
     * @description
     * Updates the assets / featuredAsset of an entity, ensuring that only valid assetIds are used.
     */
    updateEntityAssets<T extends EntityWithAssets>(
        ctx: RequestContext,
        entity: T,
        input: EntityAssetInput,
    ): Promise<T>;
    /**
     * @description
     * Create an Asset based on a file uploaded via the GraphQL API. The file should be uploaded
     * using the [GraphQL multipart request specification](https://github.com/jaydenseric/graphql-multipart-request-spec),
     * e.g. using the [apollo-upload-client](https://github.com/jaydenseric/apollo-upload-client) npm package.
     *
     * See the [Uploading Files docs](/guides/developer-guide/uploading-files) for an example of usage.
     */
    create(ctx: RequestContext, input: CreateAssetInput): Promise<CreateAssetResult>;
    /**
     * @description
     * Updates the name, focalPoint, tags & custom fields of an Asset.
     */
    update(ctx: RequestContext, input: UpdateAssetInput): Promise<Asset>;
    /**
     * @description
     * Deletes an Asset after performing checks to ensure that the Asset is not currently in use
     * by a Product, ProductVariant or Collection.
     */
    delete(
        ctx: RequestContext,
        ids: ID[],
        force?: boolean,
        deleteFromAllChannels?: boolean,
    ): Promise<DeletionResponse>;
    assignToChannel(ctx: RequestContext, input: AssignAssetsToChannelInput): Promise<Asset[]>;
    /**
     * @description
     * Create an Asset from a file stream, for example to create an Asset during data import.
     */
    createFromFileStream(stream: ReadStream, ctx?: RequestContext): Promise<CreateAssetResult>;
    createFromFileStream(
        stream: Readable,
        filePath: string,
        ctx?: RequestContext,
    ): Promise<CreateAssetResult>;
    private getMimeType;
    /**
     * @description
     * Unconditionally delete given assets.
     * Does not remove assets from channels
     */
    private deleteUnconditional;
    /**
     * Check if current user has permissions to delete assets from all channels
     */
    private hasDeletePermissionForChannels;
    private createAssetInternal;
    private getSourceFileName;
    private getPreviewFileName;
    private generateUniqueName;
    private getDimensions;
    private createOrderableAssets;
    private getOrderableAsset;
    private removeExistingOrderableAssets;
    private getOrderableAssetType;
    private getHostEntityIdProperty;
    private validateMimeType;
    /**
     * Find the entities which reference the given Asset as a featuredAsset.
     */
    private findAssetUsages;
}
