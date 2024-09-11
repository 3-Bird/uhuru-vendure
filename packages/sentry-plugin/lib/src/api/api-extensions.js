"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testApiExtensions = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.testApiExtensions = (0, graphql_tag_1.default) `
    enum TestErrorType {
        UNCAUGHT_ERROR
        THROWN_ERROR
        CAPTURED_ERROR
        CAPTURED_MESSAGE
        DATABASE_ERROR
    }
    extend type Mutation {
        createTestError(errorType: TestErrorType!): Boolean
    }
`;
//# sourceMappingURL=api-extensions.js.map