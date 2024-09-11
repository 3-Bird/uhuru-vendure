import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { TestDbInitializer } from './test-db-initializer';
export declare class MysqlInitializer implements TestDbInitializer<MysqlConnectionOptions> {
    private conn;
    init(testFileName: string, connectionOptions: MysqlConnectionOptions): Promise<MysqlConnectionOptions>;
    populate(populateFn: () => Promise<void>): Promise<void>;
    destroy(): Promise<void>;
    private getMysqlConnection;
    private getDbNameFromFilename;
}
