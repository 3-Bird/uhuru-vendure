"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadPostData = void 0;
const graphql_1 = require("graphql");
/**
 * Creates a data structure which can be used to mae a curl request to upload files to a mutation using
 * the Upload type.
 */
function createUploadPostData(mutation, filePaths, mapVariables) {
    const operationDef = mutation.definitions.find(d => d.kind === graphql_1.Kind.OPERATION_DEFINITION);
    const filePathsArray = Array.isArray(filePaths) ? filePaths : [filePaths];
    const variables = mapVariables(filePaths);
    const postData = {
        operations: {
            operationName: operationDef.name ? operationDef.name.value : 'AnonymousMutation',
            variables,
            query: (0, graphql_1.print)(mutation),
        },
        map: filePathsArray.reduce((output, filePath, i) => {
            return Object.assign(Object.assign({}, output), { [i.toString()]: objectPath(variables, i).join('.') });
        }, {}),
        filePaths: filePathsArray.map((filePath, i) => ({
            name: i.toString(),
            file: filePath,
        })),
    };
    return postData;
}
exports.createUploadPostData = createUploadPostData;
function objectPath(variables, i) {
    const path = ['variables'];
    let current = variables;
    while (current !== null) {
        const props = Object.getOwnPropertyNames(current);
        if (props) {
            const firstProp = props[0];
            const val = current[firstProp];
            if (Array.isArray(val)) {
                path.push(firstProp);
                path.push(i);
                current = val[0];
            }
            else {
                path.push(firstProp);
                current = val;
            }
        }
    }
    return path;
}
//# sourceMappingURL=create-upload-post-data.js.map