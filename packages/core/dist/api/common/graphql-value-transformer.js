"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphqlValueTransformer = void 0;
const graphql_1 = require("graphql");
/**
 * This class is used to transform the values of input variables or an output object.
 */
class GraphqlValueTransformer {
    constructor(schema) {
        this.schema = schema;
        this.outputCache = new WeakMap();
        this.inputCache = new WeakMap();
    }
    /**
     * Transforms the values in the `data` object into the return value of the `visitorFn`.
     */
    transformValues(typeTree, data, visitorFn) {
        this.traverse(data, (key, value, path) => {
            const typeTreeNode = this.getTypeNodeByPath(typeTree, path);
            const type = (typeTreeNode && typeTreeNode.type);
            return visitorFn(value, type);
        });
    }
    /**
     * Constructs a tree of TypeTreeNodes for the output of a GraphQL operation.
     */
    getOutputTypeTree(document) {
        const cached = this.outputCache.get(document);
        if (cached) {
            return cached;
        }
        const typeInfo = new graphql_1.TypeInfo(this.schema);
        const typeTree = {
            operation: {},
            fragments: {},
        };
        const rootNode = {
            type: undefined,
            isList: false,
            parent: typeTree,
            fragmentRefs: [],
            children: {},
        };
        typeTree.operation = rootNode;
        let currentNode = rootNode;
        const visitor = {
            enter: node => {
                var _a, _b;
                const type = typeInfo.getType();
                const fieldDef = typeInfo.getFieldDef();
                if (node.kind === 'Field') {
                    const newNode = {
                        type: (type && (0, graphql_1.getNamedType)(type)) || undefined,
                        isList: this.isList(type),
                        fragmentRefs: [],
                        parent: currentNode,
                        children: {},
                    };
                    currentNode.children[(_b = (_a = node.alias) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : node.name.value] = newNode;
                    currentNode = newNode;
                }
                if (node.kind === 'FragmentSpread') {
                    currentNode.fragmentRefs.push(node.name.value);
                }
                if (node.kind === 'FragmentDefinition') {
                    const rootFragmentNode = {
                        type: undefined,
                        isList: false,
                        fragmentRefs: [],
                        parent: typeTree,
                        children: {},
                    };
                    currentNode = rootFragmentNode;
                    typeTree.fragments[node.name.value] = rootFragmentNode;
                }
            },
            leave: node => {
                if (node.kind === 'Field') {
                    if (!this.isTypeTree(currentNode.parent)) {
                        currentNode = currentNode.parent;
                    }
                }
                if (node.kind === 'FragmentDefinition') {
                    currentNode = rootNode;
                }
            },
        };
        for (const operation of document.definitions) {
            (0, graphql_1.visit)(operation, (0, graphql_1.visitWithTypeInfo)(typeInfo, visitor));
        }
        this.outputCache.set(document, typeTree);
        return typeTree;
    }
    /**
     * Constructs a tree of TypeTreeNodes for the input variables of a GraphQL operation.
     */
    getInputTypeTree(definition) {
        const cached = this.inputCache.get(definition);
        if (cached) {
            return cached;
        }
        const typeInfo = new graphql_1.TypeInfo(this.schema);
        const typeTree = {
            operation: {},
            fragments: {},
        };
        const rootNode = {
            type: undefined,
            isList: false,
            parent: typeTree,
            fragmentRefs: [],
            children: {},
        };
        typeTree.operation = rootNode;
        let currentNode = rootNode;
        const visitor = {
            enter: node => {
                if (node.kind === 'Argument') {
                    const type = typeInfo.getType();
                    const args = typeInfo.getArgument();
                    if (args) {
                        const inputType = (0, graphql_1.getNamedType)(args.type);
                        const newNode = {
                            type: inputType || undefined,
                            isList: this.isList(type),
                            parent: currentNode,
                            fragmentRefs: [],
                            children: {},
                        };
                        currentNode.children[args.name] = newNode;
                        if ((0, graphql_1.isInputObjectType)(inputType)) {
                            if ((0, graphql_1.isInputObjectType)(inputType)) {
                                newNode.children = this.getChildrenTreeNodes(inputType, newNode);
                            }
                        }
                        currentNode = newNode;
                    }
                }
            },
            leave: node => {
                if (node.kind === 'Argument') {
                    if (!this.isTypeTree(currentNode.parent)) {
                        currentNode = currentNode.parent;
                    }
                }
            },
        };
        (0, graphql_1.visit)(definition, (0, graphql_1.visitWithTypeInfo)(typeInfo, visitor));
        this.inputCache.set(definition, typeTree);
        return typeTree;
    }
    getChildrenTreeNodes(inputType, parent) {
        return Object.entries(inputType.getFields()).reduce((result, [key, field]) => {
            const namedType = (0, graphql_1.getNamedType)(field.type);
            if (namedType === parent.type) {
                // prevent recursion-induced stack overflow
                return result;
            }
            const child = {
                type: namedType,
                isList: this.isList(field.type),
                parent,
                fragmentRefs: [],
                children: {},
            };
            if ((0, graphql_1.isInputObjectType)(namedType)) {
                child.children = this.getChildrenTreeNodes(namedType, child);
            }
            return Object.assign(Object.assign({}, result), { [key]: child });
        }, {});
    }
    isList(t) {
        return (0, graphql_1.isListType)(t) || ((0, graphql_1.isNonNullType)(t) && (0, graphql_1.isListType)(t.ofType));
    }
    getTypeNodeByPath(typeTree, path) {
        let targetNode = typeTree.operation;
        for (const segment of path) {
            if (Number.isNaN(Number.parseInt(segment, 10))) {
                if (targetNode) {
                    let children = targetNode.children;
                    if (targetNode.fragmentRefs.length) {
                        const fragmentRefs = targetNode.fragmentRefs.slice();
                        while (fragmentRefs.length) {
                            const ref = fragmentRefs.pop();
                            if (ref) {
                                const fragment = typeTree.fragments[ref];
                                children = Object.assign(Object.assign({}, children), fragment.children);
                                if (fragment.fragmentRefs) {
                                    fragmentRefs.push(...fragment.fragmentRefs);
                                }
                            }
                        }
                    }
                    targetNode = children[segment];
                }
            }
        }
        return targetNode;
    }
    traverse(o, visitorFn, path = []) {
        for (const key of Object.keys(o)) {
            path.push(key);
            o[key] = visitorFn(key, o[key], path);
            if (o[key] !== null && typeof o[key] === 'object') {
                this.traverse(o[key], visitorFn, path);
            }
            path.pop();
        }
    }
    isTypeTree(input) {
        return input.hasOwnProperty('fragments');
    }
}
exports.GraphqlValueTransformer = GraphqlValueTransformer;
//# sourceMappingURL=graphql-value-transformer.js.map