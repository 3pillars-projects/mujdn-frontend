import { Pipe, PipeTransform } from '@angular/core';
import { LocalizedNamePrefix, withEnglishNameFallback } from '@/utils/localized-name';

/**
 * Fills a blank `${prefix}En` from `${prefix}Ar` on dropdown options, so PrimeNG selects
 * whose `optionLabel` is a language-dependent property name (`nameAr` / `nameEn`) show,
 * filter and type-ahead on the Arabic name instead of an empty label.
 *
 * Pure: recomputed only when the options array reference changes, and returns the same
 * array when no option needs filling. Bind with `optionValue` so the form value stays the id.
 *
 * @example [options]="departments | withNameFallback"
 * @example [options]="employees | withNameFallback: 'fullName'"
 */
@Pipe({ name: 'withNameFallback' })
export class WithNameFallbackPipe implements PipeTransform {
  transform<T extends object>(
    options: readonly T[] | null | undefined,
    prefix?: LocalizedNamePrefix
  ): T[] {
    return withEnglishNameFallback(options, prefix);
  }
}
