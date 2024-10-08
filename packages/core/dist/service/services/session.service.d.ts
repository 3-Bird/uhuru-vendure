import { ID } from '@vendure/common/lib/shared-types';
import { EntitySubscriberInterface, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { RequestContext } from '../../api/common/request-context';
import { ConfigService } from '../../config/config.service';
import { CachedSession } from '../../config/session-cache/session-cache-strategy';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Channel } from '../../entity/channel/channel.entity';
import { Order } from '../../entity/order/order.entity';
import { AnonymousSession } from '../../entity/session/anonymous-session.entity';
import { AuthenticatedSession } from '../../entity/session/authenticated-session.entity';
import { User } from '../../entity/user/user.entity';
import { OrderService } from './order.service';
/**
 * @description
 * Contains methods relating to {@link Session} entities.
 *
 * @docsCategory services
 */
export declare class SessionService implements EntitySubscriberInterface {
    private connection;
    private configService;
    private orderService;
    private sessionCacheStrategy;
    private readonly sessionDurationInMs;
    private readonly sessionCacheTimeoutMs;
    constructor(
        connection: TransactionalConnection,
        configService: ConfigService,
        orderService: OrderService,
    );
    /** @internal */
    afterInsert(event: InsertEvent<any>): Promise<any>;
    /** @internal */
    afterRemove(event: RemoveEvent<any>): Promise<any>;
    /** @internal */
    afterUpdate(event: UpdateEvent<any>): Promise<any>;
    private clearSessionCacheOnDataChange;
    /**
     * @description
     * Creates a new {@link AuthenticatedSession}. To be used after successful authentication.
     */
    createNewAuthenticatedSession(
        ctx: RequestContext,
        user: User,
        authenticationStrategyName: string,
    ): Promise<AuthenticatedSession>;
    /**
     * @description
     * Create an {@link AnonymousSession} and caches it using the configured {@link SessionCacheStrategy},
     * and returns the cached session object.
     */
    createAnonymousSession(): Promise<CachedSession>;
    /**
     * @description
     * Returns the cached session object matching the given session token.
     */
    getSessionFromToken(sessionToken: string): Promise<CachedSession | undefined>;
    /**
     * @description
     * Serializes a {@link Session} instance into a simplified plain object suitable for caching.
     */
    serializeSession(session: AuthenticatedSession | AnonymousSession): CachedSession;
    /**
     * If the session cache is taking longer than say 50ms then something is wrong - it is supposed to
     * be very fast after all! So we will return undefined and let the request continue without a cached session.
     */
    private withTimeout;
    /**
     * Looks for a valid session with the given token and returns one if found.
     */
    private findSessionByToken;
    /**
     * @description
     * Sets the `activeOrder` on the given cached session object and updates the cache.
     */
    setActiveOrder(
        ctx: RequestContext,
        serializedSession: CachedSession,
        order: Order,
    ): Promise<CachedSession>;
    /**
     * @description
     * Clears the `activeOrder` on the given cached session object and updates the cache.
     */
    unsetActiveOrder(ctx: RequestContext, serializedSession: CachedSession): Promise<CachedSession>;
    /**
     * @description
     * Sets the `activeChannel` on the given cached session object and updates the cache.
     */
    setActiveChannel(serializedSession: CachedSession, channel: Channel): Promise<CachedSession>;
    /**
     * @description
     * Deletes all existing sessions for the given user.
     */
    deleteSessionsByUser(ctx: RequestContext, user: User): Promise<void>;
    /**
     * @description
     * Deletes all existing sessions with the given activeOrder.
     */
    deleteSessionsByActiveOrderId(ctx: RequestContext, activeOrderId: ID): Promise<void>;
    /**
     * If we are over half way to the current session's expiry date, then we update it.
     *
     * This ensures that the session will not expire when in active use, but prevents us from
     * needing to run an update query on *every* request.
     */
    private updateSessionExpiry;
    /**
     * Returns a future expiry date according timeToExpireInMs in the future.
     */
    private getExpiryDate;
    /**
     * Generates a random session token.
     */
    private generateSessionToken;
    private isAuthenticatedSession;
}
