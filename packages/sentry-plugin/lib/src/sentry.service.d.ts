import { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { CaptureContext, TransactionContext } from '@sentry/types';
import { SentryPluginOptions } from './types';
export declare class SentryService implements OnApplicationBootstrap, OnApplicationShutdown {
    private options;
    constructor(options: SentryPluginOptions);
    onApplicationBootstrap(): any;
    onApplicationShutdown(): Promise<boolean>;
    captureException(exception: Error): void;
    captureMessage(message: string, captureContext?: CaptureContext): void;
    startTransaction(context: TransactionContext): Sentry.Transaction;
}
