import { CliLogLevel } from './types';
export declare function createVendureApp(
    name: string | undefined,
    useNpm: boolean,
    logLevel: CliLogLevel,
    isCi?: boolean,
): Promise<void>;
