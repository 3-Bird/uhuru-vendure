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
exports.AdministratorService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const typeorm_1 = require("typeorm");
const errors_1 = require("../../common/error/errors");
const utils_1 = require("../../common/utils");
const config_1 = require("../../config");
const transactional_connection_1 = require("../../connection/transactional-connection");
const administrator_entity_1 = require("../../entity/administrator/administrator.entity");
const native_authentication_method_entity_1 = require("../../entity/authentication-method/native-authentication-method.entity");
const role_entity_1 = require("../../entity/role/role.entity");
const user_entity_1 = require("../../entity/user/user.entity");
const event_bus_1 = require("../../event-bus");
const administrator_event_1 = require("../../event-bus/events/administrator-event");
const role_change_event_1 = require("../../event-bus/events/role-change-event");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const password_cipher_1 = require("../helpers/password-cipher/password-cipher");
const request_context_service_1 = require("../helpers/request-context/request-context.service");
const get_user_channels_permissions_1 = require("../helpers/utils/get-user-channels-permissions");
const patch_entity_1 = require("../helpers/utils/patch-entity");
const role_service_1 = require("./role.service");
const user_service_1 = require("./user.service");
/**
 * @description
 * Contains methods relating to {@link Administrator} entities.
 *
 * @docsCategory services
 */
let AdministratorService = class AdministratorService {
    constructor(connection, configService, listQueryBuilder, passwordCipher, userService, roleService, customFieldRelationService, eventBus, requestContextService) {
        this.connection = connection;
        this.configService = configService;
        this.listQueryBuilder = listQueryBuilder;
        this.passwordCipher = passwordCipher;
        this.userService = userService;
        this.roleService = roleService;
        this.customFieldRelationService = customFieldRelationService;
        this.eventBus = eventBus;
        this.requestContextService = requestContextService;
    }
    /** @internal */
    async initAdministrators() {
        await this.ensureSuperAdminExists();
    }
    /**
     * @description
     * Get a paginated list of Administrators.
     */
    findAll(ctx, options, relations) {
        return this.listQueryBuilder
            .build(administrator_entity_1.Administrator, options, {
            relations: relations !== null && relations !== void 0 ? relations : ['user', 'user.roles'],
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            ctx,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    /**
     * @description
     * Get an Administrator by id.
     */
    findOne(ctx, administratorId, relations) {
        return this.connection
            .getRepository(ctx, administrator_entity_1.Administrator)
            .findOne({
            relations: relations !== null && relations !== void 0 ? relations : ['user', 'user.roles'],
            where: {
                id: administratorId,
                deletedAt: (0, typeorm_1.IsNull)(),
            },
        })
            .then(result => result !== null && result !== void 0 ? result : undefined);
    }
    /**
     * @description
     * Get an Administrator based on the User id.
     */
    findOneByUserId(ctx, userId, relations) {
        return this.connection
            .getRepository(ctx, administrator_entity_1.Administrator)
            .findOne({
            relations,
            where: {
                user: { id: userId },
                deletedAt: (0, typeorm_1.IsNull)(),
            },
        })
            .then(result => result !== null && result !== void 0 ? result : undefined);
    }
    /**
     * @description
     * Create a new Administrator.
     */
    async create(ctx, input) {
        await this.checkActiveUserCanGrantRoles(ctx, input.roleIds);
        const administrator = new administrator_entity_1.Administrator(input);
        administrator.emailAddress = (0, utils_1.normalizeEmailAddress)(input.emailAddress);
        administrator.user = await this.userService.createAdminUser(ctx, input.emailAddress, input.password);
        let createdAdministrator = await this.connection
            .getRepository(ctx, administrator_entity_1.Administrator)
            .save(administrator);
        for (const roleId of input.roleIds) {
            createdAdministrator = await this.assignRole(ctx, createdAdministrator.id, roleId);
        }
        await this.customFieldRelationService.updateRelations(ctx, administrator_entity_1.Administrator, input, createdAdministrator);
        await this.eventBus.publish(new administrator_event_1.AdministratorEvent(ctx, createdAdministrator, 'created', input));
        return createdAdministrator;
    }
    /**
     * @description
     * Update an existing Administrator.
     */
    async update(ctx, input) {
        const administrator = await this.findOne(ctx, input.id);
        if (!administrator) {
            throw new errors_1.EntityNotFoundError('Administrator', input.id);
        }
        if (input.roleIds) {
            await this.checkActiveUserCanGrantRoles(ctx, input.roleIds);
        }
        let updatedAdministrator = (0, patch_entity_1.patchEntity)(administrator, input);
        await this.connection.getRepository(ctx, administrator_entity_1.Administrator).save(administrator, { reload: false });
        if (input.emailAddress) {
            updatedAdministrator.user.identifier = input.emailAddress;
            await this.connection.getRepository(ctx, user_entity_1.User).save(updatedAdministrator.user);
        }
        if (input.password) {
            const user = await this.userService.getUserById(ctx, administrator.user.id);
            if (user) {
                const nativeAuthMethod = user.getNativeAuthenticationMethod();
                nativeAuthMethod.passwordHash = await this.passwordCipher.hash(input.password);
                await this.connection.getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod).save(nativeAuthMethod);
            }
        }
        if (input.roleIds) {
            const isSoleSuperAdmin = await this.isSoleSuperadmin(ctx, input.id);
            if (isSoleSuperAdmin) {
                const superAdminRole = await this.roleService.getSuperAdminRole(ctx);
                if (!input.roleIds.find(id => (0, utils_1.idsAreEqual)(id, superAdminRole.id))) {
                    throw new errors_1.InternalServerError('error.superadmin-must-have-superadmin-role');
                }
            }
            const removeIds = administrator.user.roles
                .map(role => role.id)
                .filter(roleId => input.roleIds.indexOf(roleId) === -1);
            const addIds = input.roleIds.filter(roleId => !administrator.user.roles.some(role => role.id === roleId));
            administrator.user.roles = [];
            await this.connection.getRepository(ctx, user_entity_1.User).save(administrator.user, { reload: false });
            for (const roleId of input.roleIds) {
                updatedAdministrator = await this.assignRole(ctx, administrator.id, roleId);
            }
            await this.eventBus.publish(new role_change_event_1.RoleChangeEvent(ctx, administrator, addIds, 'assigned'));
            await this.eventBus.publish(new role_change_event_1.RoleChangeEvent(ctx, administrator, removeIds, 'removed'));
        }
        await this.customFieldRelationService.updateRelations(ctx, administrator_entity_1.Administrator, input, updatedAdministrator);
        await this.eventBus.publish(new administrator_event_1.AdministratorEvent(ctx, administrator, 'updated', input));
        return updatedAdministrator;
    }
    /**
     * @description
     * Checks that the active user is allowed to grant the specified Roles when creating or
     * updating an Administrator.
     */
    async checkActiveUserCanGrantRoles(ctx, roleIds) {
        const roles = await this.connection.getRepository(ctx, role_entity_1.Role).find({
            where: { id: (0, typeorm_1.In)(roleIds) },
            relations: { channels: true },
        });
        const permissionsRequired = (0, get_user_channels_permissions_1.getChannelPermissions)(roles);
        for (const channelPermissions of permissionsRequired) {
            const activeUserHasRequiredPermissions = await this.roleService.userHasAllPermissionsOnChannel(ctx, channelPermissions.id, channelPermissions.permissions);
            if (!activeUserHasRequiredPermissions) {
                throw new errors_1.UserInputError('error.active-user-does-not-have-sufficient-permissions');
            }
        }
    }
    /**
     * @description
     * Assigns a Role to the Administrator's User entity.
     */
    async assignRole(ctx, administratorId, roleId) {
        const administrator = await this.findOne(ctx, administratorId);
        if (!administrator) {
            throw new errors_1.EntityNotFoundError('Administrator', administratorId);
        }
        const role = await this.roleService.findOne(ctx, roleId);
        if (!role) {
            throw new errors_1.EntityNotFoundError('Role', roleId);
        }
        administrator.user.roles.push(role);
        await this.connection.getRepository(ctx, user_entity_1.User).save(administrator.user, { reload: false });
        return administrator;
    }
    /**
     * @description
     * Soft deletes an Administrator (sets the `deletedAt` field).
     */
    async softDelete(ctx, id) {
        const administrator = await this.connection.getEntityOrThrow(ctx, administrator_entity_1.Administrator, id, {
            relations: ['user'],
        });
        const isSoleSuperadmin = await this.isSoleSuperadmin(ctx, id);
        if (isSoleSuperadmin) {
            throw new errors_1.InternalServerError('error.cannot-delete-sole-superadmin');
        }
        await this.connection.getRepository(ctx, administrator_entity_1.Administrator).update({ id }, { deletedAt: new Date() });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await this.userService.softDelete(ctx, administrator.user.id);
        await this.eventBus.publish(new administrator_event_1.AdministratorEvent(ctx, administrator, 'deleted', id));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    /**
     * @description
     * Resolves to `true` if the administrator ID belongs to the only Administrator
     * with SuperAdmin permissions.
     */
    async isSoleSuperadmin(ctx, id) {
        const superAdminRole = await this.roleService.getSuperAdminRole(ctx);
        const allAdmins = await this.connection.getRepository(ctx, administrator_entity_1.Administrator).find({
            relations: ['user', 'user.roles'],
        });
        const superAdmins = allAdmins.filter(admin => !!admin.user.roles.find(r => r.id === superAdminRole.id));
        if (1 < superAdmins.length) {
            return false;
        }
        else {
            return (0, utils_1.idsAreEqual)(superAdmins[0].id, id);
        }
    }
    /**
     * @description
     * There must always exist a SuperAdmin, otherwise full administration via API will
     * no longer be possible.
     *
     * @internal
     */
    async ensureSuperAdminExists() {
        const { superadminCredentials } = this.configService.authOptions;
        const superAdminUser = await this.connection.rawConnection.getRepository(user_entity_1.User).findOne({
            where: {
                identifier: superadminCredentials.identifier,
            },
        });
        if (!superAdminUser) {
            const ctx = await this.requestContextService.create({ apiType: 'admin' });
            const superAdminRole = await this.roleService.getSuperAdminRole();
            const administrator = new administrator_entity_1.Administrator({
                emailAddress: superadminCredentials.identifier,
                firstName: 'Super',
                lastName: 'Admin',
            });
            administrator.user = await this.userService.createAdminUser(ctx, superadminCredentials.identifier, superadminCredentials.password);
            const { id } = await this.connection.getRepository(ctx, administrator_entity_1.Administrator).save(administrator);
            const createdAdministrator = await (0, utils_1.assertFound)(this.findOne(ctx, id));
            createdAdministrator.user.roles.push(superAdminRole);
            await this.connection.getRepository(ctx, user_entity_1.User).save(createdAdministrator.user, { reload: false });
        }
        else {
            const superAdministrator = await this.connection.rawConnection
                .getRepository(administrator_entity_1.Administrator)
                .findOne({
                where: {
                    user: {
                        id: superAdminUser.id,
                    },
                },
            });
            if (!superAdministrator) {
                const administrator = new administrator_entity_1.Administrator({
                    emailAddress: superadminCredentials.identifier,
                    firstName: 'Super',
                    lastName: 'Admin',
                });
                const createdAdministrator = await this.connection.rawConnection
                    .getRepository(administrator_entity_1.Administrator)
                    .save(administrator);
                createdAdministrator.user = superAdminUser;
                await this.connection.rawConnection.getRepository(administrator_entity_1.Administrator).save(createdAdministrator);
            }
            else if (superAdministrator.deletedAt != null) {
                superAdministrator.deletedAt = null;
                await this.connection.rawConnection.getRepository(administrator_entity_1.Administrator).save(superAdministrator);
            }
            if (superAdminUser.deletedAt != null) {
                superAdminUser.deletedAt = null;
                await this.connection.rawConnection.getRepository(user_entity_1.User).save(superAdminUser);
            }
        }
    }
};
exports.AdministratorService = AdministratorService;
exports.AdministratorService = AdministratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_1.ConfigService,
        list_query_builder_1.ListQueryBuilder,
        password_cipher_1.PasswordCipher,
        user_service_1.UserService,
        role_service_1.RoleService,
        custom_field_relation_service_1.CustomFieldRelationService,
        event_bus_1.EventBus,
        request_context_service_1.RequestContextService])
], AdministratorService);
//# sourceMappingURL=administrator.service.js.map