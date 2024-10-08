import {
    DeletionResponse,
    MutationAddOptionGroupToProductArgs,
    MutationAssignProductsToChannelArgs,
    MutationAssignProductVariantsToChannelArgs,
    MutationCreateProductArgs,
    MutationCreateProductVariantsArgs,
    MutationDeleteProductArgs,
    MutationDeleteProductsArgs,
    MutationDeleteProductVariantArgs,
    MutationDeleteProductVariantsArgs,
    MutationRemoveOptionGroupFromProductArgs,
    MutationRemoveProductsFromChannelArgs,
    MutationRemoveProductVariantsFromChannelArgs,
    MutationUpdateProductArgs,
    MutationUpdateProductsArgs,
    MutationUpdateProductVariantsArgs,
    QueryProductArgs,
    QueryProductsArgs,
    QueryProductVariantArgs,
    QueryProductVariantsArgs,
    RemoveOptionGroupFromProductResult,
} from '@vendure/common/lib/generated-types';
import { PaginatedList } from '@vendure/common/lib/shared-types';
import { ErrorResultUnion } from '../../../common/error/error-result';
import { Translated } from '../../../common/types/locale-types';
import { Product } from '../../../entity/product/product.entity';
import { ProductVariant } from '../../../entity/product-variant/product-variant.entity';
import { FacetValueService } from '../../../service/services/facet-value.service';
import { ProductVariantService } from '../../../service/services/product-variant.service';
import { ProductService } from '../../../service/services/product.service';
import { RequestContext } from '../../common/request-context';
import { RelationPaths } from '../../decorators/relations.decorator';
export declare class ProductResolver {
    private productService;
    private productVariantService;
    private facetValueService;
    constructor(
        productService: ProductService,
        productVariantService: ProductVariantService,
        facetValueService: FacetValueService,
    );
    products(
        ctx: RequestContext,
        args: QueryProductsArgs,
        relations: RelationPaths<Product>,
    ): Promise<PaginatedList<Translated<Product>>>;
    product(
        ctx: RequestContext,
        args: QueryProductArgs,
        relations: RelationPaths<Product>,
    ): Promise<Translated<Product> | undefined>;
    productVariants(
        ctx: RequestContext,
        args: QueryProductVariantsArgs,
        relations: RelationPaths<ProductVariant>,
    ): Promise<PaginatedList<Translated<ProductVariant>>>;
    productVariant(
        ctx: RequestContext,
        args: QueryProductVariantArgs,
    ): Promise<Translated<ProductVariant> | undefined>;
    createProduct(ctx: RequestContext, args: MutationCreateProductArgs): Promise<Translated<Product>>;
    updateProduct(ctx: RequestContext, args: MutationUpdateProductArgs): Promise<Translated<Product>>;
    updateProducts(
        ctx: RequestContext,
        args: MutationUpdateProductsArgs,
    ): Promise<Array<Translated<Product>>>;
    deleteProduct(ctx: RequestContext, args: MutationDeleteProductArgs): Promise<DeletionResponse>;
    deleteProducts(ctx: RequestContext, args: MutationDeleteProductsArgs): Promise<DeletionResponse[]>;
    addOptionGroupToProduct(
        ctx: RequestContext,
        args: MutationAddOptionGroupToProductArgs,
    ): Promise<Translated<Product>>;
    removeOptionGroupFromProduct(
        ctx: RequestContext,
        args: MutationRemoveOptionGroupFromProductArgs,
    ): Promise<ErrorResultUnion<RemoveOptionGroupFromProductResult, Translated<Product>>>;
    createProductVariants(
        ctx: RequestContext,
        args: MutationCreateProductVariantsArgs,
    ): Promise<Array<Translated<ProductVariant>>>;
    updateProductVariants(
        ctx: RequestContext,
        args: MutationUpdateProductVariantsArgs,
    ): Promise<Array<Translated<ProductVariant>>>;
    deleteProductVariant(
        ctx: RequestContext,
        args: MutationDeleteProductVariantArgs,
    ): Promise<DeletionResponse>;
    deleteProductVariants(
        ctx: RequestContext,
        args: MutationDeleteProductVariantsArgs,
    ): Promise<DeletionResponse[]>;
    assignProductsToChannel(
        ctx: RequestContext,
        args: MutationAssignProductsToChannelArgs,
    ): Promise<Array<Translated<Product>>>;
    removeProductsFromChannel(
        ctx: RequestContext,
        args: MutationRemoveProductsFromChannelArgs,
    ): Promise<Array<Translated<Product>>>;
    assignProductVariantsToChannel(
        ctx: RequestContext,
        args: MutationAssignProductVariantsToChannelArgs,
    ): Promise<Array<Translated<ProductVariant>>>;
    removeProductVariantsFromChannel(
        ctx: RequestContext,
        args: MutationRemoveProductVariantsFromChannelArgs,
    ): Promise<Array<Translated<ProductVariant>>>;
}
