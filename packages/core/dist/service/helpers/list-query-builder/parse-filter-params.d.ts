import { LogicalOperator } from '@vendure/common/lib/generated-types';
import { Type } from '@vendure/common/lib/shared-types';
import { DataSource } from 'typeorm';
import { FilterParameter, NullOptionals } from '../../../common/types/common-types';
import { VendureEntity } from '../../../entity/base/base.entity';
export interface WhereGroup {
    operator: LogicalOperator;
    conditions: Array<WhereCondition | WhereGroup>;
}
export interface WhereCondition {
    clause: string;
    parameters: {
        [param: string]: string | number | string[];
    };
}
export declare function parseFilterParams<
    T extends VendureEntity,
    FP extends NullOptionals<FilterParameter<T>>,
    R extends FP extends {
        _and: Array<FilterParameter<T>>;
    }
        ? WhereGroup[]
        : FP extends {
                _or: Array<FilterParameter<T>>;
            }
          ? WhereGroup[]
          : WhereCondition[],
>(
    connection: DataSource,
    entity: Type<T>,
    filterParams?: FP | null,
    customPropertyMap?: {
        [name: string]: string;
    },
    entityAlias?: string,
): R;
