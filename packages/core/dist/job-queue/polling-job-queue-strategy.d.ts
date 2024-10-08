import { ID } from '@vendure/common/lib/shared-types';
import { InjectableJobQueueStrategy } from './injectable-job-queue-strategy';
import { Job } from './job';
import { QueueNameProcessStorage } from './queue-name-process-storage';
import { JobData } from './types';
/**
 * @description
 * Defines the backoff strategy used when retrying failed jobs. Returns the delay in
 * ms that should pass before the failed job is retried.
 *
 * @docsCategory JobQueue
 * @docsPage types
 */
export type BackoffStrategy = (queueName: string, attemptsMade: number, job: Job) => number;
export interface PollingJobQueueStrategyConfig {
    /**
     * @description
     * How many jobs from a given queue to process concurrently.
     *
     * @default 1
     */
    concurrency?: number;
    /**
     * @description
     * The interval in ms between polling the database for new jobs.
     *
     * @description 200
     */
    pollInterval?: number | ((queueName: string) => number);
    /**
     * @description
     * When a job is added to the JobQueue using `JobQueue.add()`, the calling
     * code may specify the number of retries in case of failure. This option allows
     * you to override that number and specify your own number of retries based on
     * the job being added.
     */
    setRetries?: (queueName: string, job: Job) => number;
    /**
     * @description
     * The strategy used to decide how long to wait before retrying a failed job.
     *
     * @default () => 1000
     */
    backoffStrategy?: BackoffStrategy;
    /**
     * @description
     * The timeout in ms which the queue will use when attempting a graceful shutdown.
     * That means, when the server is shut down but a job is running, the job queue will
     * wait for the job to complete before allowing the server to shut down. If the job
     * does not complete within this timeout window, the job will be forced to stop
     * and the server will shut down anyway.
     *
     * @since 2.2.0
     * @default 20_000
     */
    gracefulShutdownTimeout?: number;
}
declare class ActiveQueue<Data extends JobData<Data> = object> {
    private readonly queueName;
    private readonly process;
    private readonly jobQueueStrategy;
    private timer;
    private running;
    private activeJobs;
    private errorNotifier$;
    private queueStopped$;
    private subscription;
    private readonly pollInterval;
    constructor(
        queueName: string,
        process: (job: Job<Data>) => Promise<any>,
        jobQueueStrategy: PollingJobQueueStrategy,
    );
    start(): void;
    stop(stopActiveQueueTimeout?: number): Promise<void>;
    private awaitRunningJobsOrTimeout;
    private onFailOrComplete;
    private removeJobFromActive;
}
/**
 * @description
 * This class allows easier implementation of {@link JobQueueStrategy} in a polling style.
 * Instead of providing {@link JobQueueStrategy} `start()` you should provide a `next` method.
 *
 * This class should be extended by any strategy which does not support a push-based system
 * to notify on new jobs. It is used by the {@link SqlJobQueueStrategy} and {@link InMemoryJobQueueStrategy}.
 *
 * @docsCategory JobQueue
 */
export declare abstract class PollingJobQueueStrategy extends InjectableJobQueueStrategy {
    concurrency: number;
    pollInterval: number | ((queueName: string) => number);
    setRetries: (queueName: string, job: Job) => number;
    backOffStrategy?: BackoffStrategy;
    gracefulShutdownTimeout: number;
    protected activeQueues: QueueNameProcessStorage<ActiveQueue<any>>;
    constructor(config?: PollingJobQueueStrategyConfig);
    constructor(concurrency?: number, pollInterval?: number);
    start<Data extends JobData<Data> = object>(
        queueName: string,
        process: (job: Job<Data>) => Promise<any>,
    ): Promise<void>;
    stop<Data extends JobData<Data> = object>(
        queueName: string,
        process: (job: Job<Data>) => Promise<any>,
    ): Promise<void>;
    cancelJob(jobId: ID): Promise<Job | undefined>;
    /**
     * @description
     * Should return the next job in the given queue. The implementation is
     * responsible for returning the correct job according to the time of
     * creation.
     */
    abstract next(queueName: string): Promise<Job | undefined>;
    /**
     * @description
     * Update the job details in the store.
     */
    abstract update(job: Job): Promise<void>;
    /**
     * @description
     * Returns a job by its id.
     */
    abstract findOne(id: ID): Promise<Job | undefined>;
}
export {};
