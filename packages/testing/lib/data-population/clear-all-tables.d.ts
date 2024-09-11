import { VendureConfig } from '@vendure/core';
/**
 * Clears all tables in the database specified by the connectionOptions
 */
export declare function clearAllTables(config: VendureConfig, logging?: boolean): Promise<void>;
