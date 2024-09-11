import { INestApplicationContext } from '@nestjs/common';
import { VendureConfig } from '@vendure/core';
import { TestServerOptions } from '../types';
/**
 * Clears all tables from the database and populates with (deterministic) random data.
 */
export declare function populateForTesting<T extends INestApplicationContext>(
    config: Required<VendureConfig>,
    bootstrapFn: (config: VendureConfig) => Promise<T>,
    options: TestServerOptions,
): Promise<T>;
