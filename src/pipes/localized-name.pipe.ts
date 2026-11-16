import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '@/services/shared/language.service';
import { getLocalizedName, LocalizedNamePrefix } from '@/utils/localized-name';

/**
 * Shows an entity's `${prefix}Ar` / `${prefix}En` value for the current UI language,
 * falling back to Arabic when the English value is blank.
 *
 * Impure (like ngx-translate's `translate` pipe) so it re-renders when the language is
 * switched at runtime; the transform is a couple of property reads and returns a string.
 *
 * @example {{ department | localizedName }}
 * @example {{ employee | localizedName: 'fullName' }}
 */
@Pipe({ name: 'localizedName', pure: false })
export class LocalizedNamePipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  transform(entity: object | null | undefined, prefix?: LocalizedNamePrefix): string {
    return getLocalizedName(entity, this.languageService.getCurrentLanguage(), prefix);
  }
}
