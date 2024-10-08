import {
    AssignStockLocationsToChannelInput,
    CreateStockLocationInput,
    DeleteStockLocationInput,
    DeletionResponse,
    RemoveStockLocationsFromChannelInput,
    UpdateStockLocationInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { RelationPaths } from '../../api/decorators/relations.decorator';
import { RequestContextCacheService } from '../../cache/request-context-cache.service';
import { ListQueryOptions } from '../../common/types/common-types';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { OrderLine } from '../../entity/order-line/order-line.entity';
import { StockLocation } from '../../entity/stock-location/stock-location.entity';
import { CustomFieldRelationService } from '../helpers/custom-field-relation/custom-field-relation.service';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { RequestContextService } from '../helpers/request-context/request-context.service';
import { ChannelService } from './channel.service';
import { RoleService } from './role.service';
export declare class StockLocationService {
    private requestContextService;
    private connection;
    private channelService;
    private roleService;
    private listQueryBuilder;
    private configService;
    private requestContextCache;
    private customFieldRelationService;
    constructor(
        requestContextService: RequestContextService,
        connection: TransactionalConnection,
        channelService: ChannelService,
        roleService: RoleService,
        listQueryBuilder: ListQueryBuilder,
        configService: ConfigService,
        requestContextCache: RequestContextCacheService,
        customFieldRelationService: CustomFieldRelationService,
    );
    initStockLocations(): Promise<void>;
    findOne(ctx: RequestContext, stockLocationId: ID): Promise<StockLocation | undefined>;
    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<StockLocation>,
        relations?: RelationPaths<StockLocation>,
    ): Promise<PaginatedList<StockLocation>>;
    create(ctx: RequestContext, input: CreateStockLocationInput): Promise<StockLocation>;
    update(ctx: RequestContext, input: UpdateStockLocationInput): Promise<StockLocation>;
    delete(ctx: RequestContext, input: DeleteStockLocationInput): Promise<DeletionResponse>;
    assignStockLocationsToChannel(
        ctx: RequestContext,
        input: AssignStockLocationsToChannelInput,
    ): Promise<StockLocation[]>;
    removeStockLocationsFromChannel(
        ctx: RequestContext,
        input: RemoveStockLocationsFromChannelInput,
    ): Promise<StockLocation[]>;
    getAllStockLocations(ctx: RequestContext): Promise<StockLocation[]>;
    defaultStockLocation(ctx: RequestContext): Promise<StockLocation>;
    getAllocationLocations(
        ctx: RequestContext,
        orderLine: OrderLine,
        quantity: number,
    ): Promise<import('../..').LocationWithQuantity[]>;
    getReleaseLocations(
        ctx: RequestContext,
        orderLine: OrderLine,
        quantity: number,
    ): Promise<import('../..').LocationWithQuantity[]>;
    getSaleLocations(
        ctx: RequestContext,
        orderLine: OrderLine,
        quantity: number,
    ): Promise<import('../..').LocationWithQuantity[]>;
    getCancellationLocations(
        ctx: RequestContext,
        orderLine: OrderLine,
        quantity: number,
    ): Promise<import('../..').LocationWithQuantity[]>;
    private ensureDefaultStockLocationExists;
}
