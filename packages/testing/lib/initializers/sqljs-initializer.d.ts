import { SqljsConnectionOptions } from 'typeorm/driver/sqljs/SqljsConnectionOptions';
import { TestDbInitializer } from './test-db-initializer';
export declare class SqljsInitializer implements TestDbInitializer<SqljsConnectionOptions> {
    private dataDir;
    private postPopulateTimeoutMs;
    private dbFilePath;
    private connectionOptions;
    /**
     * @param dataDir
     * @param postPopulateTimeoutMs Allows you to specify a timeout to wait after the population
     * step and before the server is shut down. Can resolve occasional race condition issues with
     * the job queue.
     */
    constructor(dataDir: string, postPopulateTimeoutMs?: number);
    init(testFileName: string, connectionOptions: SqljsConnectionOptions): Promise<SqljsConnectionOptions>;
    populate(populateFn: () => Promise<void>): Promise<void>;
    destroy(): void | Promise<void>;
    private getDbFilePath;
}
