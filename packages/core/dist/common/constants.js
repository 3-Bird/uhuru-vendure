"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKey = exports.getAllPermissionsMetadata = exports.DEFAULT_PERMISSIONS = exports.REQUEST_CONTEXT_MAP_KEY = exports.REQUEST_CONTEXT_KEY = exports.TRANSACTION_MANAGER_KEY = exports.DEFAULT_LANGUAGE_CODE = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const permission_definition_1 = require("./permission-definition");
/**
 * This value should be rarely used - only in those contexts where we have no access to the
 * VendureConfig to ensure at least a valid LanguageCode is available.
 */
exports.DEFAULT_LANGUAGE_CODE = generated_types_1.LanguageCode.en;
exports.TRANSACTION_MANAGER_KEY = Symbol('TRANSACTION_MANAGER');
exports.REQUEST_CONTEXT_KEY = 'vendureRequestContext';
exports.REQUEST_CONTEXT_MAP_KEY = 'vendureRequestContextMap';
exports.DEFAULT_PERMISSIONS = [
    new permission_definition_1.PermissionDefinition({
        name: 'Authenticated',
        description: 'Authenticated means simply that the user is logged in',
        assignable: true,
        internal: true,
    }),
    new permission_definition_1.PermissionDefinition({
        name: 'SuperAdmin',
        description: 'SuperAdmin has unrestricted access to all operations',
        assignable: true,
        internal: true,
    }),
    new permission_definition_1.PermissionDefinition({
        name: 'Owner',
        description: "Owner means the user owns this entity, e.g. a Customer's own Order",
        assignable: false,
        internal: true,
    }),
    new permission_definition_1.PermissionDefinition({
        name: 'Public',
        description: 'Public means any unauthenticated user may perform the operation',
        assignable: false,
        internal: true,
    }),
    new permission_definition_1.PermissionDefinition({
        name: 'UpdateGlobalSettings',
        description: 'Grants permission to update GlobalSettings',
        assignable: true,
        internal: false,
    }),
    new permission_definition_1.CrudPermissionDefinition('Catalog', operation => `Grants permission to ${operation} Products, Facets, Assets, Collections`),
    new permission_definition_1.CrudPermissionDefinition('Settings', operation => `Grants permission to ${operation} PaymentMethods, ShippingMethods, TaxCategories, TaxRates, Zones, Countries, System & GlobalSettings`),
    new permission_definition_1.CrudPermissionDefinition('Administrator'),
    new permission_definition_1.CrudPermissionDefinition('Asset'),
    new permission_definition_1.CrudPermissionDefinition('Channel'),
    new permission_definition_1.CrudPermissionDefinition('Collection'),
    new permission_definition_1.CrudPermissionDefinition('Country'),
    new permission_definition_1.CrudPermissionDefinition('Customer'),
    new permission_definition_1.CrudPermissionDefinition('CustomerGroup'),
    new permission_definition_1.CrudPermissionDefinition('Facet'),
    new permission_definition_1.CrudPermissionDefinition('Order'),
    new permission_definition_1.CrudPermissionDefinition('PaymentMethod'),
    new permission_definition_1.CrudPermissionDefinition('Product'),
    new permission_definition_1.CrudPermissionDefinition('Promotion'),
    new permission_definition_1.CrudPermissionDefinition('ShippingMethod'),
    new permission_definition_1.CrudPermissionDefinition('Tag'),
    new permission_definition_1.CrudPermissionDefinition('TaxCategory'),
    new permission_definition_1.CrudPermissionDefinition('TaxRate'),
    new permission_definition_1.CrudPermissionDefinition('Seller'),
    new permission_definition_1.CrudPermissionDefinition('StockLocation'),
    new permission_definition_1.CrudPermissionDefinition('System'),
    new permission_definition_1.CrudPermissionDefinition('Zone'),
];
function getAllPermissionsMetadata(customPermissions) {
    const allPermissions = [...exports.DEFAULT_PERMISSIONS, ...customPermissions];
    return allPermissions.reduce((all, def) => [...all, ...def.getMetadata()], []);
}
exports.getAllPermissionsMetadata = getAllPermissionsMetadata;
exports.CacheKey = {
    GlobalSettings: 'GlobalSettings',
    AllZones: 'AllZones',
    ActiveTaxZone: 'ActiveTaxZone',
    ActiveTaxZone_PPA: 'ActiveTaxZone_PPA',
};
//# sourceMappingURL=constants.js.map