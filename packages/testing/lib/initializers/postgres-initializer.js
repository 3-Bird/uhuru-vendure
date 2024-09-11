"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresInitializer = void 0;
const path_1 = __importDefault(require("path"));
class PostgresInitializer {
    async init(testFileName, connectionOptions) {
        const dbName = this.getDbNameFromFilename(testFileName);
        connectionOptions.database = dbName;
        connectionOptions.synchronize = true;
        this.client = await this.getPostgresConnection(connectionOptions);
        await this.client.query(`DROP DATABASE IF EXISTS ${dbName}`);
        await this.client.query(`CREATE DATABASE ${dbName}`);
        return connectionOptions;
    }
    async populate(populateFn) {
        await populateFn();
    }
    destroy() {
        return this.client.end();
    }
    async getPostgresConnection(connectionOptions) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Client } = require('pg');
        const client = new Client({
            host: connectionOptions.host,
            port: connectionOptions.port,
            user: connectionOptions.username,
            password: connectionOptions.password,
            database: 'postgres',
        });
        await client.connect();
        return client;
    }
    getDbNameFromFilename(filename) {
        return 'e2e_' + path_1.default.basename(filename).replace(/[^a-z0-9_]/gi, '_');
    }
}
exports.PostgresInitializer = PostgresInitializer;
//# sourceMappingURL=postgres-initializer.js.map