import { CreateAddressInput, CreateCustomerInput } from '@vendure/common/lib/generated-types';
import { SimpleGraphQLClient } from '../simple-graphql-client';
/**
 * A service for creating mock data via the GraphQL API.
 */
export declare class MockDataService {
    private client;
    private logging;
    apiUrl: string;
    constructor(client: SimpleGraphQLClient, logging?: boolean);
    static getCustomers(count: number): Array<{
        customer: CreateCustomerInput;
        address: CreateAddressInput;
    }>;
    /**
     * @deprecated
     * Use `MockDataService.getCustomers()` and create customers directly with CustomerService.
     */
    populateCustomers(count?: number): Promise<any>;
    private log;
}
