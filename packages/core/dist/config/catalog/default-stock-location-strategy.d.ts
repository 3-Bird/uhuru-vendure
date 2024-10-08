import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { Injector } from '../../common/injector';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { OrderLine } from '../../entity/order-line/order-line.entity';
import { StockLevel } from '../../entity/stock-level/stock-level.entity';
import { StockLocation } from '../../entity/stock-location/stock-location.entity';
import { AvailableStock, LocationWithQuantity, StockLocationStrategy } from './stock-location-strategy';
/**
 * @description
 * The DefaultStockLocationStrategy is the default implementation of the {@link StockLocationStrategy}.
 * It assumes only a single StockLocation and that all stock is allocated from that location.
 *
 * @docsCategory products & stock
 * @since 2.0.0
 */
export declare class DefaultStockLocationStrategy implements StockLocationStrategy {
    protected connection: TransactionalConnection;
    init(injector: Injector): void;
    getAvailableStock(ctx: RequestContext, productVariantId: ID, stockLevels: StockLevel[]): AvailableStock;
    forAllocation(
        ctx: RequestContext,
        stockLocations: StockLocation[],
        orderLine: OrderLine,
        quantity: number,
    ): LocationWithQuantity[] | Promise<LocationWithQuantity[]>;
    forCancellation(
        ctx: RequestContext,
        stockLocations: StockLocation[],
        orderLine: OrderLine,
        quantity: number,
    ): Promise<LocationWithQuantity[]>;
    forRelease(
        ctx: RequestContext,
        stockLocations: StockLocation[],
        orderLine: OrderLine,
        quantity: number,
    ): Promise<LocationWithQuantity[]>;
    forSale(
        ctx: RequestContext,
        stockLocations: StockLocation[],
        orderLine: OrderLine,
        quantity: number,
    ): Promise<LocationWithQuantity[]>;
    private getLocationsBasedOnAllocations;
}
