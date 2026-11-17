import { LANGUAGE_ENUM } from '@/enums/language-enum';
import {
  englishOrArabic,
  getEnglishName,
  getLocalizedName,
  isBlankText,
  localizeText,
  withEnglishNameFallback,
} from './localized-name';

describe('localized-name utils', () => {
  const EN = LANGUAGE_ENUM.ENGLISH;
  const AR = LANGUAGE_ENUM.ARABIC;

  it('treats null, undefined, empty and whitespace as blank', () => {
    expect(isBlankText(null)).toBeTrue();
    expect(isBlankText(undefined)).toBeTrue();
    expect(isBlankText('')).toBeTrue();
    expect(isBlankText('   ')).toBeTrue();
    expect(isBlankText('Riyadh')).toBeFalse();
  });

  it('falls back to Arabic when English is blank', () => {
    expect(englishOrArabic('الرياض', 'Riyadh')).toBe('Riyadh');
    expect(englishOrArabic('الرياض', '')).toBe('الرياض');
    expect(englishOrArabic('الرياض', '  ')).toBe('الرياض');
    expect(englishOrArabic('الرياض', null)).toBe('الرياض');
    expect(englishOrArabic(null, undefined)).toBe('');
  });

  it('localizes by language', () => {
    expect(localizeText('الرياض', 'Riyadh', EN)).toBe('Riyadh');
    expect(localizeText('الرياض', 'Riyadh', AR)).toBe('الرياض');
    expect(localizeText('الرياض', '', EN)).toBe('الرياض');
    expect(localizeText('', 'Riyadh', AR)).toBe('Riyadh');
  });

  it('reads prefixed entity properties', () => {
    const user = { fullNameAr: 'أحمد', fullNameEn: '' };
    expect(getLocalizedName(user, EN, 'fullName')).toBe('أحمد');
    expect(getLocalizedName({ nameAr: 'قسم', nameEn: 'Dept' }, EN)).toBe('Dept');
    expect(getLocalizedName(null, EN)).toBe('');
    expect(getEnglishName({ nameAr: 'قسم', nameEn: null })).toBe('قسم');
  });

  it('fills blank English names on options without mutating the source', () => {
    class Option {
      constructor(
        public id: number,
        public nameAr: string,
        public nameEn?: string | null
      ) {}
    }
    const complete = [new Option(1, 'أ', 'A')];
    expect(withEnglishNameFallback(complete)).toBe(complete);

    const source = [new Option(1, 'أ', 'A'), new Option(2, 'ب', '')];
    const result = withEnglishNameFallback(source);
    expect(result).not.toBe(source);
    expect(result[0]).toBe(source[0]);
    expect(result[1].nameEn).toBe('ب');
    expect(result[1]).toBeInstanceOf(Option);
    expect(source[1].nameEn).toBe('');
    expect(withEnglishNameFallback(null)).toEqual([]);
  });
});
