import {
    DeletionResponse,
    MutationCreateProductOptionArgs,
    MutationCreateProductOptionGroupArgs,
    MutationDeleteProductOptionArgs,
    MutationUpdateProductOptionArgs,
    MutationUpdateProductOptionGroupArgs,
    QueryProductOptionGroupArgs,
    QueryProductOptionGroupsArgs,
} from '@vendure/common/lib/generated-types';
import { Translated } from '../../../common/types/locale-types';
import { ProductOption } from '../../../entity/product-option/product-option.entity';
import { ProductOptionGroup } from '../../../entity/product-option-group/product-option-group.entity';
import { ProductOptionGroupService } from '../../../service/services/product-option-group.service';
import { ProductOptionService } from '../../../service/services/product-option.service';
import { RequestContext } from '../../common/request-context';
import { RelationPaths } from '../../decorators/relations.decorator';
export declare class ProductOptionResolver {
    private productOptionGroupService;
    private productOptionService;
    constructor(
        productOptionGroupService: ProductOptionGroupService,
        productOptionService: ProductOptionService,
    );
    productOptionGroups(
        ctx: RequestContext,
        args: QueryProductOptionGroupsArgs,
        relations: RelationPaths<ProductOptionGroup>,
    ): Promise<Array<Translated<ProductOptionGroup>>>;
    productOptionGroup(
        ctx: RequestContext,
        args: QueryProductOptionGroupArgs,
        relations: RelationPaths<ProductOptionGroup>,
    ): Promise<Translated<ProductOptionGroup> | undefined>;
    createProductOptionGroup(
        ctx: RequestContext,
        args: MutationCreateProductOptionGroupArgs,
    ): Promise<Translated<ProductOptionGroup>>;
    updateProductOptionGroup(
        ctx: RequestContext,
        args: MutationUpdateProductOptionGroupArgs,
    ): Promise<Translated<ProductOptionGroup>>;
    createProductOption(
        ctx: RequestContext,
        args: MutationCreateProductOptionArgs,
    ): Promise<Translated<ProductOption>>;
    updateProductOption(
        ctx: RequestContext,
        args: MutationUpdateProductOptionArgs,
    ): Promise<Translated<ProductOption>>;
    deleteProductOption(
        ctx: RequestContext,
        { id }: MutationDeleteProductOptionArgs,
    ): Promise<DeletionResponse>;
}
