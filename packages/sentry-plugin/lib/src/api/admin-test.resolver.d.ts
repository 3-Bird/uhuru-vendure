import { SentryService } from '../sentry.service';
import { ErrorTestService } from './error-test.service';
export declare class SentryAdminTestResolver {
    private sentryService;
    private errorTestService;
    constructor(sentryService: SentryService, errorTestService: ErrorTestService);
    createTestError(args: { errorType: string }): Promise<number | true | undefined>;
}
