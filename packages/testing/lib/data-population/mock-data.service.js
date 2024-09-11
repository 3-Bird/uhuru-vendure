"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDataService = void 0;
const en_GB_1 = __importDefault(require("faker/locale/en_GB"));
const graphql_tag_1 = __importDefault(require("graphql-tag"));
/* eslint-disable no-console */
/**
 * A service for creating mock data via the GraphQL API.
 */
class MockDataService {
    constructor(client, logging = true) {
        this.client = client;
        this.logging = logging;
        // make the generated results deterministic
        en_GB_1.default.seed(1);
    }
    static getCustomers(count) {
        en_GB_1.default.seed(1);
        const results = [];
        for (let i = 0; i < count; i++) {
            const firstName = en_GB_1.default.name.firstName();
            const lastName = en_GB_1.default.name.lastName();
            const customer = {
                firstName,
                lastName,
                emailAddress: en_GB_1.default.internet.email(firstName, lastName),
                phoneNumber: en_GB_1.default.phone.phoneNumber(),
            };
            const address = {
                fullName: `${firstName} ${lastName}`,
                streetLine1: en_GB_1.default.address.streetAddress(),
                city: en_GB_1.default.address.city(),
                province: en_GB_1.default.address.county(),
                postalCode: en_GB_1.default.address.zipCode(),
                countryCode: 'GB',
            };
            results.push({ customer, address });
        }
        return results;
    }
    /**
     * @deprecated
     * Use `MockDataService.getCustomers()` and create customers directly with CustomerService.
     */
    async populateCustomers(count = 5) {
        for (let i = 0; i < count; i++) {
            const firstName = en_GB_1.default.name.firstName();
            const lastName = en_GB_1.default.name.lastName();
            const query1 = (0, graphql_tag_1.default) `
                mutation CreateCustomer($input: CreateCustomerInput!, $password: String) {
                    createCustomer(input: $input, password: $password) {
                        ... on Customer {
                            id
                            emailAddress
                        }
                    }
                }
            `;
            const variables1 = {
                input: {
                    firstName,
                    lastName,
                    emailAddress: en_GB_1.default.internet.email(firstName, lastName),
                    phoneNumber: en_GB_1.default.phone.phoneNumber(),
                },
                password: 'test',
            };
            const customer = await this.client
                .query(query1, variables1)
                .then((data) => data.createCustomer, err => this.log(err));
            if (customer) {
                const query2 = (0, graphql_tag_1.default) `
                    mutation ($customerId: ID!, $input: CreateAddressInput!) {
                        createCustomerAddress(customerId: $customerId, input: $input) {
                            id
                            streetLine1
                        }
                    }
                `;
                const variables2 = {
                    input: {
                        fullName: `${firstName} ${lastName}`,
                        streetLine1: en_GB_1.default.address.streetAddress(),
                        city: en_GB_1.default.address.city(),
                        province: en_GB_1.default.address.county(),
                        postalCode: en_GB_1.default.address.zipCode(),
                        countryCode: 'GB',
                    },
                    customerId: customer.id,
                };
                await this.client.query(query2, variables2).catch(err => this.log(err));
            }
        }
        this.log(`Created ${count} Customers`);
    }
    log(...args) {
        if (this.logging) {
            console.log(...args);
        }
    }
}
exports.MockDataService = MockDataService;
//# sourceMappingURL=mock-data.service.js.map