import { Pipe, PipeTransform } from '@angular/core';
import { getEnglishName, LocalizedNamePrefix } from '@/utils/localized-name';

/**
 * Shows an entity's `${prefix}En` value, falling back to `${prefix}Ar` when blank.
 * Use for dedicated "English name" cells; use `localizedName` for language-dependent text.
 *
 * @example {{ city | englishName }}
 * @example {{ employee | englishName: 'fullName' }}
 */
@Pipe({ name: 'englishName' })
export class EnglishNamePipe implements PipeTransform {
  transform(entity: object | null | undefined, prefix?: LocalizedNamePrefix): string {
    return getEnglishName(entity, prefix);
  }
}
