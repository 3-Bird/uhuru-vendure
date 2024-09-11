"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MysqlInitializer = void 0;
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
class MysqlInitializer {
    async init(testFileName, connectionOptions) {
        const dbName = this.getDbNameFromFilename(testFileName);
        this.conn = await this.getMysqlConnection(connectionOptions);
        connectionOptions.database = dbName;
        connectionOptions.synchronize = true;
        const query = (0, util_1.promisify)(this.conn.query).bind(this.conn);
        await query(`DROP DATABASE IF EXISTS ${dbName}`);
        await query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        return connectionOptions;
    }
    async populate(populateFn) {
        await populateFn();
    }
    async destroy() {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        await (0, util_1.promisify)(this.conn.end).bind(this.conn)();
    }
    async getMysqlConnection(connectionOptions) {
        const { createConnection } = await import('mysql');
        const conn = createConnection({
            host: connectionOptions.host,
            port: connectionOptions.port,
            user: connectionOptions.username,
            password: connectionOptions.password,
        });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const connect = (0, util_1.promisify)(conn.connect).bind(conn);
        await connect();
        return conn;
    }
    getDbNameFromFilename(filename) {
        return 'e2e_' + path_1.default.basename(filename).replace(/[^a-z0-9_]/gi, '_');
    }
}
exports.MysqlInitializer = MysqlInitializer;
//# sourceMappingURL=mysql-initializer.js.map