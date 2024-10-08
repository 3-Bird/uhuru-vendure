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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const errors_1 = require("../../common/error/errors");
const generated_graphql_admin_errors_1 = require("../../common/error/generated-graphql-admin-errors");
const generated_graphql_shop_errors_1 = require("../../common/error/generated-graphql-shop-errors");
const native_authentication_strategy_1 = require("../../config/auth/native-authentication-strategy");
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const external_authentication_method_entity_1 = require("../../entity/authentication-method/external-authentication-method.entity");
const authenticated_session_entity_1 = require("../../entity/session/authenticated-session.entity");
const user_entity_1 = require("../../entity/user/user.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const attempted_login_event_1 = require("../../event-bus/events/attempted-login-event");
const login_event_1 = require("../../event-bus/events/login-event");
const logout_event_1 = require("../../event-bus/events/logout-event");
const session_service_1 = require("./session.service");
/**
 * @description
 * Contains methods relating to {@link Session}, {@link AuthenticatedSession} & {@link AnonymousSession} entities.
 *
 * @docsCategory services
 */
let AuthService = class AuthService {
    constructor(connection, configService, sessionService, eventBus) {
        this.connection = connection;
        this.configService = configService;
        this.sessionService = sessionService;
        this.eventBus = eventBus;
    }
    /**
     * @description
     * Authenticates a user's credentials and if okay, creates a new {@link AuthenticatedSession}.
     */
    async authenticate(ctx, apiType, authenticationMethod, authenticationData) {
        await this.eventBus.publish(new attempted_login_event_1.AttemptedLoginEvent(ctx, authenticationMethod, authenticationMethod === native_authentication_strategy_1.NATIVE_AUTH_STRATEGY_NAME
            ? authenticationData.username
            : undefined));
        const authenticationStrategy = this.getAuthenticationStrategy(apiType, authenticationMethod);
        const authenticateResult = await authenticationStrategy.authenticate(ctx, authenticationData);
        if (typeof authenticateResult === 'string') {
            return new generated_graphql_admin_errors_1.InvalidCredentialsError({ authenticationError: authenticateResult });
        }
        if (!authenticateResult) {
            return new generated_graphql_admin_errors_1.InvalidCredentialsError({ authenticationError: '' });
        }
        return this.createAuthenticatedSessionForUser(ctx, authenticateResult, authenticationStrategy.name);
    }
    async createAuthenticatedSessionForUser(ctx, user, authenticationStrategyName) {
        var _a, _b;
        if (!user.roles || !((_a = user.roles[0]) === null || _a === void 0 ? void 0 : _a.channels)) {
            const userWithRoles = await this.connection
                .getRepository(ctx, user_entity_1.User)
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.roles', 'role')
                .leftJoinAndSelect('role.channels', 'channel')
                .where('user.id = :userId', { userId: user.id })
                .getOne();
            user.roles = (userWithRoles === null || userWithRoles === void 0 ? void 0 : userWithRoles.roles) || [];
        }
        const extAuths = ((_b = user.authenticationMethods) !== null && _b !== void 0 ? _b : []).filter(am => am instanceof external_authentication_method_entity_1.ExternalAuthenticationMethod);
        if (!extAuths.length && this.configService.authOptions.requireVerification && !user.verified) {
            return new generated_graphql_shop_errors_1.NotVerifiedError();
        }
        if (ctx.session && ctx.session.activeOrderId) {
            await this.sessionService.deleteSessionsByActiveOrderId(ctx, ctx.session.activeOrderId);
        }
        user.lastLogin = new Date();
        await this.connection.getRepository(ctx, user_entity_1.User).save(user, { reload: false });
        const session = await this.sessionService.createNewAuthenticatedSession(ctx, user, authenticationStrategyName);
        await this.eventBus.publish(new login_event_1.LoginEvent(ctx, user));
        return session;
    }
    /**
     * @description
     * Verify the provided password against the one we have for the given user. Requires
     * the {@link NativeAuthenticationStrategy} to be configured.
     */
    async verifyUserPassword(ctx, userId, password) {
        const nativeAuthenticationStrategy = this.getAuthenticationStrategy('shop', native_authentication_strategy_1.NATIVE_AUTH_STRATEGY_NAME);
        const passwordMatches = await nativeAuthenticationStrategy.verifyUserPassword(ctx, userId, password);
        if (!passwordMatches) {
            return new generated_graphql_admin_errors_1.InvalidCredentialsError({ authenticationError: '' });
        }
        return true;
    }
    /**
     * @description
     * Deletes all sessions for the user associated with the given session token.
     */
    async destroyAuthenticatedSession(ctx, sessionToken) {
        const session = await this.connection.getRepository(ctx, authenticated_session_entity_1.AuthenticatedSession).findOne({
            where: { token: sessionToken },
            relations: ['user', 'user.authenticationMethods'],
        });
        if (session) {
            const authenticationStrategy = this.getAuthenticationStrategy(ctx.apiType, session.authenticationStrategy);
            if (typeof authenticationStrategy.onLogOut === 'function') {
                await authenticationStrategy.onLogOut(ctx, session.user);
            }
            await this.eventBus.publish(new logout_event_1.LogoutEvent(ctx));
            return this.sessionService.deleteSessionsByUser(ctx, session.user);
        }
    }
    getAuthenticationStrategy(apiType, method) {
        const { authOptions } = this.configService;
        const strategies = apiType === 'admin'
            ? authOptions.adminAuthenticationStrategy
            : authOptions.shopAuthenticationStrategy;
        const match = strategies.find(s => s.name === method);
        if (!match) {
            throw new errors_1.InternalServerError('error.unrecognized-authentication-strategy', { name: method });
        }
        return match;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_service_1.ConfigService,
        session_service_1.SessionService,
        event_bus_1.EventBus])
], AuthService);
//# sourceMappingURL=auth.service.js.map