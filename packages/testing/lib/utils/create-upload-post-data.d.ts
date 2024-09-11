import { DocumentNode } from 'graphql';
export interface FilePlaceholder {
    file: null;
}
export interface UploadPostData<V = any> {
    operations: {
        operationName: string;
        variables: V;
        query: string;
    };
    map: {
        [index: number]: string;
    };
    filePaths: Array<{
        name: string;
        file: string;
    }>;
}
/**
 * Creates a data structure which can be used to mae a curl request to upload files to a mutation using
 * the Upload type.
 */
export declare function createUploadPostData<P extends string[] | string, V>(
    mutation: DocumentNode,
    filePaths: P,
    mapVariables: (filePaths: P) => V,
): UploadPostData<V>;
