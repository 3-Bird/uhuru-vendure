/**
 * @description
 * A cache which automatically refreshes itself if the value is found to be stale.
 */
export interface SelfRefreshingCache<V, RefreshArgs extends any[] = []> {
    /**
     * @description
     * The current value of the cache. If the value is stale, the data will be refreshed and then
     * the fresh value will be returned.
     */
    value(...refreshArgs: RefreshArgs | [undefined] | []): Promise<V>;
    /**
     * @description
     * Allows a memoized function to be defined. For the given arguments, the `fn` function will
     * be invoked only once and its output cached and returned.
     * The results cache is cleared along with the rest of the cache according to the configured
     * `ttl` value.
     */
    memoize<Args extends any[], R>(
        args: Args,
        refreshArgs: RefreshArgs,
        fn: (value: V, ...args: Args) => R,
    ): Promise<R>;
    /**
     * @description
     * Force a refresh of the value, e.g. when it is known that the value has changed such as after
     * an update operation to the source data in the database.
     */
    refresh(...args: RefreshArgs): Promise<V>;
}
export interface SelfRefreshingCacheConfig<V, RefreshArgs extends any[]> {
    name: string;
    ttl: number;
    refresh: {
        fn: (...args: RefreshArgs) => Promise<V>;
        /**
         * Default arguments, passed to refresh function
         */
        defaultArgs: RefreshArgs;
    };
    /**
     * Intended for unit testing the SelfRefreshingCache only.
     * By default uses `() => new Date().getTime()`
     */
    getTimeFn?: () => number;
}
/**
 * @description
 * Creates a {@link SelfRefreshingCache} object, which is used to cache a single frequently-accessed value. In this type
 * of cache, the function used to populate the value (`refreshFn`) is defined during the creation of the cache, and
 * it is immediately used to populate the initial value.
 *
 * From there, when the `.value` property is accessed, it will return a value from the cache, and if the
 * value has expired, it will automatically run the `refreshFn` to update the value and then return the
 * fresh value.
 */
export declare function createSelfRefreshingCache<V, RefreshArgs extends any[]>(
    config: SelfRefreshingCacheConfig<V, RefreshArgs>,
    refreshArgs?: RefreshArgs,
): Promise<SelfRefreshingCache<V, RefreshArgs>>;
