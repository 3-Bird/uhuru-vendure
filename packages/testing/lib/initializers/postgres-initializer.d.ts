import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { TestDbInitializer } from './test-db-initializer';
export declare class PostgresInitializer implements TestDbInitializer<PostgresConnectionOptions> {
    private client;
    init(
        testFileName: string,
        connectionOptions: PostgresConnectionOptions,
    ): Promise<PostgresConnectionOptions>;
    populate(populateFn: () => Promise<void>): Promise<void>;
    destroy(): void | Promise<void>;
    private getPostgresConnection;
    private getDbNameFromFilename;
}
