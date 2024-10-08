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
exports.ShippingMethod = void 0;
const typeorm_1 = require("typeorm");
const round_money_1 = require("../../common/round-money");
const config_helpers_1 = require("../../config/config-helpers");
const base_entity_1 = require("../base/base.entity");
const channel_entity_1 = require("../channel/channel.entity");
const custom_entity_fields_1 = require("../custom-entity-fields");
const shipping_method_translation_entity_1 = require("./shipping-method-translation.entity");
/**
 * @description
 * A ShippingMethod is used to apply a shipping price to an {@link Order}. It is composed of a
 * {@link ShippingEligibilityChecker} and a {@link ShippingCalculator}. For a given Order,
 * the `checker` is used to determine whether this ShippingMethod can be used. If yes, then
 * the ShippingMethod can be applied and the `calculator` is used to determine the price of
 * shipping.
 *
 * @docsCategory entities
 */
let ShippingMethod = class ShippingMethod extends base_entity_1.VendureEntity {
    constructor(input) {
        super(input);
        this.allCheckers = {};
        this.allCalculators = {};
        const checkers = (0, config_helpers_1.getConfig)().shippingOptions.shippingEligibilityCheckers || [];
        const calculators = (0, config_helpers_1.getConfig)().shippingOptions.shippingCalculators || [];
        this.allCheckers = checkers.reduce((hash, o) => (Object.assign(Object.assign({}, hash), { [o.code]: o })), {});
        this.allCalculators = calculators.reduce((hash, o) => (Object.assign(Object.assign({}, hash), { [o.code]: o })), {});
    }
    async apply(ctx, order) {
        const calculator = this.allCalculators[this.calculator.code];
        if (calculator) {
            const response = await calculator.calculate(ctx, order, this.calculator.args, this);
            if (response) {
                const { price, priceIncludesTax, taxRate, metadata } = response;
                return {
                    price: (0, round_money_1.roundMoney)(price),
                    priceIncludesTax,
                    taxRate,
                    metadata,
                };
            }
        }
    }
    async test(ctx, order) {
        const checker = this.allCheckers[this.checker.code];
        if (checker) {
            return checker.check(ctx, order, this.checker.args, this);
        }
        else {
            return false;
        }
    }
};
exports.ShippingMethod = ShippingMethod;
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], ShippingMethod.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ShippingMethod.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-json'),
    __metadata("design:type", Object)
], ShippingMethod.prototype, "checker", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-json'),
    __metadata("design:type", Object)
], ShippingMethod.prototype, "calculator", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ShippingMethod.prototype, "fulfillmentHandlerCode", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(type => channel_entity_1.Channel, channel => channel.shippingMethods),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], ShippingMethod.prototype, "channels", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(type => shipping_method_translation_entity_1.ShippingMethodTranslation, translation => translation.base, { eager: true }),
    __metadata("design:type", Array)
], ShippingMethod.prototype, "translations", void 0);
__decorate([
    (0, typeorm_1.Column)(type => custom_entity_fields_1.CustomShippingMethodFields),
    __metadata("design:type", custom_entity_fields_1.CustomShippingMethodFields)
], ShippingMethod.prototype, "customFields", void 0);
exports.ShippingMethod = ShippingMethod = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], ShippingMethod);
//# sourceMappingURL=shipping-method.entity.js.map