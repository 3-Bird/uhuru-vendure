"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientError = exports.SimpleGraphQLClient = void 0;
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const printer_1 = require("graphql/language/printer");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const querystring_1 = require("querystring");
const create_upload_post_data_1 = require("./utils/create-upload-post-data");
const LOGIN = (0, graphql_tag_1.default) `
    mutation ($username: String!, $password: String!) {
        login(username: $username, password: $password) {
            ... on CurrentUser {
                id
                identifier
                channels {
                    token
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;
/* eslint-disable no-console */
/**
 * @description
 * A minimalistic GraphQL client for populating and querying test data.
 *
 * @docsCategory testing
 */
class SimpleGraphQLClient {
    constructor(vendureConfig, apiUrl = '') {
        this.vendureConfig = vendureConfig;
        this.apiUrl = apiUrl;
        this.channelToken = null;
        this.headers = {
            'Apollo-Require-Preflight': 'true',
        };
    }
    /**
     * @description
     * Sets the authToken to be used in each GraphQL request.
     */
    setAuthToken(token) {
        this.authToken = token;
        this.headers.Authorization = `Bearer ${this.authToken}`;
    }
    /**
     * @description
     * Sets the authToken to be used in each GraphQL request.
     */
    setChannelToken(token) {
        this.channelToken = token;
        if (this.vendureConfig.apiOptions.channelTokenKey) {
            this.headers[this.vendureConfig.apiOptions.channelTokenKey] = this.channelToken;
        }
    }
    /**
     * @description
     * Returns the authToken currently being used.
     */
    getAuthToken() {
        return this.authToken;
    }
    /**
     * @description
     * Performs both query and mutation operations.
     */
    async query(query, variables, queryParams) {
        const response = await this.makeGraphQlRequest(query, variables, queryParams);
        const result = await this.getResult(response);
        if (response.ok && !result.errors && result.data) {
            return result.data;
        }
        else {
            const errorResult = typeof result === 'string' ? { error: result } : result;
            throw new ClientError(Object.assign(Object.assign({}, errorResult), { status: response.status }), { query: (0, printer_1.print)(query), variables });
        }
    }
    /**
     * @description
     * Performs a raw HTTP request to the given URL, but also includes the authToken & channelToken
     * headers if they have been set. Useful for testing non-GraphQL endpoints, e.g. for plugins
     * which make use of REST controllers.
     */
    async fetch(url, options = {}) {
        const headers = Object.assign(Object.assign({ 'Content-Type': 'application/json' }, this.headers), options.headers);
        const response = await (0, node_fetch_1.default)(url, Object.assign(Object.assign({}, options), { headers }));
        const authToken = response.headers.get(this.vendureConfig.authOptions.authTokenHeaderKey || '');
        if (authToken != null) {
            this.setAuthToken(authToken);
        }
        return response;
    }
    /**
     * @description
     * Performs a query or mutation and returns the resulting status code.
     */
    async queryStatus(query, variables) {
        const response = await this.makeGraphQlRequest(query, variables);
        return response.status;
    }
    /**
     * @description
     * Attempts to log in with the specified credentials.
     */
    async asUserWithCredentials(username, password) {
        var _a;
        // first log out as the current user
        if (this.authToken) {
            await this.query((0, graphql_tag_1.default) `
                    mutation {
                        logout {
                            success
                        }
                    }
                `);
        }
        const result = await this.query(LOGIN, { username, password });
        if (((_a = result.login.channels) === null || _a === void 0 ? void 0 : _a.length) === 1) {
            this.setChannelToken(result.login.channels[0].token);
        }
        return result.login;
    }
    /**
     * @description
     * Logs in as the SuperAdmin user.
     */
    async asSuperAdmin() {
        var _a, _b;
        const { superadminCredentials } = this.vendureConfig.authOptions;
        await this.asUserWithCredentials((_a = superadminCredentials === null || superadminCredentials === void 0 ? void 0 : superadminCredentials.identifier) !== null && _a !== void 0 ? _a : shared_constants_1.SUPER_ADMIN_USER_IDENTIFIER, (_b = superadminCredentials === null || superadminCredentials === void 0 ? void 0 : superadminCredentials.password) !== null && _b !== void 0 ? _b : shared_constants_1.SUPER_ADMIN_USER_PASSWORD);
    }
    /**
     * @description
     * Logs out so that the client is then treated as an anonymous user.
     */
    async asAnonymousUser() {
        await this.query((0, graphql_tag_1.default) `
                mutation {
                    logout {
                        success
                    }
                }
            `);
    }
    async makeGraphQlRequest(query, variables, queryParams) {
        const queryString = (0, printer_1.print)(query);
        const body = JSON.stringify({
            query: queryString,
            variables: variables ? variables : undefined,
        });
        const url = queryParams ? this.apiUrl + `?${(0, querystring_1.stringify)(queryParams)}` : this.apiUrl;
        return this.fetch(url, {
            method: 'POST',
            body,
        });
    }
    async getResult(response) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.startsWith('application/json')) {
            return response.json();
        }
        else {
            return response.text();
        }
    }
    /**
     * @description
     * Perform a file upload mutation.
     *
     * Upload spec: https://github.com/jaydenseric/graphql-multipart-request-spec
     * Discussion of issue: https://github.com/jaydenseric/apollo-upload-client/issues/32
     */
    async fileUploadMutation(options) {
        const { mutation, filePaths, mapVariables } = options;
        const postData = (0, create_upload_post_data_1.createUploadPostData)(mutation, filePaths, mapVariables);
        const body = new form_data_1.default();
        body.append('operations', JSON.stringify(postData.operations));
        body.append('map', '{' +
            Object.entries(postData.map)
                .map(([i, path]) => `"${i}":["${path}"]`)
                .join(',') +
            '}');
        for (const filePath of postData.filePaths) {
            const file = fs_1.default.readFileSync(filePath.file);
            body.append(filePath.name, file, { filename: filePath.file });
        }
        const result = await (0, node_fetch_1.default)(this.apiUrl, {
            method: 'POST',
            body,
            headers: Object.assign({}, this.headers),
        });
        const response = await result.json();
        if (response.errors && response.errors.length) {
            const error = response.errors[0];
            throw new Error(error.message);
        }
        return response.data;
    }
}
exports.SimpleGraphQLClient = SimpleGraphQLClient;
class ClientError extends Error {
    constructor(response, request) {
        super(ClientError.extractMessage(response));
        this.response = response;
        this.request = request;
    }
    static extractMessage(response) {
        if (response.errors) {
            return response.errors[0].message;
        }
        else {
            return `GraphQL Error (Code: ${response.status})`;
        }
    }
}
exports.ClientError = ClientError;
//# sourceMappingURL=simple-graphql-client.js.map