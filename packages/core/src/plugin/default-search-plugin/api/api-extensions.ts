import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';

export const stockStatusExtension = gql`
    extend type SearchResult {
        inStock: Boolean!
    }

    input SearchPriceRangeInput {
        min: Int
        max: Int
    }

    extend input SearchInput {
        inStock: Boolean
        priceRange: SearchPriceRangeInput
    }
`;
