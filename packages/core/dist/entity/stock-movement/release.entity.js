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
exports.Release = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const typeorm_1 = require("typeorm");
const order_line_entity_1 = require("../order-line/order-line.entity");
const stock_movement_entity_1 = require("./stock-movement.entity");
/**
 * @description
 * A Release is created when OrderItems which have been allocated (but not yet fulfilled)
 * are cancelled.
 *
 * @docsCategory entities
 * @docsPage StockMovement
 */
let Release = class Release extends stock_movement_entity_1.StockMovement {
    constructor(input) {
        super(input);
        this.type = generated_types_1.StockMovementType.RELEASE;
    }
};
exports.Release = Release;
__decorate([
    (0, typeorm_1.ManyToOne)(type => order_line_entity_1.OrderLine),
    __metadata("design:type", order_line_entity_1.OrderLine)
], Release.prototype, "orderLine", void 0);
exports.Release = Release = __decorate([
    (0, typeorm_1.ChildEntity)(),
    __metadata("design:paramtypes", [Object])
], Release);
//# sourceMappingURL=release.entity.js.map