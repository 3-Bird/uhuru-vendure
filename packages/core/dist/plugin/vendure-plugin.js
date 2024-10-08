"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendurePlugin = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const core_1 = require("@nestjs/core");
const pick_1 = require("@vendure/common/lib/pick");
const plugin_metadata_1 = require("./plugin-metadata");
/**
 * @description
 * The VendurePlugin decorator is a means of configuring and/or extending the functionality of the Vendure server. A Vendure plugin is
 * a [Nestjs Module](https://docs.nestjs.com/modules), with optional additional metadata defining things like extensions to the GraphQL API, custom
 * configuration or new database entities.
 *
 * As well as configuring the app, a plugin may also extend the GraphQL schema by extending existing types or adding
 * entirely new types. Database entities and resolvers can also be defined to handle the extended GraphQL types.
 *
 * @example
 * ```ts
 * import { Controller, Get } from '\@nestjs/common';
 * import { Ctx, PluginCommonModule, ProductService, RequestContext, VendurePlugin } from '\@vendure/core';
 *
 * \@Controller('products')
 * export class ProductsController {
 *     constructor(private productService: ProductService) {}
 *
 *     \@Get()
 *     findAll(\@Ctx() ctx: RequestContext) {
 *         return this.productService.findAll(ctx);
 *     }
 * }
 *
 *
 * //A simple plugin which adds a REST endpoint for querying products.
 * \@VendurePlugin({
 *     imports: [PluginCommonModule],
 *     controllers: [ProductsController],
 * })
 * export class RestPlugin {}
 * ```
 *
 * @docsCategory plugin
 */
function VendurePlugin(pluginMetadata) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return (target) => {
        for (const metadataProperty of Object.values(plugin_metadata_1.PLUGIN_METADATA)) {
            const property = metadataProperty;
            if (pluginMetadata[property] != null) {
                Reflect.defineMetadata(property, pluginMetadata[property], target);
            }
        }
        const nestModuleMetadata = (0, pick_1.pick)(pluginMetadata, Object.values(constants_1.MODULE_METADATA));
        // Automatically add any of the Plugin's "providers" to the "exports" array. This is done
        // because when a plugin defines GraphQL resolvers, these resolvers are used to dynamically
        // created a new Module in the ApiModule, and if those resolvers depend on any providers,
        // the must be exported. See the function {@link createDynamicGraphQlModulesForPlugins}
        // for the implementation.
        // However, we must omit any global providers (https://github.com/vendure-ecommerce/vendure/issues/837)
        const nestGlobalProviderTokens = [core_1.APP_INTERCEPTOR, core_1.APP_FILTER, core_1.APP_GUARD, core_1.APP_PIPE];
        const exportedProviders = (nestModuleMetadata.providers || []).filter(provider => {
            if (isNamedProvider(provider)) {
                if (nestGlobalProviderTokens.includes(provider.provide)) {
                    return false;
                }
            }
            return true;
        });
        nestModuleMetadata.exports = [...(nestModuleMetadata.exports || []), ...exportedProviders];
        (0, common_1.Module)(nestModuleMetadata)(target);
    };
}
exports.VendurePlugin = VendurePlugin;
function isNamedProvider(provider) {
    return provider.hasOwnProperty('provide');
}
//# sourceMappingURL=vendure-plugin.js.map