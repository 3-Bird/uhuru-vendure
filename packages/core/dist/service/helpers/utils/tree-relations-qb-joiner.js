"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinTreeRelationsDynamically = void 0;
const DriverUtils_1 = require("typeorm/driver/DriverUtils");
const find_options_object_to_array_1 = require("../../../connection/find-options-object-to-array");
/**
 * @description
 * Check if the current entity has one or more self-referencing relations
 * to determine if it is a tree type or has tree relations.
 * @param metadata
 * @private
 */
function isTreeEntityMetadata(metadata) {
    if (metadata.treeType !== undefined) {
        return true;
    }
    for (const relation of metadata.relations) {
        if (relation.isTreeParent || relation.isTreeChildren) {
            return true;
        }
        if (relation.inverseEntityMetadata === metadata) {
            return true;
        }
    }
    return false;
}
/**
 * Dynamically joins tree relations and their eager counterparts in a TypeORM SelectQueryBuilder, addressing
 * challenges of managing deeply nested relations and optimizing query efficiency. It leverages TypeORM tree
 * decorators (@TreeParent, @TreeChildren) to automate joins of self-related entities, including those marked for eager loading.
 * The process avoids duplicate joins and manual join specifications by using relation metadata.
 *
 * @param {SelectQueryBuilder<T>} qb - The query builder instance for joining relations.
 * @param {EntityTarget<T>} entity - The target entity class or schema name, used to access entity metadata.
 * @param {string[]} [requestedRelations=[]] - An array of relation paths (e.g., 'parent.children') to join dynamically.
 * @param {number} [maxEagerDepth=1] - Limits the depth of eager relation joins to avoid excessively deep joins.
 * @returns {Map<string, string>} - A Map of joined relation paths to their aliases, aiding in tracking and preventing duplicates.
 * @template T - The entity type, extending VendureEntity for compatibility with Vendure's data layer.
 *
 * Usage Notes:
 * - Only entities utilizing TypeORM tree decorators and having nested relations are supported.
 * - The `maxEagerDepth` parameter controls the recursion depth for eager relations, preventing performance issues.
 *
 * For more context on the issue this function addresses, refer to TypeORM issue #9936:
 * https://github.com/typeorm/typeorm/issues/9936
 *
 * Example:
 * ```typescript
 * const qb = repository.createQueryBuilder("entity");
 * joinTreeRelationsDynamically(qb, EntityClass, ["parent.children"], 2);
 * ```
 */
function joinTreeRelationsDynamically(qb, entity, requestedRelations = {}, maxEagerDepth = 1) {
    const joinedRelations = new Map();
    const relationsArray = (0, find_options_object_to_array_1.findOptionsObjectToArray)(requestedRelations);
    if (!relationsArray.length) {
        return joinedRelations;
    }
    const sourceMetadata = qb.connection.getMetadata(entity);
    const sourceMetadataIsTree = isTreeEntityMetadata(sourceMetadata);
    const processRelation = (currentMetadata, parentMetadataIsTree, currentPath, currentAlias, parentPath, eagerDepth = 0) => {
        if (currentPath === '') {
            return;
        }
        parentPath = parentPath === null || parentPath === void 0 ? void 0 : parentPath.filter(p => p !== '');
        const currentMetadataIsTree = isTreeEntityMetadata(currentMetadata) || sourceMetadataIsTree || parentMetadataIsTree;
        if (!currentMetadataIsTree) {
            return;
        }
        const parts = currentPath.split('.');
        let part = parts.shift();
        if (!part || !currentMetadata)
            return;
        if (part === 'customFields' && parts.length > 0) {
            const relation = parts.shift();
            if (!relation)
                return;
            part += `.${relation}`;
        }
        const relationMetadata = currentMetadata.findRelationWithPropertyPath(part);
        if (!relationMetadata) {
            return;
        }
        let joinConnector = '_';
        if (relationMetadata.isEager) {
            joinConnector = '__';
        }
        const nextAlias = DriverUtils_1.DriverUtils.buildAlias(qb.connection.driver, { shorten: false }, currentAlias, part.replace(/\./g, '_'));
        const nextPath = parts.join('.');
        const fullPath = [...(parentPath || []), part].join('.');
        if (!qb.expressionMap.joinAttributes.some(ja => ja.alias.name === nextAlias)) {
            qb.leftJoinAndSelect(`${currentAlias}.${part}`, nextAlias);
            joinedRelations.set(fullPath, nextAlias);
        }
        const inverseEntityMetadataIsTree = isTreeEntityMetadata(relationMetadata.inverseEntityMetadata);
        if (!currentMetadataIsTree && !inverseEntityMetadataIsTree) {
            return;
        }
        const newEagerDepth = relationMetadata.isEager ? eagerDepth + 1 : eagerDepth;
        if (newEagerDepth <= maxEagerDepth) {
            relationMetadata.inverseEntityMetadata.relations.forEach(subRelation => {
                if (subRelation.isEager) {
                    processRelation(relationMetadata.inverseEntityMetadata, currentMetadataIsTree, subRelation.propertyPath, nextAlias, [fullPath], newEagerDepth);
                }
            });
        }
        if (nextPath) {
            processRelation(relationMetadata.inverseEntityMetadata, currentMetadataIsTree, nextPath, nextAlias, [fullPath]);
        }
    };
    relationsArray.forEach(relationPath => {
        if (!joinedRelations.has(relationPath)) {
            processRelation(sourceMetadata, sourceMetadataIsTree, relationPath, qb.alias);
        }
    });
    return joinedRelations;
}
exports.joinTreeRelationsDynamically = joinTreeRelationsDynamically;
//# sourceMappingURL=tree-relations-qb-joiner.js.map