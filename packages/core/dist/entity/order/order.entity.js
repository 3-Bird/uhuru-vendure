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
exports.Order = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const typeorm_1 = require("typeorm");
const calculated_decorator_1 = require("../../common/calculated-decorator");
const errors_1 = require("../../common/error/errors");
const base_entity_1 = require("../base/base.entity");
const channel_entity_1 = require("../channel/channel.entity");
const custom_entity_fields_1 = require("../custom-entity-fields");
const customer_entity_1 = require("../customer/customer.entity");
const entity_id_decorator_1 = require("../entity-id.decorator");
const fulfillment_entity_1 = require("../fulfillment/fulfillment.entity");
const money_decorator_1 = require("../money.decorator");
const order_line_entity_1 = require("../order-line/order-line.entity");
const order_modification_entity_1 = require("../order-modification/order-modification.entity");
const payment_entity_1 = require("../payment/payment.entity");
const promotion_entity_1 = require("../promotion/promotion.entity");
const shipping_line_entity_1 = require("../shipping-line/shipping-line.entity");
const surcharge_entity_1 = require("../surcharge/surcharge.entity");
/**
 * @description
 * An Order is created whenever a {@link Customer} adds an item to the cart. It contains all the
 * information required to fulfill an order: which {@link ProductVariant}s in what quantities;
 * the shipping address and price; any applicable promotions; payments etc.
 *
 * An Order exists in a well-defined state according to the {@link OrderState} type. A state machine
 * is used to govern the transition from one state to another.
 *
 * @docsCategory entities
 */
let Order = class Order extends base_entity_1.VendureEntity {
    constructor(input) {
        super(input);
    }
    get discounts() {
        var _a, _b;
        this.throwIfLinesNotJoined('discounts');
        const groupedAdjustments = new Map();
        for (const line of (_a = this.lines) !== null && _a !== void 0 ? _a : []) {
            for (const discount of line.discounts) {
                const adjustment = groupedAdjustments.get(discount.adjustmentSource);
                if (adjustment) {
                    adjustment.amount += discount.amount;
                    adjustment.amountWithTax += discount.amountWithTax;
                }
                else {
                    groupedAdjustments.set(discount.adjustmentSource, Object.assign({}, discount));
                }
            }
        }
        for (const shippingLine of (_b = this.shippingLines) !== null && _b !== void 0 ? _b : []) {
            for (const discount of shippingLine.discounts) {
                const adjustment = groupedAdjustments.get(discount.adjustmentSource);
                if (adjustment) {
                    adjustment.amount += discount.amount;
                    adjustment.amountWithTax += discount.amountWithTax;
                }
                else {
                    groupedAdjustments.set(discount.adjustmentSource, Object.assign({}, discount));
                }
            }
        }
        return [...groupedAdjustments.values()];
    }
    /**
     * @description
     * Equal to `subTotal` plus `shipping`
     */
    get total() {
        return this.subTotal + (this.shipping || 0);
    }
    /**
     * @description
     * The final payable amount. Equal to `subTotalWithTax` plus `shippingWithTax`.
     */
    get totalWithTax() {
        return this.subTotalWithTax + (this.shippingWithTax || 0);
    }
    get totalQuantity() {
        this.throwIfLinesNotJoined('totalQuantity');
        return (0, shared_utils_1.summate)(this.lines, 'quantity');
    }
    /**
     * @description
     * A summary of the taxes being applied to this Order.
     */
    get taxSummary() {
        var _a, _b, _c;
        this.throwIfLinesNotJoined('taxSummary');
        const taxRateMap = new Map();
        const taxId = (taxLine) => `${taxLine.description}:${taxLine.taxRate}`;
        const taxableLines = [
            ...((_a = this.lines) !== null && _a !== void 0 ? _a : []),
            ...((_b = this.shippingLines) !== null && _b !== void 0 ? _b : []),
            ...((_c = this.surcharges) !== null && _c !== void 0 ? _c : []),
        ];
        for (const line of taxableLines) {
            const taxRateTotal = (0, shared_utils_1.summate)(line.taxLines, 'taxRate');
            for (const taxLine of line.taxLines) {
                const id = taxId(taxLine);
                const row = taxRateMap.get(id);
                const proportionOfTotalRate = 0 < taxLine.taxRate ? taxLine.taxRate / taxRateTotal : 0;
                const lineBase = line instanceof order_line_entity_1.OrderLine
                    ? line.proratedLinePrice
                    : line instanceof surcharge_entity_1.Surcharge
                        ? line.price
                        : line.discountedPrice;
                const lineWithTax = line instanceof order_line_entity_1.OrderLine
                    ? line.proratedLinePriceWithTax
                    : line instanceof surcharge_entity_1.Surcharge
                        ? line.priceWithTax
                        : line.discountedPriceWithTax;
                const amount = Math.round((lineWithTax - lineBase) * proportionOfTotalRate);
                if (row) {
                    row.tax += amount;
                    row.base += lineBase;
                }
                else {
                    taxRateMap.set(id, {
                        tax: amount,
                        base: lineBase,
                        description: taxLine.description,
                        rate: taxLine.taxRate,
                    });
                }
            }
        }
        return Array.from(taxRateMap.entries()).map(([taxRate, row]) => ({
            taxRate: row.rate,
            description: row.description,
            taxBase: row.base,
            taxTotal: row.tax,
        }));
    }
    throwIfLinesNotJoined(propertyName) {
        if (this.lines == null) {
            const errorMessage = [
                `The property "${propertyName}" on the Order entity requires the Order.lines relation to be joined.`,
                "This can be done with the EntityHydratorService: `await entityHydratorService.hydrate(ctx, order, { relations: ['lines'] })`",
            ];
            throw new errors_1.InternalServerError(errorMessage.join('\n'));
        }
    }
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.Column)('varchar', { default: generated_types_1.OrderType.Regular }),
    __metadata("design:type", String)
], Order.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(type => Order, sellerOrder => sellerOrder.aggregateOrder),
    __metadata("design:type", Array)
], Order.prototype, "sellerOrders", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.ManyToOne)(type => Order, aggregateOrder => aggregateOrder.sellerOrders),
    __metadata("design:type", Order)
], Order.prototype, "aggregateOrder", void 0);
__decorate([
    (0, entity_id_decorator_1.EntityId)({ nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "aggregateOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)({ unique: true }),
    __metadata("design:type", String)
], Order.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar'),
    __metadata("design:type", String)
], Order.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Order.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Order.prototype, "orderPlacedAt", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.ManyToOne)(type => customer_entity_1.Customer, customer => customer.orders),
    __metadata("design:type", customer_entity_1.Customer)
], Order.prototype, "customer", void 0);
__decorate([
    (0, entity_id_decorator_1.EntityId)({ nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(type => order_line_entity_1.OrderLine, line => line.order),
    __metadata("design:type", Array)
], Order.prototype, "lines", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(type => surcharge_entity_1.Surcharge, surcharge => surcharge.order),
    __metadata("design:type", Array)
], Order.prototype, "surcharges", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array'),
    __metadata("design:type", Array)
], Order.prototype, "couponCodes", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(type => promotion_entity_1.Promotion, promotion => promotion.orders),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], Order.prototype, "promotions", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-json'),
    __metadata("design:type", Object)
], Order.prototype, "shippingAddress", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-json'),
    __metadata("design:type", Object)
], Order.prototype, "billingAddress", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(type => payment_entity_1.Payment, payment => payment.order),
    __metadata("design:type", Array)
], Order.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(type => fulfillment_entity_1.Fulfillment, fulfillment => fulfillment.orders),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], Order.prototype, "fulfillments", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar'),
    __metadata("design:type", String)
], Order.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)(type => custom_entity_fields_1.CustomOrderFields),
    __metadata("design:type", custom_entity_fields_1.CustomOrderFields)
], Order.prototype, "customFields", void 0);
__decorate([
    (0, entity_id_decorator_1.EntityId)({ nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "taxZoneId", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(type => channel_entity_1.Channel),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], Order.prototype, "channels", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(type => order_modification_entity_1.OrderModification, modification => modification.order),
    __metadata("design:type", Array)
], Order.prototype, "modifications", void 0);
__decorate([
    (0, money_decorator_1.Money)(),
    __metadata("design:type", Number)
], Order.prototype, "subTotal", void 0);
__decorate([
    (0, money_decorator_1.Money)(),
    __metadata("design:type", Number)
], Order.prototype, "subTotalWithTax", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(type => shipping_line_entity_1.ShippingLine, shippingLine => shippingLine.order),
    __metadata("design:type", Array)
], Order.prototype, "shippingLines", void 0);
__decorate([
    (0, money_decorator_1.Money)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "shipping", void 0);
__decorate([
    (0, money_decorator_1.Money)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "shippingWithTax", void 0);
__decorate([
    (0, calculated_decorator_1.Calculated)({ relations: ['lines', 'shippingLines'] }),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [])
], Order.prototype, "discounts", null);
__decorate([
    (0, calculated_decorator_1.Calculated)({
        query: qb => qb
            .leftJoin(qb1 => {
            return qb1
                .from(Order, 'order')
                .select('order.shipping + order.subTotal', 'total')
                .addSelect('order.id', 'oid');
        }, 't1', 't1.oid = order.id')
            .addSelect('t1.total', 'total'),
        expression: 'total',
    }),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], Order.prototype, "total", null);
__decorate([
    (0, calculated_decorator_1.Calculated)({
        query: qb => qb
            .leftJoin(qb1 => {
            return qb1
                .from(Order, 'order')
                .select('order.shippingWithTax + order.subTotalWithTax', 'twt')
                .addSelect('order.id', 'oid');
        }, 't1', 't1.oid = order.id')
            .addSelect('t1.twt', 'twt'),
        expression: 'twt',
    }),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], Order.prototype, "totalWithTax", null);
__decorate([
    (0, calculated_decorator_1.Calculated)({
        relations: ['lines'],
        query: qb => {
            qb.leftJoin(qb1 => {
                return qb1
                    .from(Order, 'order')
                    .select('SUM(lines.quantity)', 'qty')
                    .addSelect('order.id', 'oid')
                    .leftJoin('order.lines', 'lines')
                    .groupBy('order.id');
            }, 't1', 't1.oid = order.id').addSelect('t1.qty', 'qty');
        },
        expression: 'qty',
    }),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], Order.prototype, "totalQuantity", null);
__decorate([
    (0, calculated_decorator_1.Calculated)({ relations: ['lines'] }),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [])
], Order.prototype, "taxSummary", null);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Order);
//# sourceMappingURL=order.entity.js.map