import {
    CreateZoneInput,
    DeletionResponse,
    MutationAddMembersToZoneArgs,
    MutationRemoveMembersFromZoneArgs,
    UpdateZoneInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { SelfRefreshingCache } from '../../common/self-refreshing-cache';
import { ListQueryOptions } from '../../common/types/common-types';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Zone } from '../../entity/zone/zone.entity';
import { EventBus } from '../../event-bus';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { TranslatorService } from '../helpers/translator/translator.service';
/**
 * @description
 * Contains methods relating to {@link Zone} entities.
 *
 * @docsCategory services
 */
export declare class ZoneService {
    private connection;
    private configService;
    private eventBus;
    private translator;
    private listQueryBuilder;
    /**
     * We cache all Zones to avoid hitting the DB many times per request.
     */
    private zones;
    constructor(
        connection: TransactionalConnection,
        configService: ConfigService,
        eventBus: EventBus,
        translator: TranslatorService,
        listQueryBuilder: ListQueryBuilder,
    );
    /** @internal */
    initZones(): Promise<void>;
    /**
     * Creates a zones cache, that can be used to reduce number of zones queries to database
     *
     * @internal
     */
    createCache(): Promise<SelfRefreshingCache<Zone[], [RequestContext]>>;
    findAll(ctx: RequestContext, options?: ListQueryOptions<Zone>): Promise<PaginatedList<Zone>>;
    findOne(ctx: RequestContext, zoneId: ID): Promise<Zone | undefined>;
    getAllWithMembers(ctx: RequestContext): Promise<Zone[]>;
    create(ctx: RequestContext, input: CreateZoneInput): Promise<Zone>;
    update(ctx: RequestContext, input: UpdateZoneInput): Promise<Zone>;
    delete(ctx: RequestContext, id: ID): Promise<DeletionResponse>;
    addMembersToZone(ctx: RequestContext, { memberIds, zoneId }: MutationAddMembersToZoneArgs): Promise<Zone>;
    removeMembersFromZone(
        ctx: RequestContext,
        { memberIds, zoneId }: MutationRemoveMembersFromZoneArgs,
    ): Promise<Zone>;
    private getCountriesFromIds;
    /**
     * Ensures zones cache exists. If not, this method creates one.
     */
    private ensureCacheExists;
}
