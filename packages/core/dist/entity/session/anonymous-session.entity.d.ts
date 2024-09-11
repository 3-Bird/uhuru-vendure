import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Session } from './session.entity';
/**
 * @description
 * An anonymous session is created when a unauthenticated user interacts with restricted operations,
 * such as calling the `activeOrder` query in the Shop API. Anonymous sessions allow a guest Customer
 * to maintain an order without requiring authentication and a registered account beforehand.
 *
 * @docsCategory entities
 */
export declare class AnonymousSession extends Session {
    constructor(input: DeepPartial<AnonymousSession>);
}
