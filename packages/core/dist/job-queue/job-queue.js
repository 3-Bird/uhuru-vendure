"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobQueue = void 0;
const job_1 = require("./job");
const subscribable_job_1 = require("./subscribable-job");
/**
 * @description
 * A JobQueue is used to process {@link Job}s. A job is added to the queue via the
 * `.add()` method, and the configured {@link JobQueueStrategy} will check for new jobs and process each
 * according to the defined `process` function.
 *
 * *Note*: JobQueue instances should not be directly instantiated. Rather, the
 * {@link JobQueueService} `createQueue()` method should be used (see that service
 * for example usage).
 *
 * @docsCategory JobQueue
 */
class JobQueue {
    get name() {
        return this.options.name;
    }
    get started() {
        return this.running;
    }
    constructor(options, jobQueueStrategy, jobBufferService) {
        this.options = options;
        this.jobQueueStrategy = jobQueueStrategy;
        this.jobBufferService = jobBufferService;
        this.running = false;
    }
    /** @internal */
    async start() {
        if (this.running) {
            return;
        }
        this.running = true;
        await this.jobQueueStrategy.start(this.options.name, this.options.process);
    }
    /** @internal */
    async stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        return this.jobQueueStrategy.stop(this.options.name, this.options.process);
    }
    /**
     * @description
     * Adds a new {@link Job} to the queue. The resolved {@link SubscribableJob} allows the
     * calling code to subscribe to updates to the Job:
     *
     * @example
     * ```ts
     * const job = await this.myQueue.add({ intervalMs, shouldFail }, { retries: 2 });
     * return job.updates().pipe(
     *   map(update => {
     *     // The returned Observable will emit a value for every update to the job
     *     // such as when the `progress` or `status` value changes.
     *     Logger.info(`Job ${update.id}: progress: ${update.progress}`);
     *     if (update.state === JobState.COMPLETED) {
     *       Logger.info(`COMPLETED ${update.id}: ${update.result}`);
     *     }
     *     return update.result;
     *   }),
     *   catchError(err => of(err.message)),
     * );
     * ```
     *
     * Alternatively, if you aren't interested in the intermediate
     * `progress` changes, you can convert to a Promise like this:
     *
     * @example
     * ```ts
     * const job = await this.myQueue.add({ intervalMs, shouldFail }, { retries: 2 });
     * return job.updates().toPromise()
     *   .then(update => update.result),
     *   .catch(err => err.message);
     * ```
     */
    async add(data, options) {
        var _a;
        const job = new job_1.Job({
            data,
            queueName: this.options.name,
            retries: (_a = options === null || options === void 0 ? void 0 : options.retries) !== null && _a !== void 0 ? _a : 0,
        });
        const isBuffered = await this.jobBufferService.add(job);
        if (!isBuffered) {
            const addedJob = await this.jobQueueStrategy.add(job, options);
            return new subscribable_job_1.SubscribableJob(addedJob, this.jobQueueStrategy);
        }
        else {
            const bufferedJob = new job_1.Job(Object.assign(Object.assign({}, job), { data: job.data, id: 'buffered' }));
            return new subscribable_job_1.SubscribableJob(bufferedJob, this.jobQueueStrategy);
        }
    }
}
exports.JobQueue = JobQueue;
//# sourceMappingURL=job-queue.js.map