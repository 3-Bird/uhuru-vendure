import { OnModuleDestroy } from '@nestjs/common';
import { Type } from '@vendure/common/lib/shared-types';
import { Observable } from 'rxjs';
import { TransactionSubscriber } from '../connection/transaction-subscriber';
import { VendureEvent } from './vendure-event';
/**
 * @description
 * Options for registering a blocking event handler.
 *
 * @since 2.2.0
 * @docsCategory events
 */
export type BlockingEventHandlerOptions<T extends VendureEvent> = {
    /**
     * @description
     * The event type to which the handler should listen.
     * Can be a single event type or an array of event types.
     */
    event: Type<T> | Array<Type<T>>;
    /**
     * @description
     * The handler function which will be executed when the event is published.
     * If the handler returns a Promise, the event publishing code will wait for the Promise to resolve
     * before continuing. Any errors thrown by the handler will cause the event publishing code to fail.
     */
    handler: (event: T) => void | Promise<void>;
    /**
     * @description
     * A unique identifier for the handler. This can then be used to specify the order in which
     * handlers should be executed using the `before` and `after` options in other handlers.
     */
    id: string;
    /**
     * @description
     * The ID of another handler which this handler should execute before.
     */
    before?: string;
    /**
     * @description
     * The ID of another handler which this handler should execute after.
     */
    after?: string;
};
/**
 * @description
 * The EventBus is used to globally publish events which can then be subscribed to.
 *
 * Events are published whenever certain actions take place within the Vendure server, for example:
 *
 * * when a Product is updated ({@link ProductEvent})
 * * when an Order transitions state ({@link OrderStateTransitionEvent})
 * * when a Customer registers a new account ({@link AccountRegistrationEvent})
 *
 * Using the EventBus it is possible to subscribe to an take action when these events occur.
 * This is done with the `.ofType()` method, which takes an event type and returns an rxjs observable
 * stream of events:
 *
 * @example
 * ```ts
 * import { OnApplicationBootstrap } from '\@nestjs/common';
 * import { EventBus, PluginCommonModule, VendurePlugin } from '\@vendure/core';
 * import { filter } from 'rxjs/operators';
 *
 * \@VendurePlugin({
 *     imports: [PluginCommonModule]
 * })
 * export class MyPlugin implements OnApplicationBootstrap {
 *
 *   constructor(private eventBus: EventBus) {}
 *
 *   async onApplicationBootstrap() {
 *
 *     this.eventBus
 *       .ofType(OrderStateTransitionEvent)
 *       .pipe(
 *         filter(event => event.toState === 'PaymentSettled'),
 *       )
 *       .subscribe((event) => {
 *         // do some action when this event fires
 *       });
 *   }
 * }
 * ```
 *
 * @docsCategory events
 * */
export declare class EventBus implements OnModuleDestroy {
    private transactionSubscriber;
    private eventStream;
    private destroy$;
    private blockingEventHandlers;
    constructor(transactionSubscriber: TransactionSubscriber);
    /**
     * @description
     * Publish an event which any subscribers can react to.
     *
     * @example
     * ```ts
     * await eventBus.publish(new SomeEvent());
     * ```
     */
    publish<T extends VendureEvent>(event: T): Promise<void>;
    /**
     * @description
     * Returns an RxJS Observable stream of events of the given type.
     * If the event contains a {@link RequestContext} object, the subscriber
     * will only get called after any active database transactions are complete.
     *
     * This means that the subscriber function can safely access all updated
     * data related to the event.
     */
    ofType<T extends VendureEvent>(type: Type<T>): Observable<T>;
    /**
     * @description
     * Returns an RxJS Observable stream of events filtered by a custom predicate.
     * If the event contains a {@link RequestContext} object, the subscriber
     * will only get called after any active database transactions are complete.
     *
     * This means that the subscriber function can safely access all updated
     * data related to the event.
     */
    filter<T extends VendureEvent>(predicate: (event: VendureEvent) => boolean): Observable<T>;
    /**
     * @description
     * Register an event handler function which will be executed when an event of the given type is published,
     * and will block execution of the code which published the event until the handler has completed.
     *
     * This is useful when you need assurance that the event handler has successfully completed, and you want
     * the triggering code to fail if the handler fails.
     *
     * ::: warning
     * This API should be used with caution, as errors or performance issues in the handler can cause the
     * associated operation to be slow or fail entirely. For this reason, any handler which takes longer than
     * 100ms to execute will log a warning. Any non-trivial task to be performed in a blocking event handler
     * should be offloaded to a background job using the {@link JobQueueService}.
     *
     * Also, be aware that the handler will be executed in the _same database transaction_ as the code which published
     * the event (as long as you pass the `ctx` object from the event to any TransactionalConnection calls).
     * :::
     *
     * @example
     * ```ts
     * eventBus.registerBlockingEventHandler({
     *   event: OrderStateTransitionEvent,
     *   id: 'my-order-state-transition-handler',
     *   handler: async (event) => {
     *     // perform some synchronous task
     *   }
     * });
     * ```
     *
     * @since 2.2.0
     */
    registerBlockingEventHandler<T extends VendureEvent>(
        handlerOptions: BlockingEventHandlerOptions<T>,
    ): void;
    /** @internal */
    onModuleDestroy(): any;
    private executeBlockingEventHandlers;
    private orderEventHandlers;
    /**
     * If the Event includes a RequestContext property, we need to check for any active transaction
     * associated with it, and if there is one, we await that transaction to either commit or rollback
     * before publishing the event.
     *
     * The reason for this is that if the transaction is still active when event subscribers execute,
     * this can cause a couple of issues:
     *
     * 1. If the transaction hasn't completed by the time the subscriber runs, the new data inside
     *  the transaction will not be available to the subscriber.
     * 2. If the subscriber gets a reference to the EntityManager which has an active transaction,
     *   and then the transaction completes, and then the subscriber attempts a DB operation using that
     *   EntityManager, a fatal QueryRunnerAlreadyReleasedError will be thrown.
     *
     * For more context on these two issues, see:
     *
     * * https://github.com/vendure-ecommerce/vendure/issues/520
     * * https://github.com/vendure-ecommerce/vendure/issues/1107
     */
    private awaitActiveTransactions;
}
