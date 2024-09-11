import { INestApplication } from '@nestjs/common';
import { VendureConfig } from '@vendure/core';
import { TestServerOptions } from './types';
/**
 * @description
 * A real Vendure server against which the e2e tests should be run.
 *
 * @docsCategory testing
 */
export declare class TestServer {
    private vendureConfig;
    app: INestApplication;
    constructor(vendureConfig: Required<VendureConfig>);
    /**
     * @description
     * Bootstraps an instance of Vendure server and populates the database according to the options
     * passed in. Should be called in the `beforeAll` function.
     *
     * The populated data is saved into an .sqlite file for each test file. On subsequent runs, this file
     * is loaded so that the populate step can be skipped, which speeds up the tests significantly.
     */
    init(options: TestServerOptions): Promise<void>;
    /**
     * @description
     * Bootstraps a Vendure server instance. Generally the `.init()` method should be used, as that will also
     * populate the test data. However, the `bootstrap()` method is sometimes useful in tests which need to
     * start and stop a Vendure instance multiple times without re-populating data.
     */
    bootstrap(): Promise<void>;
    /**
     * @description
     * Destroy the Vendure server instance and clean up all resources.
     * Should be called after all tests have run, e.g. in an `afterAll` function.
     */
    destroy(): Promise<void>;
    private getCallerFilename;
    /**
     * Populates an .sqlite database file based on the PopulateOptions.
     */
    private populateInitialData;
    /**
     * Bootstraps an instance of the Vendure server for testing against.
     */
    private bootstrapForTesting;
}
