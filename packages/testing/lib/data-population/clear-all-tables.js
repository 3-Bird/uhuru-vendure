"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllTables = void 0;
const bootstrap_1 = require("@vendure/core/dist/bootstrap");
const typeorm_1 = require("typeorm");
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * Clears all tables in the database specified by the connectionOptions
 */
async function clearAllTables(config, logging = true) {
    var _a, _b;
    if (logging) {
        console.log('Clearing all tables...');
    }
    config = await (0, bootstrap_1.preBootstrapConfig)(config);
    const entityIdStrategy = (_a = config.entityIdStrategy) !== null && _a !== void 0 ? _a : (_b = config.entityOptions) === null || _b === void 0 ? void 0 : _b.entityIdStrategy;
    const connection = await (0, typeorm_1.createConnection)(Object.assign({}, config.dbConnectionOptions));
    try {
        await connection.synchronize(true);
    }
    catch (err) {
        console.error('Error occurred when attempting to clear tables!');
        console.log(err);
    }
    finally {
        await connection.close();
    }
    if (logging) {
        console.log('Done!');
    }
}
exports.clearAllTables = clearAllTables;
//# sourceMappingURL=clear-all-tables.js.map