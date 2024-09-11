import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SentryService } from './sentry.service';
import { SentryPluginOptions } from './types';
export declare class SentryContextMiddleware implements NestMiddleware {
    private options;
    private sentryService;
    constructor(options: SentryPluginOptions, sentryService: SentryService);
    use(req: Request, res: Response, next: NextFunction): void;
}
