import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { VendureConfig } from '@vendure/core';
import { DocumentNode } from 'graphql';
import { RequestInit, Response } from 'node-fetch';
import { QueryParams } from './types';
/**
 * @description
 * A minimalistic GraphQL client for populating and querying test data.
 *
 * @docsCategory testing
 */
export declare class SimpleGraphQLClient {
    private vendureConfig;
    private apiUrl;
    private authToken;
    private channelToken;
    private headers;
    constructor(vendureConfig: Required<VendureConfig>, apiUrl?: string);
    /**
     * @description
     * Sets the authToken to be used in each GraphQL request.
     */
    setAuthToken(token: string): void;
    /**
     * @description
     * Sets the authToken to be used in each GraphQL request.
     */
    setChannelToken(token: string | null): void;
    /**
     * @description
     * Returns the authToken currently being used.
     */
    getAuthToken(): string;
    /**
     * @description
     * Performs both query and mutation operations.
     */
    query<T = any, V extends Record<string, any> = Record<string, any>>(
        query: DocumentNode | TypedDocumentNode<T, V>,
        variables?: V,
        queryParams?: QueryParams,
    ): Promise<T>;
    /**
     * @description
     * Performs a raw HTTP request to the given URL, but also includes the authToken & channelToken
     * headers if they have been set. Useful for testing non-GraphQL endpoints, e.g. for plugins
     * which make use of REST controllers.
     */
    fetch(url: string, options?: RequestInit): Promise<Response>;
    /**
     * @description
     * Performs a query or mutation and returns the resulting status code.
     */
    queryStatus<T = any, V extends Record<string, any> = Record<string, any>>(
        query: DocumentNode,
        variables?: V,
    ): Promise<number>;
    /**
     * @description
     * Attempts to log in with the specified credentials.
     */
    asUserWithCredentials(username: string, password: string): Promise<any>;
    /**
     * @description
     * Logs in as the SuperAdmin user.
     */
    asSuperAdmin(): Promise<void>;
    /**
     * @description
     * Logs out so that the client is then treated as an anonymous user.
     */
    asAnonymousUser(): Promise<void>;
    private makeGraphQlRequest;
    private getResult;
    /**
     * @description
     * Perform a file upload mutation.
     *
     * Upload spec: https://github.com/jaydenseric/graphql-multipart-request-spec
     * Discussion of issue: https://github.com/jaydenseric/apollo-upload-client/issues/32
     */
    fileUploadMutation(options: {
        mutation: DocumentNode;
        filePaths: string[];
        mapVariables: (filePaths: string[]) => any;
    }): Promise<any>;
}
export declare class ClientError extends Error {
    response: any;
    request: any;
    constructor(response: any, request: any);
    private static extractMessage;
}
