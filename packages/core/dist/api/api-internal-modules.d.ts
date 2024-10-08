import { AdministratorEntityResolver } from './resolvers/entity/administrator-entity.resolver';
import { AssetEntityResolver } from './resolvers/entity/asset-entity.resolver';
import { ChannelEntityResolver } from './resolvers/entity/channel-entity.resolver';
import { CollectionEntityResolver } from './resolvers/entity/collection-entity.resolver';
import { CountryEntityResolver } from './resolvers/entity/country-entity.resolver';
import {
    CustomerAdminEntityResolver,
    CustomerEntityResolver,
} from './resolvers/entity/customer-entity.resolver';
import { CustomerGroupEntityResolver } from './resolvers/entity/customer-group-entity.resolver';
import { FacetEntityResolver } from './resolvers/entity/facet-entity.resolver';
import { FacetValueEntityResolver } from './resolvers/entity/facet-value-entity.resolver';
import {
    FulfillmentAdminEntityResolver,
    FulfillmentEntityResolver,
} from './resolvers/entity/fulfillment-entity.resolver';
import { FulfillmentLineEntityResolver } from './resolvers/entity/fulfillment-line-entity.resolver';
import { JobEntityResolver } from './resolvers/entity/job-entity.resolver';
import { OrderAdminEntityResolver, OrderEntityResolver } from './resolvers/entity/order-entity.resolver';
import { OrderLineEntityResolver } from './resolvers/entity/order-line-entity.resolver';
import {
    PaymentAdminEntityResolver,
    PaymentEntityResolver,
} from './resolvers/entity/payment-entity.resolver';
import { PaymentMethodEntityResolver } from './resolvers/entity/payment-method-entity.resolver';
import {
    ProductAdminEntityResolver,
    ProductEntityResolver,
} from './resolvers/entity/product-entity.resolver';
import { ProductOptionEntityResolver } from './resolvers/entity/product-option-entity.resolver';
import { ProductOptionGroupEntityResolver } from './resolvers/entity/product-option-group-entity.resolver';
import {
    ProductVariantAdminEntityResolver,
    ProductVariantEntityResolver,
} from './resolvers/entity/product-variant-entity.resolver';
import { RefundEntityResolver } from './resolvers/entity/refund-entity.resolver';
import { RefundLineEntityResolver } from './resolvers/entity/refund-line-entity.resolver';
import { RoleEntityResolver } from './resolvers/entity/role-entity.resolver';
import { ShippingLineEntityResolver } from './resolvers/entity/shipping-line-entity.resolver';
import { ShippingMethodEntityResolver } from './resolvers/entity/shipping-method-entity.resolver';
import { TaxRateEntityResolver } from './resolvers/entity/tax-rate-entity.resolver';
import { UserEntityResolver } from './resolvers/entity/user-entity.resolver';
import { ZoneEntityResolver } from './resolvers/entity/zone-entity.resolver';
export declare const entityResolvers: (
    | typeof AssetEntityResolver
    | typeof ChannelEntityResolver
    | typeof CollectionEntityResolver
    | typeof CountryEntityResolver
    | typeof CustomerEntityResolver
    | typeof CustomerGroupEntityResolver
    | typeof FacetEntityResolver
    | typeof FacetValueEntityResolver
    | typeof FulfillmentEntityResolver
    | typeof FulfillmentLineEntityResolver
    | typeof OrderEntityResolver
    | typeof OrderLineEntityResolver
    | typeof PaymentEntityResolver
    | typeof ProductEntityResolver
    | typeof ProductOptionEntityResolver
    | typeof ProductOptionGroupEntityResolver
    | typeof ProductVariantEntityResolver
    | typeof RefundEntityResolver
    | typeof RefundLineEntityResolver
    | typeof RoleEntityResolver
    | typeof ShippingLineEntityResolver
    | typeof ShippingMethodEntityResolver
    | typeof TaxRateEntityResolver
    | typeof UserEntityResolver
    | typeof ZoneEntityResolver
)[];
export declare const adminEntityResolvers: (
    | typeof AdministratorEntityResolver
    | typeof CustomerAdminEntityResolver
    | typeof FulfillmentAdminEntityResolver
    | typeof JobEntityResolver
    | typeof OrderAdminEntityResolver
    | typeof PaymentAdminEntityResolver
    | typeof PaymentMethodEntityResolver
    | typeof ProductAdminEntityResolver
    | typeof ProductVariantAdminEntityResolver
)[];
/**
 * The internal module containing some shared providers used by more than
 * one API module.
 */
export declare class ApiSharedModule {}
/**
 * The internal module containing the Admin GraphQL API resolvers
 */
export declare class AdminApiModule {}
/**
 * The internal module containing the Shop GraphQL API resolvers
 */
export declare class ShopApiModule {}
