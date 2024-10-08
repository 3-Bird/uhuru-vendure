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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductOptionGroupEntityResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const product_option_group_entity_1 = require("../../../entity/product-option-group/product-option-group.entity");
const locale_string_hydrator_1 = require("../../../service/helpers/locale-string-hydrator/locale-string-hydrator");
const product_option_group_service_1 = require("../../../service/services/product-option-group.service");
const request_context_1 = require("../../common/request-context");
const allow_decorator_1 = require("../../decorators/allow.decorator");
const request_context_decorator_1 = require("../../decorators/request-context.decorator");
let ProductOptionGroupEntityResolver = class ProductOptionGroupEntityResolver {
    constructor(productOptionGroupService, localeStringHydrator) {
        this.productOptionGroupService = productOptionGroupService;
        this.localeStringHydrator = localeStringHydrator;
    }
    name(ctx, optionGroup) {
        return this.localeStringHydrator.hydrateLocaleStringField(ctx, optionGroup, 'name');
    }
    languageCode(ctx, optionGroup) {
        return this.localeStringHydrator.hydrateLocaleStringField(ctx, optionGroup, 'languageCode');
    }
    async options(ctx, optionGroup) {
        var _a;
        let options;
        if (optionGroup.options) {
            options = optionGroup.options;
        }
        else {
            const group = await this.productOptionGroupService.findOne(ctx, optionGroup.id);
            options = (_a = group === null || group === void 0 ? void 0 : group.options) !== null && _a !== void 0 ? _a : [];
        }
        return options.filter(o => !o.deletedAt);
    }
};
exports.ProductOptionGroupEntityResolver = ProductOptionGroupEntityResolver;
__decorate([
    (0, graphql_1.ResolveField)(),
    __param(0, (0, request_context_decorator_1.Ctx)()),
    __param(1, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_context_1.RequestContext, product_option_group_entity_1.ProductOptionGroup]),
    __metadata("design:returntype", Promise)
], ProductOptionGroupEntityResolver.prototype, "name", null);
__decorate([
    (0, graphql_1.ResolveField)(),
    __param(0, (0, request_context_decorator_1.Ctx)()),
    __param(1, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_context_1.RequestContext, product_option_group_entity_1.ProductOptionGroup]),
    __metadata("design:returntype", Promise)
], ProductOptionGroupEntityResolver.prototype, "languageCode", null);
__decorate([
    (0, graphql_1.ResolveField)(),
    (0, allow_decorator_1.Allow)(generated_types_1.Permission.ReadCatalog, generated_types_1.Permission.Public, generated_types_1.Permission.ReadProduct),
    __param(0, (0, request_context_decorator_1.Ctx)()),
    __param(1, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_context_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], ProductOptionGroupEntityResolver.prototype, "options", null);
exports.ProductOptionGroupEntityResolver = ProductOptionGroupEntityResolver = __decorate([
    (0, graphql_1.Resolver)('ProductOptionGroup'),
    __metadata("design:paramtypes", [product_option_group_service_1.ProductOptionGroupService,
        locale_string_hydrator_1.LocaleStringHydrator])
], ProductOptionGroupEntityResolver);
//# sourceMappingURL=product-option-group-entity.resolver.js.map