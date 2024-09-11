import { DataSourceOptions } from 'typeorm';
import { TestDbInitializer } from './test-db-initializer';
export type InitializerRegistry = {
    [type in DataSourceOptions['type']]?: TestDbInitializer<any>;
};
/**
 * @description
 * Registers a {@link TestDbInitializer} for the given database type. Should be called before invoking
 * {@link createTestEnvironment}.
 *
 * @docsCategory testing
 */
export declare function registerInitializer(
    type: DataSourceOptions['type'],
    initializer: TestDbInitializer<any>,
): void;
export declare function getInitializerFor(type: DataSourceOptions['type']): TestDbInitializer<any>;
