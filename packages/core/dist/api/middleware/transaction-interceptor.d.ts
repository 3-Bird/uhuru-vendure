import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RequestContext } from '..';
import { TransactionWrapper } from '../../connection/transaction-wrapper';
import { TransactionalConnection } from '../../connection/transactional-connection';
/**
 * @description
 * Used by the {@link Transaction} decorator to create a transactional query runner
 * and attach it to the RequestContext.
 */
export declare class TransactionInterceptor implements NestInterceptor {
    private connection;
    private transactionWrapper;
    private reflector;
    constructor(
        connection: TransactionalConnection,
        transactionWrapper: TransactionWrapper,
        reflector: Reflector,
    );
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    /**
     * Registers transactional request context associated with execution handler function
     *
     * @param ctx transactional request context
     * @param handler handler function from ExecutionContext
     * @param req Request object
     */
    registerTransactionalContext(ctx: RequestContext, handler: Function, req: any): void;
}
