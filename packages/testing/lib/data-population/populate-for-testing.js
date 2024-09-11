"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateForTesting = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const cli_1 = require("@vendure/core/cli");
const populate_customers_1 = require("./populate-customers");
/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * Clears all tables from the database and populates with (deterministic) random data.
 */
async function populateForTesting(config, bootstrapFn, options) {
    var _a;
    config.dbConnectionOptions.logging = false;
    const logging = options.logging === undefined ? true : options.logging;
    const originalRequireVerification = config.authOptions.requireVerification;
    config.authOptions.requireVerification = false;
    const app = await bootstrapFn(config);
    const logFn = (message) => (logging ? console.log(message) : null);
    await (0, cli_1.populateInitialData)(app, options.initialData);
    await populateProducts(app, options.productsCsvPath, logging);
    await (0, cli_1.populateCollections)(app, options.initialData);
    await (0, populate_customers_1.populateCustomers)(app, (_a = options.customerCount) !== null && _a !== void 0 ? _a : 10, logFn);
    config.authOptions.requireVerification = originalRequireVerification;
    return app;
}
exports.populateForTesting = populateForTesting;
async function populateProducts(app, productsCsvPath, logging) {
    if (!productsCsvPath) {
        if (logging) {
            console.log('\nNo product data provided, skipping product import');
        }
        return;
    }
    const importResult = await (0, cli_1.importProductsFromCsv)(app, productsCsvPath, generated_types_1.LanguageCode.en);
    if (importResult.errors && importResult.errors.length) {
        console.log(`${importResult.errors.length} errors encountered when importing product data:`);
        console.log(importResult.errors.join('\n'));
    }
    if (logging) {
        console.log(`\nImported ${importResult.imported} products`);
    }
}
//# sourceMappingURL=populate-for-testing.js.map