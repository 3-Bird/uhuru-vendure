import {
    CreateAdministratorInput,
    DeletionResult,
    UpdateAdministratorInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { RelationPaths } from '../../api/decorators/relations.decorator';
import { ListQueryOptions } from '../../common/types/common-types';
import { ConfigService } from '../../config';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Administrator } from '../../entity/administrator/administrator.entity';
import { EventBus } from '../../event-bus';
import { CustomFieldRelationService } from '../helpers/custom-field-relation/custom-field-relation.service';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { PasswordCipher } from '../helpers/password-cipher/password-cipher';
import { RequestContextService } from '../helpers/request-context/request-context.service';
import { RoleService } from './role.service';
import { UserService } from './user.service';
/**
 * @description
 * Contains methods relating to {@link Administrator} entities.
 *
 * @docsCategory services
 */
export declare class AdministratorService {
    private connection;
    private configService;
    private listQueryBuilder;
    private passwordCipher;
    private userService;
    private roleService;
    private customFieldRelationService;
    private eventBus;
    private requestContextService;
    constructor(
        connection: TransactionalConnection,
        configService: ConfigService,
        listQueryBuilder: ListQueryBuilder,
        passwordCipher: PasswordCipher,
        userService: UserService,
        roleService: RoleService,
        customFieldRelationService: CustomFieldRelationService,
        eventBus: EventBus,
        requestContextService: RequestContextService,
    );
    /** @internal */
    initAdministrators(): Promise<void>;
    /**
     * @description
     * Get a paginated list of Administrators.
     */
    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<Administrator>,
        relations?: RelationPaths<Administrator>,
    ): Promise<PaginatedList<Administrator>>;
    /**
     * @description
     * Get an Administrator by id.
     */
    findOne(
        ctx: RequestContext,
        administratorId: ID,
        relations?: RelationPaths<Administrator>,
    ): Promise<Administrator | undefined>;
    /**
     * @description
     * Get an Administrator based on the User id.
     */
    findOneByUserId(
        ctx: RequestContext,
        userId: ID,
        relations?: RelationPaths<Administrator>,
    ): Promise<Administrator | undefined>;
    /**
     * @description
     * Create a new Administrator.
     */
    create(ctx: RequestContext, input: CreateAdministratorInput): Promise<Administrator>;
    /**
     * @description
     * Update an existing Administrator.
     */
    update(ctx: RequestContext, input: UpdateAdministratorInput): Promise<Administrator>;
    /**
     * @description
     * Checks that the active user is allowed to grant the specified Roles when creating or
     * updating an Administrator.
     */
    private checkActiveUserCanGrantRoles;
    /**
     * @description
     * Assigns a Role to the Administrator's User entity.
     */
    assignRole(ctx: RequestContext, administratorId: ID, roleId: ID): Promise<Administrator>;
    /**
     * @description
     * Soft deletes an Administrator (sets the `deletedAt` field).
     */
    softDelete(
        ctx: RequestContext,
        id: ID,
    ): Promise<{
        result: DeletionResult;
    }>;
    /**
     * @description
     * Resolves to `true` if the administrator ID belongs to the only Administrator
     * with SuperAdmin permissions.
     */
    private isSoleSuperadmin;
    /**
     * @description
     * There must always exist a SuperAdmin, otherwise full administration via API will
     * no longer be possible.
     *
     * @internal
     */
    private ensureSuperAdminExists;
}
