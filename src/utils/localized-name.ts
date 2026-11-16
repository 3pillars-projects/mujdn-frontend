import { LANGUAGE_ENUM } from '@/enums/language-enum';

/** A bilingual text value as it arrives from the API (English names are optional). */
export type LocalizedText = string | null | undefined;

/**
 * The shared part of a bilingual property pair: `'name'` for nameAr/nameEn,
 * `'fullName'` for fullNameAr/fullNameEn, `'departmentName'`, and so on.
 */
export type LocalizedNamePrefix = string;

const DEFAULT_PREFIX = 'name';

/** True when the value is null, undefined, empty or whitespace only. */
export function isBlankText(value: LocalizedText): boolean {
  return !value?.trim();
}

/** Returns `primary` unless it is blank, otherwise `fallback` (or `''`). */
function firstNonBlank(primary: LocalizedText, fallback: LocalizedText): string {
  return (isBlankText(primary) ? fallback : primary) ?? '';
}

/** English text, falling back to the Arabic text when the English one is blank. */
export function englishOrArabic(ar: LocalizedText, en: LocalizedText): string {
  return firstNonBlank(en, ar);
}

/**
 * Text for the given UI language: English falls back to Arabic when blank
 * (and Arabic falls back to English, for defensive symmetry).
 */
export function localizeText(ar: LocalizedText, en: LocalizedText, language: string): string {
  return language === LANGUAGE_ENUM.ENGLISH ? firstNonBlank(en, ar) : firstNonBlank(ar, en);
}

function readPair(entity: object, prefix: string): [LocalizedText, LocalizedText] {
  const record = entity as Record<string, LocalizedText>;
  return [record[`${prefix}Ar`], record[`${prefix}En`]];
}

/**
 * Localized `${prefix}Ar` / `${prefix}En` value of an entity for the given UI language,
 * with the English → Arabic fallback.
 *
 * @example getLocalizedName(department, lang)              // nameAr / nameEn
 * @example getLocalizedName(user, lang, 'fullName')        // fullNameAr / fullNameEn
 */
export function getLocalizedName(
  entity: object | null | undefined,
  language: string,
  prefix: LocalizedNamePrefix = DEFAULT_PREFIX
): string {
  if (!entity) return '';
  const [ar, en] = readPair(entity, prefix);
  return localizeText(ar, en, language);
}

/** `${prefix}En` of an entity, falling back to `${prefix}Ar` when blank. */
export function getEnglishName(
  entity: object | null | undefined,
  prefix: LocalizedNamePrefix = DEFAULT_PREFIX
): string {
  if (!entity) return '';
  const [ar, en] = readPair(entity, prefix);
  return englishOrArabic(ar, en);
}

/**
 * Returns the items with a blank `${prefix}En` filled from `${prefix}Ar`, for display-only
 * collections such as dropdown options whose `optionLabel` is a property name.
 *
 * Items that already have an English value are returned as-is, and the original array is
 * returned untouched when nothing needs filling. Filled items are shallow copies that keep
 * their prototype; the source objects are never mutated, so do not send the result back to
 * the API as an entity payload.
 */
export function withEnglishNameFallback<T extends object>(
  items: readonly T[] | null | undefined,
  prefix: LocalizedNamePrefix = DEFAULT_PREFIX
): T[] {
  if (!items?.length) return (items as T[]) ?? [];

  const enKey = `${prefix}En`;
  let changed = false;
  const result = items.map((item) => {
    if (!item) return item;
    const [ar, en] = readPair(item, prefix);
    if (!isBlankText(en) || isBlankText(ar)) return item;
    changed = true;
    return Object.assign(Object.create(Object.getPrototypeOf(item)), item, { [enKey]: ar }) as T;
  });

  return changed ? result : (items as T[]);
}
