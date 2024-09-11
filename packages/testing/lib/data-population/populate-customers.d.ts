import { INestApplicationContext } from '@nestjs/common';
/**
 * Creates customers with addresses by making API calls to the Admin API.
 */
export declare function populateCustomers(
    app: INestApplicationContext,
    count: number,
    loggingFn: (message: string) => void,
): Promise<void>;
