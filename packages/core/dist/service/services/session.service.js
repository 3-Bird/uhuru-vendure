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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = __importDefault(require("crypto"));
const ms_1 = __importDefault(require("ms"));
const config_service_1 = require("../../config/config.service");
const transactional_connection_1 = require("../../connection/transactional-connection");
const channel_entity_1 = require("../../entity/channel/channel.entity");
const role_entity_1 = require("../../entity/role/role.entity");
const anonymous_session_entity_1 = require("../../entity/session/anonymous-session.entity");
const authenticated_session_entity_1 = require("../../entity/session/authenticated-session.entity");
const session_entity_1 = require("../../entity/session/session.entity");
const get_user_channels_permissions_1 = require("../helpers/utils/get-user-channels-permissions");
const order_service_1 = require("./order.service");
/**
 * @description
 * Contains methods relating to {@link Session} entities.
 *
 * @docsCategory services
 */
let SessionService = class SessionService {
    constructor(connection, configService, orderService) {
        this.connection = connection;
        this.configService = configService;
        this.orderService = orderService;
        this.sessionCacheTimeoutMs = 50;
        this.sessionCacheStrategy = this.configService.authOptions.sessionCacheStrategy;
        const { sessionDuration } = this.configService.authOptions;
        this.sessionDurationInMs =
            typeof sessionDuration === 'string' ? (0, ms_1.default)(sessionDuration) : sessionDuration;
        // This allows us to register this class as a TypeORM Subscriber while also allowing
        // the injection on dependencies. See https://docs.nestjs.com/techniques/database#subscribers
        this.connection.rawConnection.subscribers.push(this);
    }
    /** @internal */
    async afterInsert(event) {
        await this.clearSessionCacheOnDataChange(event);
    }
    /** @internal */
    async afterRemove(event) {
        await this.clearSessionCacheOnDataChange(event);
    }
    /** @internal */
    async afterUpdate(event) {
        await this.clearSessionCacheOnDataChange(event);
    }
    async clearSessionCacheOnDataChange(event) {
        if (event.entity) {
            // If a Channel or Role changes, potentially all the cached permissions in the
            // session cache will be wrong, so we just clear the entire cache. It should however
            // be a very rare occurrence in normal operation, once initial setup is complete.
            if (event.entity instanceof channel_entity_1.Channel || event.entity instanceof role_entity_1.Role) {
                await this.withTimeout(this.sessionCacheStrategy.clear());
            }
        }
    }
    /**
     * @description
     * Creates a new {@link AuthenticatedSession}. To be used after successful authentication.
     */
    async createNewAuthenticatedSession(ctx, user, authenticationStrategyName) {
        const token = await this.generateSessionToken();
        const guestOrder = ctx.session && ctx.session.activeOrderId
            ? await this.orderService.findOne(ctx, ctx.session.activeOrderId)
            : undefined;
        const existingOrder = await this.orderService.getActiveOrderForUser(ctx, user.id);
        const activeOrder = await this.orderService.mergeOrders(ctx, user, guestOrder, existingOrder);
        const authenticatedSession = await this.connection.getRepository(ctx, authenticated_session_entity_1.AuthenticatedSession).save(new authenticated_session_entity_1.AuthenticatedSession({
            token,
            user,
            activeOrder,
            authenticationStrategy: authenticationStrategyName,
            expires: this.getExpiryDate(this.sessionDurationInMs),
            invalidated: false,
        }));
        await this.withTimeout(this.sessionCacheStrategy.set(this.serializeSession(authenticatedSession)));
        return authenticatedSession;
    }
    /**
     * @description
     * Create an {@link AnonymousSession} and caches it using the configured {@link SessionCacheStrategy},
     * and returns the cached session object.
     */
    async createAnonymousSession() {
        const token = await this.generateSessionToken();
        const session = new anonymous_session_entity_1.AnonymousSession({
            token,
            expires: this.getExpiryDate(this.sessionDurationInMs),
            invalidated: false,
        });
        // save the new session
        const newSession = await this.connection.rawConnection.getRepository(anonymous_session_entity_1.AnonymousSession).save(session);
        const serializedSession = this.serializeSession(newSession);
        await this.withTimeout(this.sessionCacheStrategy.set(serializedSession));
        return serializedSession;
    }
    /**
     * @description
     * Returns the cached session object matching the given session token.
     */
    async getSessionFromToken(sessionToken) {
        let serializedSession = await this.withTimeout(this.sessionCacheStrategy.get(sessionToken));
        const stale = !!(serializedSession && serializedSession.cacheExpiry < new Date().getTime() / 1000);
        const expired = !!(serializedSession && serializedSession.expires < new Date());
        if (!serializedSession || stale || expired) {
            const session = await this.findSessionByToken(sessionToken);
            if (session) {
                serializedSession = this.serializeSession(session);
                await this.withTimeout(this.sessionCacheStrategy.set(serializedSession));
                return serializedSession;
            }
            else {
                return;
            }
        }
        return serializedSession;
    }
    /**
     * @description
     * Serializes a {@link Session} instance into a simplified plain object suitable for caching.
     */
    serializeSession(session) {
        const expiry = Math.floor(new Date().getTime() / 1000) + this.configService.authOptions.sessionCacheTTL;
        const serializedSession = {
            cacheExpiry: expiry,
            id: session.id,
            token: session.token,
            expires: session.expires,
            activeOrderId: session.activeOrderId,
            activeChannelId: session.activeChannelId,
        };
        if (this.isAuthenticatedSession(session)) {
            serializedSession.authenticationStrategy = session.authenticationStrategy;
            const { user } = session;
            serializedSession.user = {
                id: user.id,
                identifier: user.identifier,
                verified: user.verified,
                channelPermissions: (0, get_user_channels_permissions_1.getUserChannelsPermissions)(user),
            };
        }
        return serializedSession;
    }
    /**
     * If the session cache is taking longer than say 50ms then something is wrong - it is supposed to
     * be very fast after all! So we will return undefined and let the request continue without a cached session.
     */
    withTimeout(maybeSlow) {
        return Promise.race([
            new Promise(resolve => setTimeout(() => resolve(undefined), this.sessionCacheTimeoutMs)),
            maybeSlow,
        ]);
    }
    /**
     * Looks for a valid session with the given token and returns one if found.
     */
    async findSessionByToken(token) {
        const session = await this.connection.rawConnection
            .getRepository(session_entity_1.Session)
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.user', 'user')
            .leftJoinAndSelect('user.roles', 'roles')
            .leftJoinAndSelect('roles.channels', 'channels')
            .where('session.token = :token', { token })
            .andWhere('session.invalidated = false')
            .getOne();
        if (session && session.expires > new Date()) {
            await this.updateSessionExpiry(session);
            return session;
        }
    }
    /**
     * @description
     * Sets the `activeOrder` on the given cached session object and updates the cache.
     */
    async setActiveOrder(ctx, serializedSession, order) {
        const session = await this.connection.getRepository(ctx, session_entity_1.Session).findOne({
            where: { id: serializedSession.id },
            relations: ['user', 'user.roles', 'user.roles.channels'],
        });
        if (session) {
            session.activeOrder = order;
            await this.connection.getRepository(ctx, session_entity_1.Session).save(session, { reload: false });
            const updatedSerializedSession = this.serializeSession(session);
            await this.withTimeout(this.sessionCacheStrategy.set(updatedSerializedSession));
            return updatedSerializedSession;
        }
        return serializedSession;
    }
    /**
     * @description
     * Clears the `activeOrder` on the given cached session object and updates the cache.
     */
    async unsetActiveOrder(ctx, serializedSession) {
        if (serializedSession.activeOrderId) {
            const session = await this.connection.getRepository(ctx, session_entity_1.Session).findOne({
                where: { id: serializedSession.id },
                relations: ['user', 'user.roles', 'user.roles.channels'],
            });
            if (session) {
                session.activeOrder = null;
                await this.connection.getRepository(ctx, session_entity_1.Session).save(session);
                const updatedSerializedSession = this.serializeSession(session);
                await this.configService.authOptions.sessionCacheStrategy.set(updatedSerializedSession);
                return updatedSerializedSession;
            }
        }
        return serializedSession;
    }
    /**
     * @description
     * Sets the `activeChannel` on the given cached session object and updates the cache.
     */
    async setActiveChannel(serializedSession, channel) {
        const session = await this.connection.rawConnection.getRepository(session_entity_1.Session).findOne({
            where: { id: serializedSession.id },
            relations: ['user', 'user.roles', 'user.roles.channels'],
        });
        if (session) {
            session.activeChannel = channel;
            await this.connection.rawConnection.getRepository(session_entity_1.Session).save(session, { reload: false });
            const updatedSerializedSession = this.serializeSession(session);
            await this.withTimeout(this.sessionCacheStrategy.set(updatedSerializedSession));
            return updatedSerializedSession;
        }
        return serializedSession;
    }
    /**
     * @description
     * Deletes all existing sessions for the given user.
     */
    async deleteSessionsByUser(ctx, user) {
        const userSessions = await this.connection
            .getRepository(ctx, authenticated_session_entity_1.AuthenticatedSession)
            .find({ where: { user: { id: user.id } } });
        await this.connection.getRepository(ctx, authenticated_session_entity_1.AuthenticatedSession).remove(userSessions);
        for (const session of userSessions) {
            await this.withTimeout(this.sessionCacheStrategy.delete(session.token));
        }
    }
    /**
     * @description
     * Deletes all existing sessions with the given activeOrder.
     */
    async deleteSessionsByActiveOrderId(ctx, activeOrderId) {
        const sessions = await this.connection.getRepository(ctx, session_entity_1.Session).find({ where: { activeOrderId } });
        await this.connection.getRepository(ctx, session_entity_1.Session).remove(sessions);
        for (const session of sessions) {
            await this.withTimeout(this.sessionCacheStrategy.delete(session.token));
        }
    }
    /**
     * If we are over half way to the current session's expiry date, then we update it.
     *
     * This ensures that the session will not expire when in active use, but prevents us from
     * needing to run an update query on *every* request.
     */
    async updateSessionExpiry(session) {
        const now = new Date().getTime();
        if (session.expires.getTime() - now < this.sessionDurationInMs / 2) {
            const newExpiryDate = this.getExpiryDate(this.sessionDurationInMs);
            session.expires = newExpiryDate;
            await this.connection.rawConnection
                .getRepository(session_entity_1.Session)
                .update({ id: session.id }, { expires: newExpiryDate });
        }
    }
    /**
     * Returns a future expiry date according timeToExpireInMs in the future.
     */
    getExpiryDate(timeToExpireInMs) {
        return new Date(Date.now() + timeToExpireInMs);
    }
    /**
     * Generates a random session token.
     */
    generateSessionToken() {
        return new Promise((resolve, reject) => {
            crypto_1.default.randomBytes(32, (err, buf) => {
                if (err) {
                    reject(err);
                }
                resolve(buf.toString('hex'));
            });
        });
    }
    isAuthenticatedSession(session) {
        return session.hasOwnProperty('user');
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        config_service_1.ConfigService,
        order_service_1.OrderService])
], SessionService);
//# sourceMappingURL=session.service.js.map