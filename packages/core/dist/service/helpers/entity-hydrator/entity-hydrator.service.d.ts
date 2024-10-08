import { RequestContext } from '../../../api/common/request-context';
import { TransactionalConnection } from '../../../connection/transactional-connection';
import { VendureEntity } from '../../../entity/base/base.entity';
import { ProductPriceApplicator } from '../product-price-applicator/product-price-applicator';
import { TranslatorService } from '../translator/translator.service';
import { HydrateOptions } from './entity-hydrator-types';
/**
 * @description
 * This is a helper class which is used to "hydrate" entity instances, which means to populate them
 * with the specified relations. This is useful when writing plugin code which receives an entity,
 * and you need to ensure that one or more relations are present.
 *
 * @example
 * ```ts
 * import { Injectable } from '\@nestjs/common';
 * import { ID, RequestContext, EntityHydrator, ProductVariantService } from '\@vendure/core';
 *
 * \@Injectable()
 * export class MyService {
 *
 *   constructor(
 *      // highlight-next-line
 *      private entityHydrator: EntityHydrator,
 *      private productVariantService: ProductVariantService,
 *   ) {}
 *
 *   myMethod(ctx: RequestContext, variantId: ID) {
 *     const product = await this.productVariantService
 *       .getProductForVariant(ctx, variantId);
 *
 *     // at this stage, we don't know which of the Product relations
 *     // will be joined at runtime.
 *
 *     // highlight-start
 *     await this.entityHydrator
 *       .hydrate(ctx, product, { relations: ['facetValues.facet' ]});
 *
 *     // You can be sure now that the `facetValues` & `facetValues.facet` relations are populated
 *     // highlight-end
 *   }
 * }
 *```
 *
 * In this above example, the `product` instance will now have the `facetValues` relation
 * available, and those FacetValues will have their `facet` relations joined too.
 *
 * This `hydrate` method will _also_ automatically take care or translating any
 * translatable entities (e.g. Product, Collection, Facet), and if the `applyProductVariantPrices`
 * options is used (see {@link HydrateOptions}), any related ProductVariant will have the correct
 * Channel-specific prices applied to them.
 *
 * Custom field relations may also be hydrated:
 *
 * @example
 * ```ts
 * const customer = await this.customerService
 *   .findOne(ctx, id);
 *
 * await this.entityHydrator
 *   .hydrate(ctx, customer, { relations: ['customFields.avatar' ]});
 * ```
 *
 * @docsCategory data-access
 * @since 1.3.0
 */
export declare class EntityHydrator {
    private connection;
    private productPriceApplicator;
    private translator;
    constructor(
        connection: TransactionalConnection,
        productPriceApplicator: ProductPriceApplicator,
        translator: TranslatorService,
    );
    /**
     * @description
     * Hydrates (joins) the specified relations to the target entity instance. This method
     * mutates the `target` entity.
     *
     * @example
     * ```ts
     * await this.entityHydrator.hydrate(ctx, product, {
     *   relations: [
     *     'variants.stockMovements'
     *     'optionGroups.options',
     *     'featuredAsset',
     *   ],
     *   applyProductVariantPrices: true,
     * });
     * ```
     *
     * @since 1.3.0
     */
    hydrate<Entity extends VendureEntity>(
        ctx: RequestContext,
        target: Entity,
        options: HydrateOptions<Entity>,
    ): Promise<Entity>;
    private assignSettableProperties;
    /**
     * Compares the requested relations against the actual existing relations on the target entity,
     * and returns an array of all missing relation paths that would need to be fetched.
     */
    private getMissingRelations;
    private getRequiredProductVariantRelations;
    /**
     * Returns an instance of the related entity at the given path. E.g. a path of `['variants', 'featuredAsset']`
     * will return an Asset instance.
     */
    private getRelationEntityAtPath;
    private getRelationEntityTypeAtPath;
    private isTranslatable;
}
