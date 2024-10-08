/**
 * @description
 * Returns an array with only unique values. Objects are compared by reference,
 * unless the `byKey` argument is supplied, in which case matching properties will
 * be used to check duplicates
 */
export declare function unique<T>(arr: T[], byKey?: keyof T): T[];
