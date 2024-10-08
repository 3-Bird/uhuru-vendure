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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const error_result_1 = require("../../common/error/error-result");
const errors_1 = require("../../common/error/errors");
const generated_graphql_shop_errors_1 = require("../../common/error/generated-graphql-shop-errors");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const native_authentication_method_entity_1 = require("../../entity/authentication-method/native-authentication-method.entity");
const user_entity_1 = require("../../entity/user/user.entity");
const password_cipher_1 = require("../helpers/password-cipher/password-cipher");
const verification_token_generator_1 = require("../helpers/verification-token-generator/verification-token-generator");
const role_service_1 = require("./role.service");
/**
 * @description
 * Contains methods relating to {@link User} entities.
 *
 * @docsCategory services
 */
let UserService = class UserService {
    constructor(connection, configService, roleService, passwordCipher, verificationTokenGenerator, moduleRef) {
        this.connection = connection;
        this.configService = configService;
        this.roleService = roleService;
        this.passwordCipher = passwordCipher;
        this.verificationTokenGenerator = verificationTokenGenerator;
        this.moduleRef = moduleRef;
    }
    async getUserById(ctx, userId) {
        return this.connection
            .getRepository(ctx, user_entity_1.User)
            .findOne({
            where: { id: userId },
            relations: {
                roles: {
                    channels: true,
                },
                authenticationMethods: true,
            },
        })
            .then(result => result !== null && result !== void 0 ? result : undefined);
    }
    async getUserByEmailAddress(ctx, emailAddress, userType) {
        var _a;
        const entity = userType !== null && userType !== void 0 ? userType : (ctx.apiType === 'admin' ? 'administrator' : 'customer');
        const table = `${(_a = this.configService.dbConnectionOptions.entityPrefix) !== null && _a !== void 0 ? _a : ''}${entity}`;
        const qb = this.connection
            .getRepository(ctx, user_entity_1.User)
            .createQueryBuilder('user')
            .innerJoin(table, table, `${table}.userId = user.id`)
            .leftJoinAndSelect('user.roles', 'roles')
            .leftJoinAndSelect('roles.channels', 'channels')
            .leftJoinAndSelect('user.authenticationMethods', 'authenticationMethods')
            .where('user.deletedAt IS NULL');
        if ((0, utils_1.isEmailAddressLike)(emailAddress)) {
            qb.andWhere('LOWER(user.identifier) = :identifier', {
                identifier: (0, utils_1.normalizeEmailAddress)(emailAddress),
            });
        }
        else {
            qb.andWhere('user.identifier = :identifier', {
                identifier: emailAddress,
            });
        }
        return qb.getOne().then(result => result !== null && result !== void 0 ? result : undefined);
    }
    /**
     * @description
     * Creates a new User with the special `customer` Role and using the {@link NativeAuthenticationStrategy}.
     */
    async createCustomerUser(ctx, identifier, password) {
        const user = new user_entity_1.User();
        user.identifier = (0, utils_1.normalizeEmailAddress)(identifier);
        const customerRole = await this.roleService.getCustomerRole(ctx);
        user.roles = [customerRole];
        const addNativeAuthResult = await this.addNativeAuthenticationMethod(ctx, user, identifier, password);
        if ((0, error_result_1.isGraphQlErrorResult)(addNativeAuthResult)) {
            return addNativeAuthResult;
        }
        return this.connection.getRepository(ctx, user_entity_1.User).save(addNativeAuthResult);
    }
    /**
     * @description
     * Adds a new {@link NativeAuthenticationMethod} to the User. If the {@link AuthOptions} `requireVerification`
     * is set to `true` (as is the default), the User will be marked as unverified until the email verification
     * flow is completed.
     */
    async addNativeAuthenticationMethod(ctx, user, identifier, password) {
        var _a;
        const checkUser = user.id != null && (await this.getUserById(ctx, user.id));
        if (checkUser) {
            if (!!checkUser.authenticationMethods.find((m) => m instanceof native_authentication_method_entity_1.NativeAuthenticationMethod)) {
                // User already has a NativeAuthenticationMethod registered, so just return.
                return user;
            }
        }
        const authenticationMethod = new native_authentication_method_entity_1.NativeAuthenticationMethod();
        if (this.configService.authOptions.requireVerification) {
            authenticationMethod.verificationToken =
                this.verificationTokenGenerator.generateVerificationToken();
            user.verified = false;
        }
        else {
            user.verified = true;
        }
        if (password) {
            const passwordValidationResult = await this.validatePassword(ctx, password);
            if (passwordValidationResult !== true) {
                return passwordValidationResult;
            }
            authenticationMethod.passwordHash = await this.passwordCipher.hash(password);
        }
        else {
            authenticationMethod.passwordHash = '';
        }
        authenticationMethod.identifier = (0, utils_1.normalizeEmailAddress)(identifier);
        authenticationMethod.user = user;
        await this.connection.getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod).save(authenticationMethod);
        user.authenticationMethods = [...((_a = user.authenticationMethods) !== null && _a !== void 0 ? _a : []), authenticationMethod];
        return user;
    }
    /**
     * @description
     * Creates a new verified User using the {@link NativeAuthenticationStrategy}.
     */
    async createAdminUser(ctx, identifier, password) {
        const user = new user_entity_1.User({
            identifier: (0, utils_1.normalizeEmailAddress)(identifier),
            verified: true,
        });
        const authenticationMethod = await this.connection
            .getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod)
            .save(new native_authentication_method_entity_1.NativeAuthenticationMethod({
            identifier: (0, utils_1.normalizeEmailAddress)(identifier),
            passwordHash: await this.passwordCipher.hash(password),
        }));
        user.authenticationMethods = [authenticationMethod];
        return this.connection.getRepository(ctx, user_entity_1.User).save(user);
    }
    async softDelete(ctx, userId) {
        // Dynamic import to avoid the circular dependency of SessionService
        await this.moduleRef
            .get((await import('./session.service.js')).SessionService)
            .deleteSessionsByUser(ctx, new user_entity_1.User({ id: userId }));
        await this.connection.getEntityOrThrow(ctx, user_entity_1.User, userId);
        await this.connection.getRepository(ctx, user_entity_1.User).update({ id: userId }, { deletedAt: new Date() });
    }
    /**
     * @description
     * Sets the {@link NativeAuthenticationMethod} `verificationToken` as part of the User email verification
     * flow.
     */
    async setVerificationToken(ctx, user) {
        const nativeAuthMethod = user.getNativeAuthenticationMethod();
        nativeAuthMethod.verificationToken = this.verificationTokenGenerator.generateVerificationToken();
        user.verified = false;
        await this.connection.getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod).save(nativeAuthMethod);
        return this.connection.getRepository(ctx, user_entity_1.User).save(user);
    }
    /**
     * @description
     * Verifies a verificationToken by looking for a User which has previously had it set using the
     * `setVerificationToken()` method, and checks that the token is valid and has not expired.
     *
     * If valid, the User will be set to `verified: true`.
     */
    async verifyUserByToken(ctx, verificationToken, password) {
        const user = await this.connection
            .getRepository(ctx, user_entity_1.User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.authenticationMethods', 'aums')
            .leftJoin('user.authenticationMethods', 'authenticationMethod')
            .addSelect('aums.passwordHash')
            .where('authenticationMethod.verificationToken = :verificationToken', { verificationToken })
            .getOne();
        if (user) {
            if (this.verificationTokenGenerator.verifyVerificationToken(verificationToken)) {
                const nativeAuthMethod = user.getNativeAuthenticationMethod();
                if (!password) {
                    if (!nativeAuthMethod.passwordHash) {
                        return new generated_graphql_shop_errors_1.MissingPasswordError();
                    }
                }
                else {
                    if (!!nativeAuthMethod.passwordHash) {
                        return new generated_graphql_shop_errors_1.PasswordAlreadySetError();
                    }
                    const passwordValidationResult = await this.validatePassword(ctx, password);
                    if (passwordValidationResult !== true) {
                        return passwordValidationResult;
                    }
                    nativeAuthMethod.passwordHash = await this.passwordCipher.hash(password);
                }
                nativeAuthMethod.verificationToken = null;
                user.verified = true;
                await this.connection.getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod).save(nativeAuthMethod);
                return this.connection.getRepository(ctx, user_entity_1.User).save(user);
            }
            else {
                return new generated_graphql_shop_errors_1.VerificationTokenExpiredError();
            }
        }
        else {
            return new generated_graphql_shop_errors_1.VerificationTokenInvalidError();
        }
    }
    /**
     * @description
     * Sets the {@link NativeAuthenticationMethod} `passwordResetToken` as part of the User password reset
     * flow.
     */
    async setPasswordResetToken(ctx, emailAddress) {
        const user = await this.getUserByEmailAddress(ctx, emailAddress);
        if (!user) {
            return;
        }
        const nativeAuthMethod = user.getNativeAuthenticationMethod(false);
        if (!nativeAuthMethod) {
            return undefined;
        }
        nativeAuthMethod.passwordResetToken = this.verificationTokenGenerator.generateVerificationToken();
        await this.connection.getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod).save(nativeAuthMethod);
        return user;
    }
    /**
     * @description
     * Verifies a passwordResetToken by looking for a User which has previously had it set using the
     * `setPasswordResetToken()` method, and checks that the token is valid and has not expired.
     *
     * If valid, the User's credentials will be updated with the new password.
     */
    async resetPasswordByToken(ctx, passwordResetToken, password) {
        const user = await this.connection
            .getRepository(ctx, user_entity_1.User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.authenticationMethods', 'aums')
            .leftJoin('user.authenticationMethods', 'authenticationMethod')
            .where('authenticationMethod.passwordResetToken = :passwordResetToken', { passwordResetToken })
            .getOne();
        if (!user) {
            return new generated_graphql_shop_errors_1.PasswordResetTokenInvalidError();
        }
        const passwordValidationResult = await this.validatePassword(ctx, password);
        if (passwordValidationResult !== true) {
            return passwordValidationResult;
        }
        if (this.verificationTokenGenerator.verifyVerificationToken(passwordResetToken)) {
            const nativeAuthMethod = user.getNativeAuthenticationMethod();
            nativeAuthMethod.passwordHash = await this.passwordCipher.hash(password);
            nativeAuthMethod.passwordResetToken = null;
            await this.connection.getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod).save(nativeAuthMethod);
            if (user.verified === false && this.configService.authOptions.requireVerification) {
                // This code path represents an edge-case in which the Customer creates an account,
                // but prior to verifying their email address, they start the password reset flow.
                // Since the password reset flow makes the exact same guarantee as the email verification
                // flow (i.e. the person controls the specified email account), we can also consider it
                // a verification.
                user.verified = true;
            }
            return this.connection.getRepository(ctx, user_entity_1.User).save(user);
        }
        else {
            return new generated_graphql_shop_errors_1.PasswordResetTokenExpiredError();
        }
    }
    /**
     * @description
     * Changes the User identifier without an email verification step, so this should be only used when
     * an Administrator is setting a new email address.
     */
    async changeUserAndNativeIdentifier(ctx, userId, newIdentifier) {
        const user = await this.getUserById(ctx, userId);
        if (!user) {
            return;
        }
        const nativeAuthMethod = user.authenticationMethods.find((m) => m instanceof native_authentication_method_entity_1.NativeAuthenticationMethod);
        if (nativeAuthMethod) {
            nativeAuthMethod.identifier = newIdentifier;
            nativeAuthMethod.identifierChangeToken = null;
            nativeAuthMethod.pendingIdentifier = null;
            await this.connection
                .getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod)
                .save(nativeAuthMethod, { reload: false });
        }
        user.identifier = newIdentifier;
        await this.connection.getRepository(ctx, user_entity_1.User).save(user, { reload: false });
    }
    /**
     * @description
     * Sets the {@link NativeAuthenticationMethod} `identifierChangeToken` as part of the User email address change
     * flow.
     */
    async setIdentifierChangeToken(ctx, user) {
        const nativeAuthMethod = user.getNativeAuthenticationMethod();
        nativeAuthMethod.identifierChangeToken = this.verificationTokenGenerator.generateVerificationToken();
        await this.connection.getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod).save(nativeAuthMethod);
        return user;
    }
    /**
     * @description
     * Changes the User identifier as part of the storefront flow used by Customers to set a
     * new email address, with the token previously set using the `setIdentifierChangeToken()` method.
     */
    async changeIdentifierByToken(ctx, token) {
        const user = await this.connection
            .getRepository(ctx, user_entity_1.User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.authenticationMethods', 'aums')
            .leftJoin('user.authenticationMethods', 'authenticationMethod')
            .where('authenticationMethod.identifierChangeToken = :identifierChangeToken', {
            identifierChangeToken: token,
        })
            .getOne();
        if (!user) {
            return new generated_graphql_shop_errors_1.IdentifierChangeTokenInvalidError();
        }
        if (!this.verificationTokenGenerator.verifyVerificationToken(token)) {
            return new generated_graphql_shop_errors_1.IdentifierChangeTokenExpiredError();
        }
        const nativeAuthMethod = user.getNativeAuthenticationMethod();
        const pendingIdentifier = nativeAuthMethod.pendingIdentifier;
        if (!pendingIdentifier) {
            throw new errors_1.InternalServerError('error.pending-identifier-missing');
        }
        const oldIdentifier = user.identifier;
        user.identifier = pendingIdentifier;
        nativeAuthMethod.identifier = pendingIdentifier;
        nativeAuthMethod.identifierChangeToken = null;
        nativeAuthMethod.pendingIdentifier = null;
        await this.connection
            .getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod)
            .save(nativeAuthMethod, { reload: false });
        await this.connection.getRepository(ctx, user_entity_1.User).save(user, { reload: false });
        return { user, oldIdentifier };
    }
    /**
     * @description
     * Updates the password for a User with the {@link NativeAuthenticationMethod}.
     */
    async updatePassword(ctx, userId, currentPassword, newPassword) {
        const user = await this.connection
            .getRepository(ctx, user_entity_1.User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.authenticationMethods', 'authenticationMethods')
            .addSelect('authenticationMethods.passwordHash')
            .where('user.id = :id', { id: userId })
            .getOne();
        if (!user) {
            throw new errors_1.EntityNotFoundError('User', userId);
        }
        const password = newPassword;
        const passwordValidationResult = await this.validatePassword(ctx, password);
        if (passwordValidationResult !== true) {
            return passwordValidationResult;
        }
        const nativeAuthMethod = user.getNativeAuthenticationMethod();
        const matches = await this.passwordCipher.check(currentPassword, nativeAuthMethod.passwordHash);
        if (!matches) {
            return new generated_graphql_shop_errors_1.InvalidCredentialsError({ authenticationError: '' });
        }
        nativeAuthMethod.passwordHash = await this.passwordCipher.hash(newPassword);
        await this.connection
            .getRepository(ctx, native_authentication_method_entity_1.NativeAuthenticationMethod)
            .save(nativeAuthMethod, { reload: false });
        return true;
    }
    async validatePassword(ctx, password) {
        const passwordValidationResult = await this.configService.authOptions.passwordValidationStrategy.validate(ctx, password);
        if (passwordValidationResult !== true) {
            const message = typeof passwordValidationResult === 'string'
                ? passwordValidationResult
                : 'Password is invalid';
            return new generated_graphql_shop_errors_1.PasswordValidationError({ validationErrorMessage: message });
        }
        else {
            return true;
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_service_1.ConfigService,
        role_service_1.RoleService,
        password_cipher_1.PasswordCipher,
        verification_token_generator_1.VerificationTokenGenerator,
        core_1.ModuleRef])
], UserService);
//# sourceMappingURL=user.service.js.map