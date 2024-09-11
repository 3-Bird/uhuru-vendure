"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryService = void 0;
const common_1 = require("@nestjs/common");
const Sentry = __importStar(require("@sentry/node"));
const constants_1 = require("./constants");
let SentryService = class SentryService {
    constructor(options) {
        this.options = options;
    }
    onApplicationBootstrap() {
        var _a, _b;
        const integrations = (_a = this.options.integrations) !== null && _a !== void 0 ? _a : [
            new Sentry.Integrations.Http({ tracing: true }),
            ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
        ];
        Sentry.init(Object.assign(Object.assign({}, this.options), { tracesSampleRate: (_b = this.options.tracesSampleRate) !== null && _b !== void 0 ? _b : 1.0, integrations, dsn: this.options.dsn }));
    }
    onApplicationShutdown() {
        return Sentry.close();
    }
    captureException(exception) {
        Sentry.captureException(exception);
    }
    captureMessage(message, captureContext) {
        Sentry.captureMessage(message, captureContext);
    }
    startTransaction(context) {
        return Sentry.startTransaction(context);
    }
};
exports.SentryService = SentryService;
exports.SentryService = SentryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.SENTRY_PLUGIN_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], SentryService);
//# sourceMappingURL=sentry.service.js.map