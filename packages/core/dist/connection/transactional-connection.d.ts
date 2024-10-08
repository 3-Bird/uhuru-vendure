import { ID, Type } from '@vendure/common/lib/shared-types';
import {
    DataSource,
    EntitySchema,
    FindManyOptions,
    FindOneOptions,
    ObjectLiteral,
    ObjectType,
    Repository,
} from 'typeorm';
import { RequestContext } from '../api/common/request-context';
import { TransactionIsolationLevel } from '../api/decorators/transaction.decorator';
import { ChannelAware } from '../common/types/common-types';
import { VendureEntity } from '../entity/base/base.entity';
import { TransactionWrapper } from './transaction-wrapper';
import { GetEntityOrThrowOptions } from './types';
/**
 * @description
 * The TransactionalConnection is a wrapper around the TypeORM `Connection` object which works in conjunction
 * with the {@link Transaction} decorator to implement per-request transactions. All services which access the
 * database should use this class rather than the raw TypeORM connection, to ensure that db changes can be
 * easily wrapped in transactions when required.
 *
 * The service layer does not need to know about the scope of a transaction, as this is covered at the
 * API by the use of the `Transaction` decorator.
 *
 * @docsCategory data-access
 */
export declare class TransactionalConnection {
    private dataSource;
    private transactionWrapper;
    constructor(dataSource: DataSource, transactionWrapper: TransactionWrapper);
    /**
     * @description
     * The plain TypeORM Connection object. Should be used carefully as any operations
     * performed with this connection will not be performed within any outer
     * transactions.
     */
    get rawConnection(): DataSource;
    /**
     * @description
     * Returns a TypeORM repository. Note that when no RequestContext is supplied, the repository will not
     * be aware of any existing transaction. Therefore, calling this method without supplying a RequestContext
     * is discouraged without a deliberate reason.
     *
     * @deprecated since 1.7.0: Use {@link TransactionalConnection.rawConnection rawConnection.getRepository()} function instead.
     */
    getRepository<Entity extends ObjectLiteral>(
        target: ObjectType<Entity> | EntitySchema<Entity> | string,
    ): Repository<Entity>;
    /**
     * @description
     * Returns a TypeORM repository which is bound to any existing transactions. It is recommended to _always_ pass
     * the RequestContext argument when possible, otherwise the queries will be executed outside of any
     * ongoing transactions which have been started by the {@link Transaction} decorator.
     */
    getRepository<Entity extends ObjectLiteral>(
        ctx: RequestContext | undefined,
        target: ObjectType<Entity> | EntitySchema<Entity> | string,
    ): Repository<Entity>;
    /**
     * @description
     * Allows database operations to be wrapped in a transaction, ensuring that in the event of an error being
     * thrown at any point, the entire transaction will be rolled back and no changes will be saved.
     *
     * In the context of API requests, you should instead use the {@link Transaction} decorator on your resolver or
     * controller method.
     *
     * On the other hand, for code that does not run in the context of a GraphQL/REST request, this method
     * should be used to protect against non-atomic changes to the data which could leave your data in an
     * inconsistent state.
     *
     * Such situations include function processed by the JobQueue or stand-alone scripts which make use
     * of Vendure internal services.
     *
     * If there is already a {@link RequestContext} object available, you should pass it in as the first
     * argument in order to create transactional context as the copy. If not, omit the first argument and an empty
     * RequestContext object will be created, which is then used to propagate the transaction to
     * all inner method calls.
     *
     * @example
     * ```ts
     * private async transferCredit(outerCtx: RequestContext, fromId: ID, toId: ID, amount: number) {
     *   await this.connection.withTransaction(outerCtx, async ctx => {
     *     // Note you must not use `outerCtx` here, instead use `ctx`. Otherwise, this query
     *     // will be executed outside of transaction
     *     await this.giftCardService.updateCustomerCredit(ctx, fromId, -amount);
     *
     *     await this.connection.getRepository(ctx, GiftCard).update(fromId, { transferred: true })
     *
     *     // If some intermediate logic here throws an Error,
     *     // then all DB transactions will be rolled back and neither Customer's
     *     // credit balance will have changed.
     *
     *     await this.giftCardService.updateCustomerCredit(ctx, toId, amount);
     *   })
     * }
     * ```
     *
     * @since 1.3.0
     */
    withTransaction<T>(work: (ctx: RequestContext) => Promise<T>): Promise<T>;
    withTransaction<T>(ctx: RequestContext, work: (ctx: RequestContext) => Promise<T>): Promise<T>;
    /**
     * @description
     * Manually start a transaction if one is not already in progress. This method should be used in
     * conjunction with the `'manual'` mode of the {@link Transaction} decorator.
     */
    startTransaction(ctx: RequestContext, isolationLevel?: TransactionIsolationLevel): Promise<void>;
    /**
     * @description
     * Manually commits any open transaction. Should be very rarely needed, since the {@link Transaction} decorator
     * and the internal TransactionInterceptor take care of this automatically. Use-cases include situations
     * in which the worker thread needs to access changes made in the current transaction, or when using the
     * Transaction decorator in manual mode.
     */
    commitOpenTransaction(ctx: RequestContext): Promise<void>;
    /**
     * @description
     * Manually rolls back any open transaction. Should be very rarely needed, since the {@link Transaction} decorator
     * and the internal TransactionInterceptor take care of this automatically. Use-cases include when using the
     * Transaction decorator in manual mode.
     */
    rollBackTransaction(ctx: RequestContext): Promise<void>;
    /**
     * @description
     * Finds an entity of the given type by ID, or throws an `EntityNotFoundError` if none
     * is found.
     */
    getEntityOrThrow<T extends VendureEntity>(
        ctx: RequestContext,
        entityType: Type<T>,
        id: ID,
        options?: GetEntityOrThrowOptions<T>,
    ): Promise<T>;
    private getEntityOrThrowInternal;
    /**
     * @description
     * Like the TypeOrm `Repository.findOne()` method, but limits the results to
     * the given Channel.
     */
    findOneInChannel<T extends ChannelAware & VendureEntity>(
        ctx: RequestContext,
        entity: Type<T>,
        id: ID,
        channelId: ID,
        options?: FindOneOptions<T>,
    ): Promise<T | undefined>;
    /**
     * @description
     * Like the TypeOrm `Repository.findByIds()` method, but limits the results to
     * the given Channel.
     */
    findByIdsInChannel<T extends ChannelAware | VendureEntity>(
        ctx: RequestContext,
        entity: Type<T>,
        ids: ID[],
        channelId: ID,
        options: FindManyOptions<T>,
    ): Promise<T[]>;
    private getTransactionManager;
}
