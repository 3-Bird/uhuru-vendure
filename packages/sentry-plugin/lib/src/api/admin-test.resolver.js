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
exports.SentryAdminTestResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const core_1 = require("@vendure/core");
const sentry_service_1 = require("../sentry.service");
const error_test_service_1 = require("./error-test.service");
let SentryAdminTestResolver = class SentryAdminTestResolver {
    constructor(sentryService, errorTestService) {
        this.sentryService = sentryService;
        this.errorTestService = errorTestService;
    }
    async createTestError(args) {
        switch (args.errorType) {
            case 'UNCAUGHT_ERROR':
                return a / 10;
            case 'THROWN_ERROR':
                throw new core_1.UserInputError('SentryPlugin Test Error');
            case 'CAPTURED_ERROR':
                this.sentryService.captureException(new Error('SentryPlugin Direct error'));
                return true;
            case 'CAPTURED_MESSAGE':
                this.sentryService.captureMessage('Captured message');
                return true;
            case 'DATABASE_ERROR':
                await this.errorTestService.createDatabaseError();
                return true;
        }
    }
};
exports.SentryAdminTestResolver = SentryAdminTestResolver;
__decorate([
    (0, core_1.Allow)(core_1.Permission.SuperAdmin),
    (0, graphql_1.Mutation)(),
    __param(0, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SentryAdminTestResolver.prototype, "createTestError", null);
exports.SentryAdminTestResolver = SentryAdminTestResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [sentry_service_1.SentryService, error_test_service_1.ErrorTestService])
], SentryAdminTestResolver);
//# sourceMappingURL=admin-test.resolver.js.map