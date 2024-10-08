import { OnApplicationBootstrap } from '@nestjs/common';
import { ID, Type } from '@vendure/common/lib/shared-types';
import { FindOneOptions, FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
import { RequestContext } from '../../../api';
import { FilterParameter, ListQueryOptions, NullOptionals } from '../../../common';
import { ConfigService } from '../../../config';
import { TransactionalConnection } from '../../../connection';
import { VendureEntity } from '../../../entity';
/**
 * @description
 * Options which can be passed to the ListQueryBuilder's `build()` method.
 *
 * @docsCategory data-access
 * @docsPage ListQueryBuilder
 */
export type ExtendedListQueryOptions<T extends VendureEntity> = {
    relations?: string[];
    channelId?: ID;
    where?: FindOptionsWhere<T>;
    orderBy?: FindOneOptions<T>['order'];
    /**
     * @description
     * Allows you to specify the alias used for the entity `T` in the generated SQL query.
     * Defaults to the entity class name lower-cased, i.e. `ProductVariant` -> `'productvariant'`.
     *
     * @since 1.6.0
     */
    entityAlias?: string;
    /**
     * @description
     * When a RequestContext is passed, then the query will be
     * executed as part of any outer transaction.
     */
    ctx?: RequestContext;
    /**
     * @description
     * One of the main tasks of the ListQueryBuilder is to auto-generate filter and sort queries based on the
     * available columns of a given entity. However, it may also be sometimes desirable to allow filter/sort
     * on a property of a relation. In this case, the `customPropertyMap` can be used to define a property
     * of the `options.sort` or `options.filter` which does not correspond to a direct column of the current
     * entity, and then provide a mapping to the related property to be sorted/filtered.
     *
     * Example: we want to allow sort/filter by and Order's `customerLastName`. The actual lastName property is
     * not a column in the Order table, it exists on the Customer entity, and Order has a relation to Customer via
     * `Order.customer`. Therefore, we can define a customPropertyMap like this:
     *
     * @example
     * ```GraphQL
     * """
     * Manually extend the filter & sort inputs to include the new
     * field that we want to be able to use in building list queries.
     * """
     * input OrderFilterParameter {
     *     customerLastName: StringOperators
     * }
     *
     * input OrderSortParameter {
     *     customerLastName: SortOrder
     * }
     * ```
     *
     * @example
     * ```ts
     * const qb = this.listQueryBuilder.build(Order, options, {
     *   relations: ['customer'],
     *   customPropertyMap: {
     *     // Tell TypeORM how to map that custom
     *     // sort/filter field to the property on a
     *     // related entity.
     *     customerLastName: 'customer.lastName',
     *   },
     * };
     * ```
     * We can now use the `customerLastName` property to filter or sort
     * on the list query:
     *
     * @example
     * ```GraphQL
     * query {
     *   myOrderQuery(options: {
     *     filter: {
     *       customerLastName: { contains: "sm" }
     *     }
     *   }) {
     *     # ...
     *   }
     * }
     * ```
     */
    customPropertyMap?: {
        [name: string]: string;
    };
    /**
     * @description
     * When set to `true`, the configured `shopListQueryLimit` and `adminListQueryLimit` values will be ignored,
     * allowing unlimited results to be returned. Use caution when exposing an unlimited list query to the public,
     * as it could become a vector for a denial of service attack if an attacker requests a very large list.
     *
     * @since 2.0.2
     * @default false
     */
    ignoreQueryLimits?: boolean;
};
/**
 * @description
 * This helper class is used when fetching entities the database from queries which return a {@link PaginatedList} type.
 * These queries all follow the same format:
 *
 * In the GraphQL definition, they return a type which implements the `Node` interface, and the query returns a
 * type which implements the `PaginatedList` interface:
 *
 * ```GraphQL
 * type BlogPost implements Node {
 *   id: ID!
 *   published: DateTime!
 *   title: String!
 *   body: String!
 * }
 *
 * type BlogPostList implements PaginatedList {
 *   items: [BlogPost!]!
 *   totalItems: Int!
 * }
 *
 * # Generated at run-time by Vendure
 * input BlogPostListOptions
 *
 * extend type Query {
 *    blogPosts(options: BlogPostListOptions): BlogPostList!
 * }
 * ```
 * When Vendure bootstraps, it will find the `BlogPostListOptions` input and, because it is used in a query
 * returning a `PaginatedList` type, it knows that it should dynamically generate this input. This means
 * all primitive field of the `BlogPost` type (namely, "published", "title" and "body") will have `filter` and
 * `sort` inputs created for them, as well a `skip` and `take` fields for pagination.
 *
 * Your resolver function will then look like this:
 *
 * ```ts
 * \@Resolver()
 * export class BlogPostResolver
 *   constructor(private blogPostService: BlogPostService) {}
 *
 *   \@Query()
 *   async blogPosts(
 *     \@Ctx() ctx: RequestContext,
 *     \@Args() args: any,
 *   ): Promise<PaginatedList<BlogPost>> {
 *     return this.blogPostService.findAll(ctx, args.options || undefined);
 *   }
 * }
 * ```
 *
 * and the corresponding service will use the ListQueryBuilder:
 *
 * ```ts
 * \@Injectable()
 * export class BlogPostService {
 *   constructor(private listQueryBuilder: ListQueryBuilder) {}
 *
 *   findAll(ctx: RequestContext, options?: ListQueryOptions<BlogPost>) {
 *     return this.listQueryBuilder
 *       .build(BlogPost, options)
 *       .getManyAndCount()
 *       .then(async ([items, totalItems]) => {
 *         return { items, totalItems };
 *       });
 *   }
 * }
 * ```
 *
 * @docsCategory data-access
 * @docsPage ListQueryBuilder
 * @docsWeight 0
 */
export declare class ListQueryBuilder implements OnApplicationBootstrap {
    private connection;
    private configService;
    constructor(connection: TransactionalConnection, configService: ConfigService);
    /** @internal */
    onApplicationBootstrap(): any;
    /**
     * @description
     * Used to determine whether a list query `filter` object contains the
     * given property, either at the top level or nested inside a boolean
     * `_and` or `_or` expression.
     *
     * This is useful when a custom property map is used to map a filter
     * field to a related entity, and we need to determine whether the
     * filter object contains that property, which then means we would need
     * to join that relation.
     */
    filterObjectHasProperty<FP extends FilterParameter<VendureEntity>>(
        filterObject: FP | NullOptionals<FP> | null | undefined,
        property: keyof FP,
    ): boolean;
    build<T extends VendureEntity>(
        entity: Type<T>,
        options?: ListQueryOptions<T>,
        extendedOptions?: ExtendedListQueryOptions<T>,
    ): SelectQueryBuilder<T>;
    private addNestedWhereClause;
    private parseTakeSkipParams;
    /**
     * @description
     * As part of list optimization, we only join the minimum required relations which are needed to
     * get the base list query. Other relations are then joined individually in the patched `getManyAndCount()`
     * method.
     */
    private getMinimumRequiredRelations;
    private customPropertyIsBeingUsed;
    private isPropertyUsedInFilter;
    /**
     * If a customPropertyMap is provided, we need to take the path provided and convert it to the actual
     * relation aliases being used by the SelectQueryBuilder.
     *
     * This method mutates the customPropertyMap object.
     */
    private normalizeCustomPropertyMap;
    /**
     * Some calculated columns (those with the `@Calculated()` decorator) require extra joins in order
     * to derive the data needed for their expressions.
     */
    private joinCalculatedColumnRelations;
    /**
     * @description
     * If this entity is Translatable, and we are sorting on one of the translatable fields,
     * then we need to apply appropriate WHERE clauses to limit
     * the joined translation relations.
     */
    private applyTranslationConditions;
    /**
     * Registers a user-defined function (for flavors of SQLite driver that support it)
     * so that we can run regex filters on string fields.
     */
    private registerSQLiteRegexpFunction;
    private isRelationAlreadyJoined;
}
