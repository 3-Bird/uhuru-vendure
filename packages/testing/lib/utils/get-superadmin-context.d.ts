import { INestApplicationContext } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
/**
 * @description
 * Creates a {@link RequestContext} configured for the default Channel with the activeUser set
 * as the superadmin user. Useful for populating data.
 *
 * @docsCategory testing
 */
export declare function getSuperadminContext(app: INestApplicationContext): Promise<RequestContext>;
