import { TransactionalConnection } from '@vendure/core';
export declare class ErrorTestService {
    private connection;
    constructor(connection: TransactionalConnection);
    createDatabaseError(): Promise<any>;
}
