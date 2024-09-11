import { EntityIdStrategy } from '@vendure/core';
/**
 * A testing entity id strategy which prefixes all IDs with a constant string. This is used in the
 * e2e tests to ensure that all ID properties in arguments are being
 * correctly decoded.
 */
export declare class TestingEntityIdStrategy implements EntityIdStrategy<'increment'> {
    readonly primaryKeyType = 'increment';
    decodeId(id: string): number;
    encodeId(primaryKey: number): string;
}
