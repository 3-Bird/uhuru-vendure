"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const pick_1 = require("@vendure/common/lib/pick");
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const unique_1 = require("@vendure/common/lib/unique");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const typeorm_1 = require("typeorm");
const request_context_1 = require("../../api/common/request-context");
const errors_1 = require("../../common/error/errors");
const utils_1 = require("../../common/utils");
const config_service_1 = require("../../config/config.service");
const vendure_logger_1 = require("../../config/logger/vendure-logger");
const transactional_connection_1 = require("../../connection/transactional-connection");
const collection_translation_entity_1 = require("../../entity/collection/collection-translation.entity");
const collection_entity_1 = require("../../entity/collection/collection.entity");
const product_variant_entity_1 = require("../../entity/product-variant/product-variant.entity");
const event_bus_1 = require("../../event-bus/event-bus");
const collection_event_1 = require("../../event-bus/events/collection-event");
const collection_modification_event_1 = require("../../event-bus/events/collection-modification-event");
const product_event_1 = require("../../event-bus/events/product-event");
const product_variant_event_1 = require("../../event-bus/events/product-variant-event");
const job_queue_service_1 = require("../../job-queue/job-queue.service");
const config_arg_service_1 = require("../helpers/config-arg/config-arg.service");
const custom_field_relation_service_1 = require("../helpers/custom-field-relation/custom-field-relation.service");
const list_query_builder_1 = require("../helpers/list-query-builder/list-query-builder");
const slug_validator_1 = require("../helpers/slug-validator/slug-validator");
const translatable_saver_1 = require("../helpers/translatable-saver/translatable-saver");
const translator_service_1 = require("../helpers/translator/translator.service");
const move_to_index_1 = require("../helpers/utils/move-to-index");
const asset_service_1 = require("./asset.service");
const channel_service_1 = require("./channel.service");
const role_service_1 = require("./role.service");
/**
 * @description
 * Contains methods relating to {@link Collection} entities.
 *
 * @docsCategory services
 */
let CollectionService = class CollectionService {
    constructor(connection, channelService, assetService, listQueryBuilder, translatableSaver, eventBus, jobQueueService, configService, slugValidator, configArgService, customFieldRelationService, translator, roleService) {
        this.connection = connection;
        this.channelService = channelService;
        this.assetService = assetService;
        this.listQueryBuilder = listQueryBuilder;
        this.translatableSaver = translatableSaver;
        this.eventBus = eventBus;
        this.jobQueueService = jobQueueService;
        this.configService = configService;
        this.slugValidator = slugValidator;
        this.configArgService = configArgService;
        this.customFieldRelationService = customFieldRelationService;
        this.translator = translator;
        this.roleService = roleService;
        this.chunkArray = (array, chunkSize) => {
            const results = [];
            for (let i = 0; i < array.length; i += chunkSize) {
                results.push(array.slice(i, i + chunkSize));
            }
            return results;
        };
    }
    /**
     * @internal
     */
    async onModuleInit() {
        const productEvents$ = this.eventBus.ofType(product_event_1.ProductEvent);
        const variantEvents$ = this.eventBus.ofType(product_variant_event_1.ProductVariantEvent);
        (0, rxjs_1.merge)(productEvents$, variantEvents$)
            .pipe((0, operators_1.debounceTime)(50))
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            .subscribe(async (event) => {
            const collections = await this.connection.rawConnection
                .getRepository(collection_entity_1.Collection)
                .createQueryBuilder('collection')
                .select('collection.id', 'id')
                .getRawMany();
            await this.applyFiltersQueue.add({
                ctx: event.ctx.serialize(),
                collectionIds: collections.map(c => c.id),
                applyToChangedVariantsOnly: true,
            }, { ctx: event.ctx });
        });
        this.applyFiltersQueue = await this.jobQueueService.createQueue({
            name: 'apply-collection-filters',
            process: async (job) => {
                const ctx = request_context_1.RequestContext.deserialize(job.data.ctx);
                vendure_logger_1.Logger.verbose(`Processing ${job.data.collectionIds.length} Collections`);
                let completed = 0;
                for (const collectionId of job.data.collectionIds) {
                    if (job.state === generated_types_1.JobState.CANCELLED) {
                        throw new Error(`Job was cancelled`);
                    }
                    let collection;
                    try {
                        collection = await this.connection.getEntityOrThrow(ctx, collection_entity_1.Collection, collectionId, {
                            retries: 5,
                            retryDelay: 50,
                        });
                    }
                    catch (err) {
                        vendure_logger_1.Logger.warn(`Could not find Collection with id ${collectionId}, skipping`);
                    }
                    completed++;
                    if (collection !== undefined) {
                        let affectedVariantIds = [];
                        try {
                            affectedVariantIds = await this.applyCollectionFiltersInternal(collection, job.data.applyToChangedVariantsOnly);
                        }
                        catch (e) {
                            const translatedCollection = this.translator.translate(collection, ctx);
                            vendure_logger_1.Logger.error('An error occurred when processing the filters for ' +
                                `the collection "${translatedCollection.name}" (id: ${collection.id})`);
                            vendure_logger_1.Logger.error(e.message);
                            continue;
                        }
                        job.setProgress(Math.ceil((completed / job.data.collectionIds.length) * 100));
                        if (affectedVariantIds.length) {
                            // To avoid performance issues on huge collections we first split the affected variant ids into chunks
                            this.chunkArray(affectedVariantIds, 50000).map(chunk => this.eventBus.publish(new collection_modification_event_1.CollectionModificationEvent(ctx, collection, chunk)));
                        }
                    }
                }
            },
        });
    }
    async findAll(ctx, options, relations) {
        const qb = this.listQueryBuilder.build(collection_entity_1.Collection, options, {
            relations: relations !== null && relations !== void 0 ? relations : ['featuredAsset', 'parent', 'channels'],
            channelId: ctx.channelId,
            where: { isRoot: false },
            orderBy: { position: 'ASC' },
            ctx,
        });
        if ((options === null || options === void 0 ? void 0 : options.topLevelOnly) === true) {
            qb.innerJoin('collection.parent', 'parent_filter', 'parent_filter.isRoot = :isRoot', {
                isRoot: true,
            });
        }
        return qb.getManyAndCount().then(async ([collections, totalItems]) => {
            const items = collections.map(collection => this.translator.translate(collection, ctx, ['parent']));
            return {
                items,
                totalItems,
            };
        });
    }
    async findOne(ctx, collectionId, relations) {
        const collection = await this.connection.findOneInChannel(ctx, collection_entity_1.Collection, collectionId, ctx.channelId, {
            relations: relations !== null && relations !== void 0 ? relations : ['featuredAsset', 'assets', 'channels', 'parent'],
            loadEagerRelations: true,
        });
        if (!collection) {
            return;
        }
        return this.translator.translate(collection, ctx, ['parent']);
    }
    async findByIds(ctx, ids, relations) {
        const collections = this.connection.findByIdsInChannel(ctx, collection_entity_1.Collection, ids, ctx.channelId, {
            relations: relations !== null && relations !== void 0 ? relations : ['featuredAsset', 'assets', 'channels', 'parent'],
            loadEagerRelations: true,
        });
        return collections.then(values => values.map(collection => this.translator.translate(collection, ctx, ['parent'])));
    }
    async findOneBySlug(ctx, slug, relations) {
        var _a, _b;
        const translations = await this.connection.getRepository(ctx, collection_translation_entity_1.CollectionTranslation).find({
            relations: ['base'],
            where: {
                slug,
                base: {
                    channels: {
                        id: ctx.channelId,
                    },
                },
            },
        });
        if (!(translations === null || translations === void 0 ? void 0 : translations.length)) {
            return;
        }
        const bestMatch = (_b = (_a = translations.find(t => t.languageCode === ctx.languageCode)) !== null && _a !== void 0 ? _a : translations.find(t => t.languageCode === ctx.channel.defaultLanguageCode)) !== null && _b !== void 0 ? _b : translations[0];
        return this.findOne(ctx, bestMatch.base.id, relations);
    }
    /**
     * @description
     * Returns all configured CollectionFilters, as specified by the {@link CatalogOptions}.
     */
    getAvailableFilters(ctx) {
        return this.configService.catalogOptions.collectionFilters.map(f => f.toGraphQlType(ctx));
    }
    async getParent(ctx, collectionId) {
        var _a;
        const parent = await this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .createQueryBuilder('collection')
            .leftJoinAndSelect('collection.translations', 'translation')
            .where(qb => `collection.id = ${qb
            .subQuery()
            .select(`${qb.escape('child')}.${qb.escape('parentId')}`)
            .from(collection_entity_1.Collection, 'child')
            .where('child.id = :id', { id: collectionId })
            .getQuery()}`)
            .getOne();
        return (_a = (parent && this.translator.translate(parent, ctx))) !== null && _a !== void 0 ? _a : undefined;
    }
    /**
     * @description
     * Returns all child Collections of the Collection with the given id.
     */
    async getChildren(ctx, collectionId) {
        return this.getDescendants(ctx, collectionId, 1);
    }
    /**
     * @description
     * Returns an array of name/id pairs representing all ancestor Collections up
     * to the Root Collection.
     */
    async getBreadcrumbs(ctx, collection) {
        const rootCollection = await this.getRootCollection(ctx);
        if ((0, utils_1.idsAreEqual)(collection.id, rootCollection.id)) {
            return [(0, pick_1.pick)(rootCollection, ['id', 'name', 'slug'])];
        }
        const pickProps = (0, pick_1.pick)(['id', 'name', 'slug']);
        const ancestors = await this.getAncestors(collection.id, ctx);
        if (collection.name == null || collection.slug == null) {
            collection = this.translator.translate(await this.connection.getEntityOrThrow(ctx, collection_entity_1.Collection, collection.id), ctx);
        }
        return [pickProps(rootCollection), ...ancestors.map(pickProps).reverse(), pickProps(collection)];
    }
    /**
     * @description
     * Returns all Collections which are associated with the given Product ID.
     */
    async getCollectionsByProductId(ctx, productId, publicOnly) {
        const qb = this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .createQueryBuilder('collection')
            .leftJoinAndSelect('collection.translations', 'translation')
            .leftJoin('collection.productVariants', 'variant')
            .where('variant.product = :productId', { productId })
            .groupBy('collection.id, translation.id')
            .orderBy('collection.id', 'ASC');
        if (publicOnly) {
            qb.andWhere('collection.isPrivate = :isPrivate', { isPrivate: false });
        }
        const result = await qb.getMany();
        return result.map(collection => this.translator.translate(collection, ctx));
    }
    /**
     * @description
     * Returns the descendants of a Collection as a flat array. The depth of the traversal can be limited
     * with the maxDepth argument. So to get only the immediate children, set maxDepth = 1.
     */
    async getDescendants(ctx, rootId, maxDepth = Number.MAX_SAFE_INTEGER) {
        const getChildren = async (id, _descendants = [], depth = 1) => {
            const children = await this.connection
                .getRepository(ctx, collection_entity_1.Collection)
                .find({ where: { parent: { id } }, order: { position: 'ASC' } });
            for (const child of children) {
                _descendants.push(child);
                if (depth < maxDepth) {
                    await getChildren(child.id, _descendants, depth++);
                }
            }
            return _descendants;
        };
        const descendants = await getChildren(rootId);
        return descendants.map(c => this.translator.translate(c, ctx));
    }
    async getAncestors(collectionId, ctx) {
        const getParent = async (id, _ancestors = []) => {
            const parent = await this.connection
                .getRepository(ctx, collection_entity_1.Collection)
                .createQueryBuilder()
                .relation(collection_entity_1.Collection, 'parent')
                .of(id)
                .loadOne();
            if (parent) {
                if (!parent.isRoot) {
                    _ancestors.push(parent);
                    return getParent(parent.id, _ancestors);
                }
            }
            return _ancestors;
        };
        const ancestors = await getParent(collectionId);
        return this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .find({ where: { id: (0, typeorm_1.In)(ancestors.map(c => c.id)) } })
            .then(categories => {
            const resultCategories = [];
            ancestors.forEach(a => {
                const category = categories.find(c => c.id === a.id);
                if (category) {
                    resultCategories.push(ctx ? this.translator.translate(category, ctx) : category);
                }
            });
            return resultCategories;
        });
    }
    async previewCollectionVariants(ctx, input, options, relations) {
        var _a, _b;
        const applicableFilters = this.getCollectionFiltersFromInput(input);
        if (input.parentId && input.inheritFilters) {
            const parentFilters = (_b = (_a = (await this.findOne(ctx, input.parentId, []))) === null || _a === void 0 ? void 0 : _a.filters) !== null && _b !== void 0 ? _b : [];
            const ancestorFilters = await this.getAncestors(input.parentId).then(ancestors => ancestors.reduce((_filters, c) => [..._filters, ...(c.filters || [])], []));
            applicableFilters.push(...parentFilters, ...ancestorFilters);
        }
        let qb = this.listQueryBuilder.build(product_variant_entity_1.ProductVariant, options, {
            relations: relations !== null && relations !== void 0 ? relations : ['taxCategory'],
            channelId: ctx.channelId,
            where: { deletedAt: (0, typeorm_1.IsNull)() },
            ctx,
            entityAlias: 'productVariant',
        });
        const { collectionFilters } = this.configService.catalogOptions;
        for (const filterType of collectionFilters) {
            const filtersOfType = applicableFilters.filter(f => f.code === filterType.code);
            if (filtersOfType.length) {
                for (const filter of filtersOfType) {
                    qb = filterType.apply(qb, filter.args);
                }
            }
        }
        return qb.getManyAndCount().then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    async create(ctx, input) {
        await this.slugValidator.validateSlugs(ctx, input, collection_translation_entity_1.CollectionTranslation);
        const collection = await this.translatableSaver.create({
            ctx,
            input,
            entityType: collection_entity_1.Collection,
            translationType: collection_translation_entity_1.CollectionTranslation,
            beforeSave: async (coll) => {
                await this.channelService.assignToCurrentChannel(coll, ctx);
                const parent = await this.getParentCollection(ctx, input.parentId);
                if (parent) {
                    coll.parent = parent;
                }
                coll.position = await this.getNextPositionInParent(ctx, input.parentId || undefined);
                coll.filters = this.getCollectionFiltersFromInput(input);
                await this.assetService.updateFeaturedAsset(ctx, coll, input);
            },
        });
        await this.assetService.updateEntityAssets(ctx, collection, input);
        const collectionWithRelations = await this.customFieldRelationService.updateRelations(ctx, collection_entity_1.Collection, input, collection);
        await this.applyFiltersQueue.add({
            ctx: ctx.serialize(),
            collectionIds: [collection.id],
        }, { ctx });
        await this.eventBus.publish(new collection_event_1.CollectionEvent(ctx, collectionWithRelations, 'created', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, collection.id));
    }
    async update(ctx, input) {
        await this.slugValidator.validateSlugs(ctx, input, collection_translation_entity_1.CollectionTranslation);
        const collection = await this.translatableSaver.update({
            ctx,
            input,
            entityType: collection_entity_1.Collection,
            translationType: collection_translation_entity_1.CollectionTranslation,
            beforeSave: async (coll) => {
                if (input.filters) {
                    coll.filters = this.getCollectionFiltersFromInput(input);
                }
                await this.assetService.updateFeaturedAsset(ctx, coll, input);
                await this.assetService.updateEntityAssets(ctx, coll, input);
            },
        });
        await this.customFieldRelationService.updateRelations(ctx, collection_entity_1.Collection, input, collection);
        if (input.filters) {
            await this.applyFiltersQueue.add({
                ctx: ctx.serialize(),
                collectionIds: [collection.id],
                applyToChangedVariantsOnly: false,
            }, { ctx });
        }
        else {
            const affectedVariantIds = await this.getCollectionProductVariantIds(collection);
            await this.eventBus.publish(new collection_modification_event_1.CollectionModificationEvent(ctx, collection, affectedVariantIds));
        }
        await this.eventBus.publish(new collection_event_1.CollectionEvent(ctx, collection, 'updated', input));
        return (0, utils_1.assertFound)(this.findOne(ctx, collection.id));
    }
    async delete(ctx, id) {
        const collection = await this.connection.getEntityOrThrow(ctx, collection_entity_1.Collection, id, {
            channelId: ctx.channelId,
        });
        const deletedCollection = new collection_entity_1.Collection(collection);
        const descendants = await this.getDescendants(ctx, collection.id);
        for (const coll of [...descendants.reverse(), collection]) {
            const affectedVariantIds = await this.getCollectionProductVariantIds(coll);
            const deletedColl = new collection_entity_1.Collection(coll);
            // To avoid performance issues on huge collections, we first delete the links
            // between the product variants and the collection by chunks
            const chunkedDeleteIds = this.chunkArray(affectedVariantIds, 500);
            for (const chunkedDeleteId of chunkedDeleteIds) {
                await this.connection.rawConnection
                    .createQueryBuilder()
                    .relation(collection_entity_1.Collection, 'productVariants')
                    .of(collection)
                    .remove(chunkedDeleteId);
            }
            await this.connection.getRepository(ctx, collection_entity_1.Collection).remove(coll);
            await this.eventBus.publish(new collection_modification_event_1.CollectionModificationEvent(ctx, deletedColl, affectedVariantIds));
        }
        await this.eventBus.publish(new collection_event_1.CollectionEvent(ctx, deletedCollection, 'deleted', id));
        return {
            result: generated_types_1.DeletionResult.DELETED,
        };
    }
    /**
     * @description
     * Moves a Collection by specifying the parent Collection ID, and an index representing the order amongst
     * its siblings.
     */
    async move(ctx, input) {
        const target = await this.connection.getEntityOrThrow(ctx, collection_entity_1.Collection, input.collectionId, {
            channelId: ctx.channelId,
            relations: ['parent'],
        });
        const descendants = await this.getDescendants(ctx, input.collectionId);
        if ((0, utils_1.idsAreEqual)(input.parentId, target.id) ||
            descendants.some(cat => (0, utils_1.idsAreEqual)(input.parentId, cat.id))) {
            throw new errors_1.IllegalOperationError('error.cannot-move-collection-into-self');
        }
        let siblings = await this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .createQueryBuilder('collection')
            .leftJoin('collection.parent', 'parent')
            .where('parent.id = :id', { id: input.parentId })
            .getMany();
        if (!(0, utils_1.idsAreEqual)(target.parent.id, input.parentId)) {
            target.parent = new collection_entity_1.Collection({ id: input.parentId });
        }
        siblings = (0, move_to_index_1.moveToIndex)(input.index, target, siblings);
        await this.connection.getRepository(ctx, collection_entity_1.Collection).save(siblings);
        await this.applyFiltersQueue.add({
            ctx: ctx.serialize(),
            collectionIds: [target.id],
        }, { ctx });
        return (0, utils_1.assertFound)(this.findOne(ctx, input.collectionId));
    }
    getCollectionFiltersFromInput(input) {
        const filters = [];
        if (input.filters) {
            for (const filter of input.filters) {
                filters.push(this.configArgService.parseInput('CollectionFilter', filter));
            }
        }
        return filters;
    }
    /**
     * Applies the CollectionFilters and returns the IDs of ProductVariants that need to be added or removed.
     */
    async applyCollectionFiltersInternal(collection, applyToChangedVariantsOnly = true) {
        const masterConnection = this.connection.rawConnection.createQueryRunner('master').connection;
        const ancestorFilters = await this.getAncestorFilters(collection);
        const filters = [...ancestorFilters, ...(collection.filters || [])];
        const { collectionFilters } = this.configService.catalogOptions;
        // Create a basic query to retrieve the IDs of product variants that match the collection filters
        let filteredQb = masterConnection
            .getRepository(product_variant_entity_1.ProductVariant)
            .createQueryBuilder('productVariant')
            .select('productVariant.id', 'id')
            .setFindOptions({ loadEagerRelations: false });
        // If there are no filters, we need to ensure that the query returns no results
        if (filters.length === 0) {
            filteredQb.andWhere('1 = 0');
        }
        //  Applies the CollectionFilters and returns an array of ProductVariant entities which match
        for (const filterType of collectionFilters) {
            const filtersOfType = filters.filter(f => f.code === filterType.code);
            if (filtersOfType.length) {
                for (const filter of filtersOfType) {
                    filteredQb = filterType.apply(filteredQb, filter.args);
                }
            }
        }
        // Subquery for existing variants in the collection
        const existingVariantsQb = masterConnection
            .getRepository(product_variant_entity_1.ProductVariant)
            .createQueryBuilder('variant')
            .select('variant.id', 'id')
            .setFindOptions({ loadEagerRelations: false })
            .innerJoin('variant.collections', 'collection', 'collection.id = :id', { id: collection.id });
        // Using CTE to find variants to add
        const addQb = masterConnection
            .createQueryBuilder()
            .addCommonTableExpression(filteredQb, '_filtered_variants')
            .addCommonTableExpression(existingVariantsQb, '_existing_variants')
            .select('filtered_variants.id')
            .from('_filtered_variants', 'filtered_variants')
            .leftJoin('_existing_variants', 'existing_variants', 'filtered_variants.id = existing_variants.id')
            .where('existing_variants.id IS NULL');
        // Using CTE to find the variants to be deleted
        const removeQb = masterConnection
            .createQueryBuilder()
            .addCommonTableExpression(filteredQb, '_filtered_variants')
            .addCommonTableExpression(existingVariantsQb, '_existing_variants')
            .select('existing_variants.id')
            .from('_existing_variants', 'existing_variants')
            .leftJoin('_filtered_variants', 'filtered_variants', 'existing_variants.id = filtered_variants.id')
            .where('filtered_variants.id IS NULL')
            .setParameters({ id: collection.id });
        const [toAddIds, toRemoveIds] = await Promise.all([
            addQb.getRawMany().then(results => results.map(result => result.id)),
            removeQb.getRawMany().then(results => results.map(result => result.id)),
        ]);
        try {
            await this.connection.rawConnection.transaction(async (transactionalEntityManager) => {
                const chunkedDeleteIds = this.chunkArray(toRemoveIds, 5000);
                const chunkedAddIds = this.chunkArray(toAddIds, 5000);
                await Promise.all([
                    // Delete variants that should no longer be in the collection
                    ...chunkedDeleteIds.map(chunk => transactionalEntityManager
                        .createQueryBuilder()
                        .relation(collection_entity_1.Collection, 'productVariants')
                        .of(collection)
                        .remove(chunk)),
                    // Adding options that should be in the collection
                    ...chunkedAddIds.map(chunk => transactionalEntityManager
                        .createQueryBuilder()
                        .relation(collection_entity_1.Collection, 'productVariants')
                        .of(collection)
                        .add(chunk)),
                ]);
            });
        }
        catch (e) {
            vendure_logger_1.Logger.error(e);
        }
        if (applyToChangedVariantsOnly) {
            return [...toAddIds, ...toRemoveIds];
        }
        return [
            ...(await existingVariantsQb.getRawMany().then(results => results.map(result => result.id))),
            ...toRemoveIds,
        ];
    }
    /**
     * Gets all filters of ancestor Collections while respecting the `inheritFilters` setting of each.
     * As soon as `inheritFilters === false` is encountered, the collected filters are returned.
     */
    async getAncestorFilters(collection) {
        const ancestorFilters = [];
        if (collection.inheritFilters) {
            const ancestors = await this.getAncestors(collection.id);
            for (const ancestor of ancestors) {
                ancestorFilters.push(...ancestor.filters);
                if (ancestor.inheritFilters === false) {
                    return ancestorFilters;
                }
            }
        }
        return ancestorFilters;
    }
    /**
     * Returns the IDs of the Collection's ProductVariants.
     */
    async getCollectionProductVariantIds(collection, ctx) {
        if (collection.productVariants) {
            return collection.productVariants.map(v => v.id);
        }
        else {
            const productVariants = await this.connection
                .getRepository(ctx, product_variant_entity_1.ProductVariant)
                .createQueryBuilder('variant')
                .select('variant.id', 'id')
                .innerJoin('variant.collections', 'collection', 'collection.id = :id', { id: collection.id })
                .getRawMany();
            return productVariants.map(v => v.id);
        }
    }
    /**
     * Returns the next position value in the given parent collection.
     */
    async getNextPositionInParent(ctx, maybeParentId) {
        const parentId = maybeParentId || (await this.getRootCollection(ctx)).id;
        const result = await this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .createQueryBuilder('collection')
            .leftJoin('collection.parent', 'parent')
            .select('MAX(collection.position)', 'index')
            .where('parent.id = :id', { id: parentId })
            .getRawOne();
        const index = result.index;
        return (typeof index === 'number' ? index : 0) + 1;
    }
    async getParentCollection(ctx, parentId) {
        if (parentId) {
            return this.connection
                .getRepository(ctx, collection_entity_1.Collection)
                .createQueryBuilder('collection')
                .leftJoin('collection.channels', 'channel')
                .where('collection.id = :id', { id: parentId })
                .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
                .getOne()
                .then(result => result !== null && result !== void 0 ? result : undefined);
        }
        else {
            return this.getRootCollection(ctx);
        }
    }
    async getRootCollection(ctx) {
        const cachedRoot = this.rootCollection;
        if (cachedRoot) {
            return cachedRoot;
        }
        const existingRoot = await this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .createQueryBuilder('collection')
            .leftJoin('collection.channels', 'channel')
            .leftJoinAndSelect('collection.translations', 'translation')
            .where('collection.isRoot = :isRoot', { isRoot: true })
            .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
            .getOne();
        if (existingRoot) {
            this.rootCollection = this.translator.translate(existingRoot, ctx);
            return this.rootCollection;
        }
        // We purposefully do not use the ctx in saving the new root Collection
        // so that even if the outer transaction fails, the root collection will still
        // get persisted.
        const rootTranslation = await this.connection.rawConnection.getRepository(collection_translation_entity_1.CollectionTranslation).save(new collection_translation_entity_1.CollectionTranslation({
            languageCode: this.configService.defaultLanguageCode,
            name: shared_constants_1.ROOT_COLLECTION_NAME,
            description: 'The root of the Collection tree.',
            slug: shared_constants_1.ROOT_COLLECTION_NAME,
        }));
        const newRoot = await this.connection.rawConnection.getRepository(collection_entity_1.Collection).save(new collection_entity_1.Collection({
            isRoot: true,
            position: 0,
            translations: [rootTranslation],
            channels: [ctx.channel],
            filters: [],
        }));
        this.rootCollection = this.translator.translate(newRoot, ctx);
        return this.rootCollection;
    }
    /**
     * @description
     * Assigns Collections to the specified Channel
     */
    async assignCollectionsToChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.UpdateCollection,
            generated_types_1.Permission.UpdateCatalog,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        const collectionsToAssign = await this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .find({ where: { id: (0, typeorm_1.In)(input.collectionIds) }, relations: { assets: true } });
        await Promise.all(collectionsToAssign.map(collection => this.channelService.assignToChannels(ctx, collection_entity_1.Collection, collection.id, [input.channelId])));
        const assetIds = (0, unique_1.unique)([].concat(...collectionsToAssign.map(c => c.assets.map(a => a.assetId))));
        await this.assetService.assignToChannel(ctx, { channelId: input.channelId, assetIds });
        await this.applyFiltersQueue.add({
            ctx: ctx.serialize(),
            collectionIds: collectionsToAssign.map(collection => collection.id),
        }, { ctx });
        return this.connection
            .findByIdsInChannel(ctx, collection_entity_1.Collection, collectionsToAssign.map(c => c.id), ctx.channelId, {})
            .then(collections => collections.map(collection => this.translator.translate(collection, ctx)));
    }
    /**
     * @description
     * Remove Collections from the specified Channel
     */
    async removeCollectionsFromChannel(ctx, input) {
        const hasPermission = await this.roleService.userHasAnyPermissionsOnChannel(ctx, input.channelId, [
            generated_types_1.Permission.DeleteCollection,
            generated_types_1.Permission.DeleteCatalog,
        ]);
        if (!hasPermission) {
            throw new errors_1.ForbiddenError();
        }
        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        if ((0, utils_1.idsAreEqual)(input.channelId, defaultChannel.id)) {
            throw new errors_1.UserInputError('error.items-cannot-be-removed-from-default-channel');
        }
        const collectionsToRemove = await this.connection
            .getRepository(ctx, collection_entity_1.Collection)
            .find({ where: { id: (0, typeorm_1.In)(input.collectionIds) } });
        await Promise.all(collectionsToRemove.map(async (collection) => {
            const affectedVariantIds = await this.getCollectionProductVariantIds(collection);
            await this.channelService.removeFromChannels(ctx, collection_entity_1.Collection, collection.id, [
                input.channelId,
            ]);
            await this.eventBus.publish(new collection_modification_event_1.CollectionModificationEvent(ctx, collection, affectedVariantIds));
        }));
        return this.connection
            .findByIdsInChannel(ctx, collection_entity_1.Collection, collectionsToRemove.map(c => c.id), ctx.channelId, {})
            .then(collections => collections.map(collection => this.translator.translate(collection, ctx)));
    }
};
exports.CollectionService = CollectionService;
exports.CollectionService = CollectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactional_connection_1.TransactionalConnection,
        channel_service_1.ChannelService,
        asset_service_1.AssetService,
        list_query_builder_1.ListQueryBuilder,
        translatable_saver_1.TranslatableSaver,
        event_bus_1.EventBus,
        job_queue_service_1.JobQueueService,
        config_service_1.ConfigService,
        slug_validator_1.SlugValidator,
        config_arg_service_1.ConfigArgService,
        custom_field_relation_service_1.CustomFieldRelationService,
        translator_service_1.TranslatorService,
        role_service_1.RoleService])
], CollectionService);
//# sourceMappingURL=collection.service.js.map