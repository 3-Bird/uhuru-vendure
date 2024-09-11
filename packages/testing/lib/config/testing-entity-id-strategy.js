"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingEntityIdStrategy = void 0;
/**
 * A testing entity id strategy which prefixes all IDs with a constant string. This is used in the
 * e2e tests to ensure that all ID properties in arguments are being
 * correctly decoded.
 */
class TestingEntityIdStrategy {
    constructor() {
        this.primaryKeyType = 'increment';
    }
    decodeId(id) {
        const asNumber = parseInt(id.replace('T_', ''), 10);
        return Number.isNaN(asNumber) ? -1 : asNumber;
    }
    encodeId(primaryKey) {
        return 'T_' + primaryKey.toString();
    }
}
exports.TestingEntityIdStrategy = TestingEntityIdStrategy;
//# sourceMappingURL=testing-entity-id-strategy.js.map