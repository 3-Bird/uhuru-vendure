"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitializerFor = exports.registerInitializer = void 0;
const initializerRegistry = {};
/**
 * @description
 * Registers a {@link TestDbInitializer} for the given database type. Should be called before invoking
 * {@link createTestEnvironment}.
 *
 * @docsCategory testing
 */
function registerInitializer(type, initializer) {
    initializerRegistry[type] = initializer;
}
exports.registerInitializer = registerInitializer;
function getInitializerFor(type) {
    const initializer = initializerRegistry[type];
    if (!initializer) {
        throw new Error(`No initializer has been registered for the database type "${type}"`);
    }
    return initializer;
}
exports.getInitializerFor = getInitializerFor;
//# sourceMappingURL=initializers.js.map