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
exports.OrderCalculator = void 0;
const common_1 = require("@nestjs/common");
const filter_async_1 = require("@vendure/common/lib/filter-async");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const request_context_cache_service_1 = require("../../../cache/request-context-cache.service");
const constants_1 = require("../../../common/constants");
const errors_1 = require("../../../common/error/errors");
const utils_1 = require("../../../common/utils");
const config_service_1 = require("../../../config/config.service");
const shipping_method_service_1 = require("../../services/shipping-method.service");
const tax_rate_service_1 = require("../../services/tax-rate.service");
const zone_service_1 = require("../../services/zone.service");
const shipping_calculator_1 = require("../shipping-calculator/shipping-calculator");
const prorate_1 = require("./prorate");
/**
 * @description
 * This helper is used when making changes to an Order, to apply all applicable price adjustments to that Order,
 * including:
 *
 * - Promotions
 * - Taxes
 * - Shipping
 *
 * @docsCategory service-helpers
 */
let OrderCalculator = class OrderCalculator {
    constructor(configService, zoneService, taxRateService, shippingMethodService, shippingCalculator, requestContextCache) {
        this.configService = configService;
        this.zoneService = zoneService;
        this.taxRateService = taxRateService;
        this.shippingMethodService = shippingMethodService;
        this.shippingCalculator = shippingCalculator;
        this.requestContextCache = requestContextCache;
    }
    /**
     * @description
     * Applies taxes and promotions to an Order. Mutates the order object.
     * Returns an array of any OrderItems which had new adjustments
     * applied, either tax or promotions.
     */
    async applyPriceAdjustments(ctx, order, promotions, updatedOrderLines = [], options) {
        const { taxZoneStrategy } = this.configService.taxOptions;
        // We reset the promotions array as all promotions
        // must be revalidated on any changes to an Order.
        order.promotions = [];
        const zones = await this.zoneService.getAllWithMembers(ctx);
        const activeTaxZone = await this.requestContextCache.get(ctx, constants_1.CacheKey.ActiveTaxZone, () => taxZoneStrategy.determineTaxZone(ctx, zones, ctx.channel, order));
        let taxZoneChanged = false;
        if (!activeTaxZone) {
            throw new errors_1.InternalServerError('error.no-active-tax-zone');
        }
        if (!order.taxZoneId || !(0, utils_1.idsAreEqual)(order.taxZoneId, activeTaxZone.id)) {
            order.taxZoneId = activeTaxZone.id;
            taxZoneChanged = true;
        }
        for (const updatedOrderLine of updatedOrderLines) {
            await this.applyTaxesToOrderLine(ctx, order, updatedOrderLine, this.createTaxRateGetter(ctx, activeTaxZone));
        }
        this.calculateOrderTotals(order);
        if (order.lines.length) {
            if (taxZoneChanged) {
                // First apply taxes to the non-discounted prices
                await this.applyTaxes(ctx, order, activeTaxZone);
            }
            // Then test and apply promotions
            const totalBeforePromotions = order.subTotal;
            await this.applyPromotions(ctx, order, promotions);
            // itemsModifiedByPromotions.forEach(item => updatedOrderItems.add(item));
            if (order.subTotal !== totalBeforePromotions) {
                // Finally, re-calculate taxes because the promotions may have
                // altered the unit prices, which in turn will alter the tax payable.
                await this.applyTaxes(ctx, order, activeTaxZone);
            }
        }
        if ((options === null || options === void 0 ? void 0 : options.recalculateShipping) !== false) {
            await this.applyShipping(ctx, order);
            await this.applyShippingPromotions(ctx, order, promotions);
        }
        this.calculateOrderTotals(order);
        return order;
    }
    /**
     * @description
     * Applies the correct TaxRate to each OrderLine in the order.
     */
    async applyTaxes(ctx, order, activeZone) {
        const getTaxRate = this.createTaxRateGetter(ctx, activeZone);
        for (const line of order.lines) {
            await this.applyTaxesToOrderLine(ctx, order, line, getTaxRate);
        }
        this.calculateOrderTotals(order);
    }
    /**
     * @description
     * Applies the correct TaxRate to an OrderLine
     */
    async applyTaxesToOrderLine(ctx, order, line, getTaxRate) {
        const applicableTaxRate = await getTaxRate(line.taxCategoryId);
        const { taxLineCalculationStrategy } = this.configService.taxOptions;
        line.taxLines = await taxLineCalculationStrategy.calculate({
            ctx,
            applicableTaxRate,
            order,
            orderLine: line,
        });
    }
    /**
     * @description
     * Returns a memoized function for performing an efficient
     * lookup of the correct TaxRate for a given TaxCategory.
     */
    createTaxRateGetter(ctx, activeZone) {
        const taxRateCache = new Map();
        return async (taxCategoryId) => {
            const cached = taxRateCache.get(taxCategoryId);
            if (cached) {
                return cached;
            }
            const rate = await this.taxRateService.getApplicableTaxRate(ctx, activeZone, taxCategoryId);
            taxRateCache.set(taxCategoryId, rate);
            return rate;
        };
    }
    /**
     * @description
     * Applies any eligible promotions to each OrderLine in the order.
     */
    async applyPromotions(ctx, order, promotions) {
        await this.applyOrderItemPromotions(ctx, order, promotions);
        await this.applyOrderPromotions(ctx, order, promotions);
        return;
    }
    /**
     * @description
     * Applies promotions to OrderItems. This is a quite complex function, due to the inherent complexity
     * of applying the promotions, and also due to added complexity in the name of performance
     * optimization. Therefore, it is heavily annotated so that the purpose of each step is clear.
     */
    async applyOrderItemPromotions(ctx, order, promotions) {
        for (const line of order.lines) {
            // Must be re-calculated for each line, since the previous lines may have triggered promotions
            // which affected the order price.
            const applicablePromotions = await (0, filter_async_1.filterAsync)(promotions, p => p.test(ctx, order).then(Boolean));
            line.clearAdjustments();
            for (const promotion of applicablePromotions) {
                let priceAdjusted = false;
                // We need to test the promotion *again*, even though we've tested them for the line.
                // This is because the previous Promotions may have adjusted the Order in such a way
                // as to render later promotions no longer applicable.
                const applicableOrState = await promotion.test(ctx, order);
                if (applicableOrState) {
                    const state = typeof applicableOrState === 'object' ? applicableOrState : undefined;
                    // for (const item of line.items) {
                    const adjustment = await promotion.apply(ctx, { orderLine: line }, state);
                    if (adjustment) {
                        adjustment.amount = adjustment.amount * line.quantity;
                        line.addAdjustment(adjustment);
                        priceAdjusted = true;
                    }
                    if (priceAdjusted) {
                        this.calculateOrderTotals(order);
                        priceAdjusted = false;
                    }
                    this.addPromotion(order, promotion);
                }
            }
            this.calculateOrderTotals(order);
        }
        return;
    }
    async applyOrderPromotions(ctx, order, promotions) {
        // const updatedItems = new Set<OrderItem>();
        const orderHasDistributedPromotions = !!order.discounts.find(adjustment => adjustment.type === generated_types_1.AdjustmentType.DISTRIBUTED_ORDER_PROMOTION);
        if (orderHasDistributedPromotions) {
            // If the Order currently has any Order-level discounts applied, we need to
            // mark all OrderItems in the Order as "updated", since one or more of those
            // Order-level discounts may become invalid, which will require _all_ OrderItems
            // to be saved.
            order.lines.forEach(line => {
                line.clearAdjustments(generated_types_1.AdjustmentType.DISTRIBUTED_ORDER_PROMOTION);
            });
        }
        this.calculateOrderTotals(order);
        const applicableOrderPromotions = await (0, filter_async_1.filterAsync)(promotions, p => p.test(ctx, order).then(Boolean));
        if (applicableOrderPromotions.length) {
            for (const promotion of applicableOrderPromotions) {
                // re-test the promotion on each iteration, since the order total
                // may be modified by a previously-applied promotion
                const applicableOrState = await promotion.test(ctx, order);
                if (applicableOrState) {
                    const state = typeof applicableOrState === 'object' ? applicableOrState : undefined;
                    const adjustment = await promotion.apply(ctx, { order }, state);
                    if (adjustment && adjustment.amount !== 0) {
                        const amount = adjustment.amount;
                        const weights = order.lines.map(l => l.quantity !== 0 ? l.proratedLinePriceWithTax : 0);
                        const distribution = (0, prorate_1.prorate)(weights, amount);
                        order.lines.forEach((line, i) => {
                            const shareOfAmount = distribution[i];
                            const itemWeights = Array.from({
                                length: line.quantity,
                            }).map(() => line.unitPrice);
                            const itemDistribution = (0, prorate_1.prorate)(itemWeights, shareOfAmount);
                            line.addAdjustment({
                                amount: shareOfAmount,
                                adjustmentSource: adjustment.adjustmentSource,
                                description: adjustment.description,
                                type: generated_types_1.AdjustmentType.DISTRIBUTED_ORDER_PROMOTION,
                                data: { itemDistribution },
                            });
                        });
                        this.calculateOrderTotals(order);
                    }
                    this.addPromotion(order, promotion);
                }
            }
            this.calculateOrderTotals(order);
        }
        return;
    }
    async applyShippingPromotions(ctx, order, promotions) {
        const applicableOrderPromotions = await (0, filter_async_1.filterAsync)(promotions, p => p.test(ctx, order).then(Boolean));
        if (applicableOrderPromotions.length) {
            order.shippingLines.forEach(line => line.clearAdjustments());
            for (const promotion of applicableOrderPromotions) {
                // re-test the promotion on each iteration, since the order total
                // may be modified by a previously-applied promotion
                const applicableOrState = await promotion.test(ctx, order);
                if (applicableOrState) {
                    const state = typeof applicableOrState === 'object' ? applicableOrState : undefined;
                    for (const shippingLine of order.shippingLines) {
                        const adjustment = await promotion.apply(ctx, { shippingLine, order }, state);
                        if (adjustment && adjustment.amount !== 0) {
                            shippingLine.addAdjustment(adjustment);
                        }
                    }
                    this.addPromotion(order, promotion);
                }
            }
        }
        else {
            // If there is no applicable promotion for shipping,
            // we should remove already assigned adjustment from shipping lines.
            for (const shippingLine of order.shippingLines) {
                shippingLine.clearAdjustments();
            }
        }
    }
    async applyShipping(ctx, order) {
        // First we need to remove any ShippingLines which are no longer applicable
        // to the Order, i.e. there is no OrderLine which is assigned to the ShippingLine's
        // ShippingMethod.
        const orderLineShippingLineIds = order.lines.map(line => line.shippingLineId);
        order.shippingLines = order.shippingLines.filter(shippingLine => orderLineShippingLineIds.includes(shippingLine.id));
        for (const shippingLine of order.shippingLines) {
            const currentShippingMethod = (shippingLine === null || shippingLine === void 0 ? void 0 : shippingLine.shippingMethodId) &&
                (await this.shippingMethodService.findOne(ctx, shippingLine.shippingMethodId));
            if (!currentShippingMethod) {
                return;
            }
            const currentMethodStillEligible = await currentShippingMethod.test(ctx, order);
            if (currentMethodStillEligible) {
                const result = await currentShippingMethod.apply(ctx, order);
                if (result) {
                    shippingLine.listPrice = result.price;
                    shippingLine.listPriceIncludesTax = result.priceIncludesTax;
                    shippingLine.taxLines = [
                        {
                            description: 'shipping tax',
                            taxRate: result.taxRate,
                        },
                    ];
                }
                continue;
            }
            const results = await this.shippingCalculator.getEligibleShippingMethods(ctx, order, [
                currentShippingMethod.id,
            ]);
            if (results && results.length) {
                const cheapest = results[0];
                shippingLine.listPrice = cheapest.result.price;
                shippingLine.listPriceIncludesTax = cheapest.result.priceIncludesTax;
                shippingLine.shippingMethod = cheapest.method;
                shippingLine.shippingMethodId = cheapest.method.id;
                shippingLine.taxLines = [
                    {
                        description: 'shipping tax',
                        taxRate: cheapest.result.taxRate,
                    },
                ];
            }
            else {
                order.shippingLines = order.shippingLines.filter(sl => sl !== shippingLine);
            }
        }
    }
    /**
     * @description
     * Sets the totals properties on an Order by summing each OrderLine, and taking
     * into account any Surcharges and ShippingLines. Does not save the Order, so
     * the entity must be persisted to the DB after calling this method.
     *
     * Note that this method does *not* evaluate any taxes or promotions. It assumes
     * that has already been done and is solely responsible for summing the
     * totals.
     */
    calculateOrderTotals(order) {
        let totalPrice = 0;
        let totalPriceWithTax = 0;
        for (const line of order.lines) {
            totalPrice += line.proratedLinePrice;
            totalPriceWithTax += line.proratedLinePriceWithTax;
        }
        for (const surcharge of order.surcharges) {
            totalPrice += surcharge.price;
            totalPriceWithTax += surcharge.priceWithTax;
        }
        order.subTotal = totalPrice;
        order.subTotalWithTax = totalPriceWithTax;
        let shippingPrice = 0;
        let shippingPriceWithTax = 0;
        for (const shippingLine of order.shippingLines) {
            shippingPrice += shippingLine.discountedPrice;
            shippingPriceWithTax += shippingLine.discountedPriceWithTax;
        }
        order.shipping = shippingPrice;
        order.shippingWithTax = shippingPriceWithTax;
    }
    addPromotion(order, promotion) {
        if (order.promotions && !order.promotions.find(p => (0, utils_1.idsAreEqual)(p.id, promotion.id))) {
            order.promotions.push(promotion);
        }
    }
};
exports.OrderCalculator = OrderCalculator;
exports.OrderCalculator = OrderCalculator = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.ConfigService,
        zone_service_1.ZoneService,
        tax_rate_service_1.TaxRateService,
        shipping_method_service_1.ShippingMethodService,
        shipping_calculator_1.ShippingCalculator,
        request_context_cache_service_1.RequestContextCacheService])
], OrderCalculator);
//# sourceMappingURL=order-calculator.js.map