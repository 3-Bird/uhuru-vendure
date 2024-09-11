"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqljsInitializer = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SqljsInitializer {
    /**
     * @param dataDir
     * @param postPopulateTimeoutMs Allows you to specify a timeout to wait after the population
     * step and before the server is shut down. Can resolve occasional race condition issues with
     * the job queue.
     */
    constructor(dataDir, postPopulateTimeoutMs = 0) {
        this.dataDir = dataDir;
        this.postPopulateTimeoutMs = postPopulateTimeoutMs;
    }
    async init(testFileName, connectionOptions) {
        this.dbFilePath = this.getDbFilePath(testFileName);
        this.connectionOptions = connectionOptions;
        connectionOptions.location = this.dbFilePath;
        return connectionOptions;
    }
    async populate(populateFn) {
        if (!fs_1.default.existsSync(this.dbFilePath)) {
            const dirName = path_1.default.dirname(this.dbFilePath);
            if (!fs_1.default.existsSync(dirName)) {
                fs_1.default.mkdirSync(dirName);
            }
            this.connectionOptions.autoSave = true;
            this.connectionOptions.synchronize = true;
            await populateFn();
            await new Promise(resolve => setTimeout(resolve, this.postPopulateTimeoutMs));
            this.connectionOptions.autoSave = false;
            this.connectionOptions.synchronize = false;
        }
    }
    destroy() {
        return undefined;
    }
    getDbFilePath(testFileName) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const dbFileName = path_1.default.basename(testFileName) + '.sqlite';
        const dbFilePath = path_1.default.join(this.dataDir, dbFileName);
        return dbFilePath;
    }
}
exports.SqljsInitializer = SqljsInitializer;
//# sourceMappingURL=sqljs-initializer.js.map