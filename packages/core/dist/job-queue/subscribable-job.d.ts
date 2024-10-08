import { Observable } from 'rxjs';
import { JobQueueStrategy } from '../config/job-queue/job-queue-strategy';
import { Job } from './job';
import { JobData } from './types';
/**
 * @description
 * Job update status as returned from the {@link SubscribableJob}'s `update()` method.
 *
 * @docsCategory JobQueue
 * @docsPage types
 */
export type JobUpdate<T extends JobData<T>> = Pick<
    Job<T>,
    'id' | 'state' | 'progress' | 'result' | 'error' | 'data'
>;
/**
 * @description
 * Job update options, that you can specify by calling {@link SubscribableJob} `updates` method.
 *
 * @docsCategory JobQueue
 * @docsPage types
 */
export type JobUpdateOptions = {
    /**
     * Polling interval. Defaults to 200ms
     */
    pollInterval?: number;
    /**
     * Polling timeout in milliseconds. Defaults to 1 hour
     */
    timeoutMs?: number;
    /**
     * Observable sequence will end with an error if true. Default to false
     */
    errorOnFail?: boolean;
};
/**
 * @description
 * This is a type of Job object that allows you to subscribe to updates to the Job. It is returned
 * by the {@link JobQueue}'s `add()` method. Note that the subscription capability is only supported
 * if the {@link JobQueueStrategy} implements the {@link InspectableJobQueueStrategy} interface (e.g.
 * the {@link SqlJobQueueStrategy} does support this).
 *
 * @docsCategory JobQueue
 */
export declare class SubscribableJob<T extends JobData<T> = any> extends Job<T> {
    private readonly jobQueueStrategy;
    constructor(job: Job<T>, jobQueueStrategy: JobQueueStrategy);
    /**
     * @description
     * Returns an Observable stream of updates to the Job. Works by polling the current JobQueueStrategy's `findOne()` method
     * to obtain updates. If this updates are not subscribed to, then no polling occurs.
     *
     * Polling interval, timeout and other options may be configured with an options arguments {@link JobUpdateOptions}.
     *
     */
    updates(options?: JobUpdateOptions): Observable<JobUpdate<T>>;
}
