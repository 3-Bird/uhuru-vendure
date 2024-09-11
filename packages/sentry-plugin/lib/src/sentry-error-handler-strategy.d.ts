import { ArgumentsHost } from '@nestjs/common';
import { ErrorHandlerStrategy, Injector, Job } from '@vendure/core';
export declare class SentryErrorHandlerStrategy implements ErrorHandlerStrategy {
    private sentryService;
    init(injector: Injector): void;
    handleServerError(
        exception: Error,
        {
            host,
        }: {
            host: ArgumentsHost;
        },
    ): void;
    handleWorkerError(
        exception: Error,
        {
            job,
        }: {
            job: Job;
        },
    ): void;
}
