"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateCustomers = void 0;
const core_1 = require("@vendure/core");
const get_superadmin_context_1 = require("../utils/get-superadmin-context");
const mock_data_service_1 = require("./mock-data.service");
/**
 * Creates customers with addresses by making API calls to the Admin API.
 */
async function populateCustomers(app, count, loggingFn) {
    const customerService = app.get(core_1.CustomerService);
    const customerData = mock_data_service_1.MockDataService.getCustomers(count);
    const ctx = await (0, get_superadmin_context_1.getSuperadminContext)(app);
    const password = 'test';
    for (const { customer, address } of customerData) {
        try {
            const createdCustomer = await customerService.create(ctx, customer, password);
            if ((0, core_1.isGraphQlErrorResult)(createdCustomer)) {
                loggingFn(`Failed to create customer: ${createdCustomer.message}`);
                continue;
            }
            await customerService.createAddress(ctx, createdCustomer.id, address);
        }
        catch (e) {
            loggingFn(`Failed to create customer: ${JSON.stringify(e.message)}`);
        }
    }
}
exports.populateCustomers = populateCustomers;
//# sourceMappingURL=populate-customers.js.map