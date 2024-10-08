import { DeepPartial } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../../api/common/request-context';
import { Translatable, Translation, TranslationInput } from '../../../common/types/locale-types';
import { TransactionalConnection } from '../../../connection/transactional-connection';
export type TranslationContructor<T> = new (
    input?: DeepPartial<TranslationInput<T>> | DeepPartial<Translation<T>>,
) => Translation<T>;
export interface TranslationDiff<T> {
    toUpdate: Array<Translation<T>>;
    toAdd: Array<Translation<T>>;
}
/**
 * This class is to be used when performing an update on a Translatable entity.
 */
export declare class TranslationDiffer<Entity extends Translatable> {
    private translationCtor;
    private connection;
    constructor(translationCtor: TranslationContructor<Entity>, connection: TransactionalConnection);
    /**
     * Compares the existing translations with the updated translations and produces a diff of
     * added, removed and updated translations.
     */
    diff(
        existing: Array<Translation<Entity>>,
        updated?: Array<TranslationInput<Entity>> | null,
    ): TranslationDiff<Entity>;
    applyDiff(
        ctx: RequestContext,
        entity: Entity,
        { toUpdate, toAdd }: TranslationDiff<Entity>,
    ): Promise<Entity>;
    private translationInputsToEntities;
}
