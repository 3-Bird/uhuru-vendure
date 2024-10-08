import { RequestContext } from '../../../api/common/request-context';
import { Translatable } from '../../../common/types/locale-types';
import { ConfigService } from '../../../config';
import { VendureEntity } from '../../../entity';
import { DeepTranslatableRelations } from '../utils/translate-entity';
/**
 * @description
 * The TranslatorService is used to translate entities into the current language.
 *
 * @example
 * ```ts
 * import { Injectable } from '\@nestjs/common';
 * import { ID, Product, RequestContext, TransactionalConnection, TranslatorService } from '\@vendure/core';
 *
 * \@Injectable()
 * export class ProductService {
 *
 *     constructor(private connection: TransactionalConnection,
 *                 private translator: TranslatorService){}
 *
 *     async findOne(ctx: RequestContext, productId: ID): Promise<Product | undefined> {
 *         const product = await this.connection.findOneInChannel(ctx, Product, productId, ctx.channelId, {
 *             relations: {
 *                  facetValues: {
 *                      facet: true,
 *                  }
 *             }
 *         });
 *         if (!product) {
 *             return;
 *         }
 *         return this.translator.translate(product, ctx, ['facetValues', ['facetValues', 'facet']]);
 *     }
 * }
 * ```
 *
 * @docsCategory service-helpers
 */
export declare class TranslatorService {
    private configService;
    constructor(configService: ConfigService);
    translate<T extends Translatable & VendureEntity>(
        translatable: T,
        ctx: RequestContext,
        translatableRelations?: DeepTranslatableRelations<T>,
    ): import('../../../common/types/locale-types').Translated<T>;
}
