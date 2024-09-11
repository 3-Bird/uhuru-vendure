import { ApolloServerPlugin, GraphQLRequestListener, GraphQLRequestContext } from '@apollo/server';
/**
 * Based on https://github.com/ntegral/nestjs-sentry/issues/97#issuecomment-1252446807
 */
export declare class SentryApolloPlugin implements ApolloServerPlugin {
    private options;
    constructor(options: { enableTracing: boolean });
    requestDidStart({
        request,
        contextValue,
    }: GraphQLRequestContext<any>): Promise<GraphQLRequestListener<any>>;
}
