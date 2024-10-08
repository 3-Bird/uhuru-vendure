import { DeepPartial } from '@vendure/common/lib/shared-types';
import { SoftDeletable } from '../../common/types/common-types';
import { LocaleString, Translatable, Translation } from '../../common/types/locale-types';
import { HasCustomFields } from '../../config/custom-field/custom-field-types';
import { VendureEntity } from '../base/base.entity';
import { CustomProductOptionGroupFields } from '../custom-entity-fields';
import { Product } from '../product/product.entity';
import { ProductOption } from '../product-option/product-option.entity';
/**
 * @description
 * A grouping of one or more {@link ProductOption}s.
 *
 * @docsCategory entities
 */
export declare class ProductOptionGroup
    extends VendureEntity
    implements Translatable, HasCustomFields, SoftDeletable
{
    constructor(input?: DeepPartial<ProductOptionGroup>);
    deletedAt: Date | null;
    name: LocaleString;
    code: string;
    translations: Array<Translation<ProductOptionGroup>>;
    options: ProductOption[];
    product: Product;
    customFields: CustomProductOptionGroupFields;
}
