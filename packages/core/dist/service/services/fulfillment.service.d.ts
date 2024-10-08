import { ConfigurableOperationInput, OrderLineInput } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { RelationPaths } from '../../api/decorators/relations.decorator';
import {
    CreateFulfillmentError,
    FulfillmentStateTransitionError,
    InvalidFulfillmentHandlerError,
} from '../../common/error/generated-graphql-admin-errors';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Fulfillment } from '../../entity/fulfillment/fulfillment.entity';
import { Order } from '../../entity/order/order.entity';
import { FulfillmentLine } from '../../entity/order-line-reference/fulfillment-line.entity';
import { EventBus } from '../../event-bus/event-bus';
import { CustomFieldRelationService } from '../helpers/custom-field-relation/custom-field-relation.service';
import { FulfillmentState } from '../helpers/fulfillment-state-machine/fulfillment-state';
import { FulfillmentStateMachine } from '../helpers/fulfillment-state-machine/fulfillment-state-machine';
/**
 * @description
 * Contains methods relating to {@link Fulfillment} entities.
 *
 * @docsCategory services
 */
export declare class FulfillmentService {
    private connection;
    private fulfillmentStateMachine;
    private eventBus;
    private configService;
    private customFieldRelationService;
    constructor(
        connection: TransactionalConnection,
        fulfillmentStateMachine: FulfillmentStateMachine,
        eventBus: EventBus,
        configService: ConfigService,
        customFieldRelationService: CustomFieldRelationService,
    );
    /**
     * @description
     * Creates a new Fulfillment for the given Orders and OrderItems, using the specified
     * {@link FulfillmentHandler}.
     */
    create(
        ctx: RequestContext,
        orders: Order[],
        lines: OrderLineInput[],
        handler: ConfigurableOperationInput,
    ): Promise<Fulfillment | InvalidFulfillmentHandlerError | CreateFulfillmentError>;
    getFulfillmentLines(ctx: RequestContext, id: ID): Promise<FulfillmentLine[]>;
    getFulfillmentsLinesForOrderLine(
        ctx: RequestContext,
        orderLineId: ID,
        relations?: RelationPaths<FulfillmentLine>,
    ): Promise<FulfillmentLine[]>;
    /**
     * @description
     * Transitions the specified Fulfillment to a new state and upon successful transition
     * publishes a {@link FulfillmentStateTransitionEvent}.
     */
    transitionToState(
        ctx: RequestContext,
        fulfillmentId: ID,
        state: FulfillmentState,
    ): Promise<
        | {
              fulfillment: Fulfillment;
              orders: Order[];
              fromState: FulfillmentState;
              toState: FulfillmentState;
          }
        | FulfillmentStateTransitionError
    >;
    /**
     * @description
     * Returns an array of the next valid states for the Fulfillment.
     */
    getNextStates(fulfillment: Fulfillment): readonly FulfillmentState[];
}
