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
exports.SentryContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("./constants");
const sentry_service_1 = require("./sentry.service");
let SentryContextMiddleware = class SentryContextMiddleware {
    constructor(options, sentryService) {
        this.options = options;
        this.sentryService = sentryService;
    }
    use(req, res, next) {
        if (this.options.enableTracing) {
            const transaction = this.sentryService.startTransaction({
                op: 'resolver',
                name: `GraphQLTransaction`,
            });
            req[constants_1.SENTRY_TRANSACTION_KEY] = transaction;
        }
        next();
    }
};
exports.SentryContextMiddleware = SentryContextMiddleware;
exports.SentryContextMiddleware = SentryContextMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.SENTRY_PLUGIN_OPTIONS)),
    __metadata("design:paramtypes", [Object, sentry_service_1.SentryService])
], SentryContextMiddleware);
//# sourceMappingURL=sentry-context.middleware.js.map