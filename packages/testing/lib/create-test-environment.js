"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestEnvironment = void 0;
const simple_graphql_client_1 = require("./simple-graphql-client");
const test_server_1 = require("./test-server");
/**
 * @description
 * Configures a {@link TestServer} and a {@link SimpleGraphQLClient} for each of the GraphQL APIs
 * for use in end-to-end tests. Returns a {@link TestEnvironment} object.
 *
 * @example
 * ```ts
 * import { createTestEnvironment, testConfig } from '\@vendure/testing';
 *
 * describe('some feature to test', () => {
 *
 *   const { server, adminClient, shopClient } = createTestEnvironment(testConfig);
 *
 *   beforeAll(async () => {
 *     await server.init({
 *         // ... server options
 *     });
 *     await adminClient.asSuperAdmin();
 *   });
 *
 *   afterAll(async () => {
 *       await server.destroy();
 *   });
 *
 *   // ... end-to-end tests here
 * });
 * ```
 * @docsCategory testing
 */
function createTestEnvironment(config) {
    const server = new test_server_1.TestServer(config);
    const { port, adminApiPath, shopApiPath } = config.apiOptions;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const adminClient = new simple_graphql_client_1.SimpleGraphQLClient(config, `http://localhost:${port}/${adminApiPath}`);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const shopClient = new simple_graphql_client_1.SimpleGraphQLClient(config, `http://localhost:${port}/${shopApiPath}`);
    return {
        server,
        adminClient,
        shopClient,
    };
}
exports.createTestEnvironment = createTestEnvironment;
//# sourceMappingURL=create-test-environment.js.map