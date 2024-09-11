import { PackageManager, UserResponses } from './types';
/**
 * Prompts the user to determine how the new Vendure app should be configured.
 */
export declare function gatherUserResponses(
    root: string,
    alreadyRanScaffold: boolean,
    packageManager: PackageManager,
): Promise<UserResponses>;
/**
 * Returns mock "user response" without prompting, for use in CI
 */
export declare function gatherCiUserResponses(
    root: string,
    packageManager: PackageManager,
): Promise<UserResponses>;
export declare function checkCancel<T>(value: T | symbol): value is T;
