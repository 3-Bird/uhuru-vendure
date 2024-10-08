"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const unique_1 = require("@vendure/common/lib/unique");
const request_context_1 = require("../../api/common/request-context");
const request_context_cache_service_1 = require("../../cache/request-context-cache.service");
const constants_1 = require("../../common/constants");
const errors_1 = require("../../common/error/errors");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const channel_entity_1 = require("../../entity/channel/channel.entity");
const role_entity_1 = require("../../entity/role/role.entity");
const user_entity_1 = require("../../entity/user/user.entity");
const event_bus_1 = require("../../event-bus");
const role_event_1 = require("../../event-bus/events/role-event");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const get_user_channels_permissions_1 = require("../helpers/utils/get-user-channels-permissions");
const patch_entity_1 = require("../helpers/utils/patch-entity");
const channel_service_1 = require("./channel.service");
/**
 * @description
 * Contains methods relating to {@link Role} entities.
 *
 * @docsCategory services
 */
let RoleService = class RoleService {
    constructor(connection, channelService, listQueryBuilder, configService, eventBus, requestContextCache) {
        this.connection = connection;
        this.channelService = channelService;
        this.listQueryBuilder = listQueryBuilder;
        this.configService = configService;
        this.eventBus = eventBus;
        this.requestContextCache = requestContextCache;
    }
    async initRoles() {
        await this.ensureSuperAdminRoleExists();
        await this.ensureCustomerRoleExists();
        await this.ensureRolesHaveValidPermissions();
    }
    findAll(ctx, options, relations) {
        return this.listQueryBuilder
            .build(role_entity_1.Role, options, { relations: (0, unique_1.unique)([...(relations !== null && relations !== void 0 ? relations : []), 'channels']), ctx })
            .getManyAndCount()
            .then(async ([items, totalItems]) => {
            const visibleRoles = [];
            for (const item of items) {
                const canRead = await this.activeUserCanReadRole(ctx, item);
                if (canRead) {
                    visibleRoles.push(item);
                }
            }
            return {
                items: visibleRoles,
                totalItems,
            };
        });
    }
    findOne(ctx, roleId, relations) {
        return this.connection
            .getRepository(ctx, role_entity_1.Role)
            .findOne({
            where: { id: roleId },
            relations: (0, unique_1.unique)([...(relations !== null && relations !== void 0 ? relations : []), 'channels']),
        })
            .then(async (result) => {
            if (result && (await this.activeUserCanReadRole(ctx, result))) {
                return result;
            }
        });
    }
    getChannelsForRole(ctx, roleId) {
        return this.findOne(ctx, roleId).then(role => (role ? role.channels : []));
    }
    /**
     * @description
     * Returns the special SuperAdmin Role, which always exists in Vendure.
     */
    getSuperAdminRole(ctx) {
        return this.getRoleByCode(ctx, shared_constants_1.SUPER_ADMIN_ROLE_CODE).then(role => {
            if (!role) {
                throw new errors_1.InternalServerError('error.super-admin-role-not-found');
            }
            return role;
        });
    }
    /**
     * @description
     * Returns the special Customer Role, which always exists in Vendure.
     */
    getCustomerRole(ctx) {
        return this.getRoleByCode(ctx, shared_constants_1.CUSTOMER_ROLE_CODE).then(role => {
            if (!role) {
                throw new errors_1.InternalServerError('error.customer-role-not-found');
            }
            return role;
        });
    }
    /**
     * @description
     * Returns all the valid Permission values
     */
    getAllPermissions() {
        return Object.values(generated_types_1.Permission);
    }
    /**
     * @description
     * Returns true if the User has the specified permission on that Channel
     */
    async userHasPermissionOnChannel(ctx, channelId, permission) {
        return this.userHasAnyPermissionsOnChannel(ctx, channelId, [permission]);
    }
    /**
     * @description
     * Returns true if the User has any of the specified permissions on that Channel
     */
    async userHasAnyPermissionsOnChannel(ctx, channelId, permissions) {
        const permissionsOnChannel = await this.getActiveUserPermissionsOnChannel(ctx, channelId);
        for (const permission of permissions) {
            if (permissionsOnChannel.includes(permission)) {
                return true;
            }
        }
        return false;
    }
    async activeUserCanReadRole(ctx, role) {
        const permissionsRequired = (0, get_user_channels_permissions_1.getChannelPermissions)([role]);
        for (const channelPermissions of permissionsRequired) {
            const activeUserHasRequiredPermissions = await this.userHasAllPermissionsOnChannel(ctx, channelPermissions.id, channelPermissions.permissions);
            if (!activeUserHasRequiredPermissions) {
                return false;
            }
        }
        return true;
    }
    /**
     * @description
     * Returns true if the User has all the specified permissions on that Channel
     */
    async userHasAllPermissionsOnChannel(ctx, channelId, permissions) {
        const permissionsOnChannel = await this.getActiveUserPermissionsOnChannel(ctx, channelId);
        for (const permission of permissions) {
            if (!permissionsOnChannel.includes(permission)) {
                return false;
            }
        }
        return true;
    }
    async getActiveUserPermissionsOnChannel(ctx, channelId) {
        const { activeUserId } = ctx;
        if (activeUserId == null) {
            return [];
        }
        // For apps with many channels, this is a performance bottleneck as it will be called
        // for each channel in certain code paths such as the GetActiveAdministrator query in the
        // admin ui. Caching the result prevents unbounded quadratic slowdown.
        const userChannels = await this.requestContextCache.get(ctx, `RoleService.getActiveUserPermissionsOnChannel.user(${activeUserId})`, async () => {
            const user = await this.connection.getEntityOrThrow(ctx, user_entity_1.User, activeUserId, {
                relations: ['roles', 'roles.channels'],
            });
            return (0, get_user_channels_permissions_1.getUserChannelsPermissions)(user);
        });
        const channel = userChannels.find(c => (0, utils_1.idsAreEqual)(c.id, channelId));
        if (!channel) {
            return [];
        }
        return channel.permissions;
    }
    async create(ctx, input) {
        this.checkPermissionsAreValid(input.permissions);
        let targetChannels = [];
        if (input.channelIds) {
            targetChannels = await this.getPermittedChannels(ctx, input.channelIds);
        }
        else {
            targetChannels = [ctx.channel];
        }
        await this.checkActiveUserHasSufficientPermissions(ctx, targetChannels, input.permissions);
        const role = await this.createRoleForChannels(ctx, input, targetChannels);
        await this.eventBus.publish(new role_event_1.RoleEvent(ctx, role, 'created', input));
        return role;
    }
    async update(ctx, input) {
        this.checkPermissionsAreValid(input.permissions);
        const role = await this.findOne(ctx, input.id);
        if (!role) {
            throw new errors_1.EntityNotFoundError('Role', input.id);
        }
        if (role.code === shared_constants_1.SUPER_ADMIN_ROLE_CODE || role.code === shared_constants_1.CUSTOMER_ROLE_CODE) {
            throw new errors_1.InternalServerError('error.cannot-modify-role', { roleCode: role.code });
        }
        const targetChannels = input.channelIds
            ? await this.getPermittedChannels(ctx, input.channelIds)
            : undefined;
        if (input.permissions) {
            await this.checkActiveUserHasSufficientPermissions(ctx, targetChannels !== null && targetChannels !== void 0 ? targetChannels : role.channels, input.permissions);
        }
        const updatedRole = (0, patch_entity_1.patchEntity)(role, {
            code: input.code,
            description: input.description,
            permissions: input.permissions
                ? (0, unique_1.unique)([generated_types_1.Permission.Authenticated, ...input.permissions])
                : undefined,
        });
        if (targetChannels) {
            updatedRole.channels = targetChannels;
        }
        await this.connection.getRepository(ctx, role_entity_1.Role).save(updatedRole, { reload: false });
        await this.eventBus.publish(new role_event_1.RoleEvent(ctx, role, 'updated', input));
        return await (0, utils_1.assertFound)(this.findOne(ctx, role.id));
    }
    async delete(ctx, id) {
        const role = await this.findOne(ctx, id);
        if (!role) {
            throw new errors_1.EntityNotFoundError('Role', id);
        }
        if (role.code === shared_constants_1.SUPER_ADMIN_ROLE_CODE || role.code === shared_constants_1.CUSTOMER_ROLE_CODE) {
            throw new errors_1.InternalServerError('error.cannot-delete-role', { roleCode: role.code });
        }
        const deletedRole = new role_entity_1.Role(role);
        await this.connection.getRepository(ctx, role_entity_1.Role).remove(role);
        await this.eventBus.publish(new role_event_1.RoleEvent(ctx, deletedRole, 'deleted', id));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    async assignRoleToChannel(ctx, roleId, channelId) {
        await this.channelService.assignToChannels(ctx, role_entity_1.Role, roleId, [channelId]);
    }
    async getPermittedChannels(ctx, channelIds) {
        let permittedChannels = [];
        for (const channelId of channelIds) {
            const channel = await this.connection.getEntityOrThrow(ctx, channel_entity_1.Channel, channelId);
            const hasPermission = await this.userHasPermissionOnChannel(ctx, channelId, generated_types_1.Permission.CreateAdministrator);
            if (!hasPermission) {
                throw new errors_1.ForbiddenError();
            }
            permittedChannels = [...permittedChannels, channel];
        }
        return permittedChannels;
    }
    checkPermissionsAreValid(permissions) {
        if (!permissions) {
            return;
        }
        const allAssignablePermissions = this.getAllAssignablePermissions();
        for (const permission of permissions) {
            if (!allAssignablePermissions.includes(permission) || permission === generated_types_1.Permission.SuperAdmin) {
                throw new errors_1.UserInputError('error.permission-invalid', { permission });
            }
        }
    }
    /**
     * @description
     * Checks that the active User has sufficient Permissions on the target Channels to create
     * a Role with the given Permissions. The rule is that an Administrator may only grant
     * Permissions that they themselves already possess.
     */
    async checkActiveUserHasSufficientPermissions(ctx, targetChannels, permissions) {
        const permissionsRequired = (0, get_user_channels_permissions_1.getChannelPermissions)([
            new role_entity_1.Role({
                permissions: (0, unique_1.unique)([generated_types_1.Permission.Authenticated, ...permissions]),
                channels: targetChannels,
            }),
        ]);
        for (const channelPermissions of permissionsRequired) {
            const activeUserHasRequiredPermissions = await this.userHasAllPermissionsOnChannel(ctx, channelPermissions.id, channelPermissions.permissions);
            if (!activeUserHasRequiredPermissions) {
                throw new errors_1.UserInputError('error.active-user-does-not-have-sufficient-permissions');
            }
        }
    }
    getRoleByCode(ctx, code) {
        const repository = ctx
            ? this.connection.getRepository(ctx, role_entity_1.Role)
            : this.connection.rawConnection.getRepository(role_entity_1.Role);
        return repository.findOne({
            where: { code },
        });
    }
    /**
     * Ensure that the SuperAdmin role exists and that it has all possible Permissions.
     */
    async ensureSuperAdminRoleExists() {
        const assignablePermissions = this.getAllAssignablePermissions();
        try {
            const superAdminRole = await this.getSuperAdminRole();
            superAdminRole.permissions = assignablePermissions;
            await this.connection.rawConnection.getRepository(role_entity_1.Role).save(superAdminRole, { reload: false });
        }
        catch (err) {
            const defaultChannel = await this.channelService.getDefaultChannel();
            await this.createRoleForChannels(request_context_1.RequestContext.empty(), {
                code: shared_constants_1.SUPER_ADMIN_ROLE_CODE,
                description: shared_constants_1.SUPER_ADMIN_ROLE_DESCRIPTION,
                permissions: assignablePermissions,
            }, [defaultChannel]);
        }
    }
    /**
     * The Customer Role is a special case which must always exist.
     */
    async ensureCustomerRoleExists() {
        try {
            await this.getCustomerRole();
        }
        catch (err) {
            const defaultChannel = await this.channelService.getDefaultChannel();
            await this.createRoleForChannels(request_context_1.RequestContext.empty(), {
                code: shared_constants_1.CUSTOMER_ROLE_CODE,
                description: shared_constants_1.CUSTOMER_ROLE_DESCRIPTION,
                permissions: [generated_types_1.Permission.Authenticated],
            }, [defaultChannel]);
        }
    }
    /**
     * Since custom permissions can be added and removed by config, there may exist one or more Roles with
     * invalid permissions (i.e. permissions that were set previously to a custom permission, which has been
     * subsequently removed from config). This method should run on startup to ensure that any such invalid
     * permissions are removed from those Roles.
     */
    async ensureRolesHaveValidPermissions() {
        const roles = await this.connection.rawConnection.getRepository(role_entity_1.Role).find();
        const assignablePermissions = this.getAllAssignablePermissions();
        for (const role of roles) {
            const invalidPermissions = role.permissions.filter(p => !assignablePermissions.includes(p));
            if (invalidPermissions.length) {
                role.permissions = role.permissions.filter(p => assignablePermissions.includes(p));
                await this.connection.rawConnection.getRepository(role_entity_1.Role).save(role);
            }
        }
    }
    createRoleForChannels(ctx, input, channels) {
        const role = new role_entity_1.Role({
            code: input.code,
            description: input.description,
            permissions: (0, unique_1.unique)([generated_types_1.Permission.Authenticated, ...input.permissions]),
        });
        role.channels = channels;
        return this.connection.getRepository(ctx, role_entity_1.Role).save(role);
    }
    getAllAssignablePermissions() {
        return (0, constants_1.getAllPermissionsMetadata)(this.configService.authOptions.customPermissions)
            .filter(p => p.assignable)
            .map(p => p.name);
    }
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        channel_service_1.ChannelService,
        list_query_builder_1.ListQueryBuilder,
        config_service_1.ConfigService,
        event_bus_1.EventBus,
        request_context_cache_service_1.RequestContextCacheService])
], RoleService);
//# sourceMappingURL=role.service.js.map