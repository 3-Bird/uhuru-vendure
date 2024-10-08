import {
    CreateRoleInput,
    DeletionResponse,
    Permission,
    UpdateRoleInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { RelationPaths } from '../../api/decorators/relations.decorator';
import { RequestContextCacheService } from '../../cache/request-context-cache.service';
import { ListQueryOptions } from '../../common/types/common-types';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Channel } from '../../entity/channel/channel.entity';
import { Role } from '../../entity/role/role.entity';
import { EventBus } from '../../event-bus';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { ChannelService } from './channel.service';
/**
 * @description
 * Contains methods relating to {@link Role} entities.
 *
 * @docsCategory services
 */
export declare class RoleService {
    private connection;
    private channelService;
    private listQueryBuilder;
    private configService;
    private eventBus;
    private requestContextCache;
    constructor(
        connection: TransactionalConnection,
        channelService: ChannelService,
        listQueryBuilder: ListQueryBuilder,
        configService: ConfigService,
        eventBus: EventBus,
        requestContextCache: RequestContextCacheService,
    );
    initRoles(): Promise<void>;
    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<Role>,
        relations?: RelationPaths<Role>,
    ): Promise<PaginatedList<Role>>;
    findOne(ctx: RequestContext, roleId: ID, relations?: RelationPaths<Role>): Promise<Role | undefined>;
    getChannelsForRole(ctx: RequestContext, roleId: ID): Promise<Channel[]>;
    /**
     * @description
     * Returns the special SuperAdmin Role, which always exists in Vendure.
     */
    getSuperAdminRole(ctx?: RequestContext): Promise<Role>;
    /**
     * @description
     * Returns the special Customer Role, which always exists in Vendure.
     */
    getCustomerRole(ctx?: RequestContext): Promise<Role>;
    /**
     * @description
     * Returns all the valid Permission values
     */
    getAllPermissions(): string[];
    /**
     * @description
     * Returns true if the User has the specified permission on that Channel
     */
    userHasPermissionOnChannel(ctx: RequestContext, channelId: ID, permission: Permission): Promise<boolean>;
    /**
     * @description
     * Returns true if the User has any of the specified permissions on that Channel
     */
    userHasAnyPermissionsOnChannel(
        ctx: RequestContext,
        channelId: ID,
        permissions: Permission[],
    ): Promise<boolean>;
    private activeUserCanReadRole;
    /**
     * @description
     * Returns true if the User has all the specified permissions on that Channel
     */
    userHasAllPermissionsOnChannel(
        ctx: RequestContext,
        channelId: ID,
        permissions: Permission[],
    ): Promise<boolean>;
    private getActiveUserPermissionsOnChannel;
    create(ctx: RequestContext, input: CreateRoleInput): Promise<Role>;
    update(ctx: RequestContext, input: UpdateRoleInput): Promise<Role>;
    delete(ctx: RequestContext, id: ID): Promise<DeletionResponse>;
    assignRoleToChannel(ctx: RequestContext, roleId: ID, channelId: ID): Promise<void>;
    private getPermittedChannels;
    private checkPermissionsAreValid;
    /**
     * @description
     * Checks that the active User has sufficient Permissions on the target Channels to create
     * a Role with the given Permissions. The rule is that an Administrator may only grant
     * Permissions that they themselves already possess.
     */
    private checkActiveUserHasSufficientPermissions;
    private getRoleByCode;
    /**
     * Ensure that the SuperAdmin role exists and that it has all possible Permissions.
     */
    private ensureSuperAdminRoleExists;
    /**
     * The Customer Role is a special case which must always exist.
     */
    private ensureCustomerRoleExists;
    /**
     * Since custom permissions can be added and removed by config, there may exist one or more Roles with
     * invalid permissions (i.e. permissions that were set previously to a custom permission, which has been
     * subsequently removed from config). This method should run on startup to ensure that any such invalid
     * permissions are removed from those Roles.
     */
    private ensureRolesHaveValidPermissions;
    private createRoleForChannels;
    private getAllAssignablePermissions;
}
