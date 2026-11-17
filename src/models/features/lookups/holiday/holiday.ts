import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { HolidayInterceptor } from '@/model-interceptors/features/lookups/holiday.interceptor';
import { FactoryService } from '@/services/factory-service';
import { HolidayService } from '@/services/features/lookups/holiday.service';
import { LanguageService } from '@/services/shared/language.service';
import { CustomValidators } from '@/validators/custom-validators';
import { Validators } from '@angular/forms';
import { InterceptModel } from 'cast-response';
import { getLocalizedName } from '@/utils/localized-name';

const { send, receive } = new HolidayInterceptor();

@InterceptModel({ send, receive })
export class Holiday extends BaseCrudModel<Holiday, HolidayService> {
  override $$__service_name__$$: string = 'HolidayService';
  declare nameAr: string;
  declare nameEn: string;
  declare startDate: Date | string;
  declare endDate: Date | string;
  declare notes: String;
  private languageService?: LanguageService;
  constructor(languageService?: LanguageService) {
    super();
    this.languageService = FactoryService.getService('LanguageService');
  }
  buildForm() {
    const { nameAr, nameEn, startDate, endDate, notes } = this;
    return {
      nameAr: [
        nameAr,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.ARABIC_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
          CustomValidators.pattern('AR_NUM'),
        ],
      ],
      nameEn: [
        nameEn,
        [
          Validators.maxLength(CustomValidators.defaultLengths.ENGLISH_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
          CustomValidators.pattern('ENG_NUM'),
        ],
      ],
      startDate: [startDate, [Validators.required]],
      endDate: [endDate, [Validators.required]],
      notes: [
        notes,
        [
          Validators.maxLength(CustomValidators.defaultLengths.NOTES),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
        ],
      ],
    };
  }
  getName(): string {
    return getLocalizedName(this, this.languageService?.getCurrentLanguage() ?? '');
  }
  getStartDate(): string {
    return this.startDate
      ? new Date(this.startDate).toLocaleDateString(
          this.languageService?.getCurrentLanguage() == LANGUAGE_ENUM.ARABIC ? 'ar-EG' : 'en-US'
        )
      : '';
  }
  getEndDate(): string {
    return this.endDate
      ? new Date(this.endDate).toLocaleDateString(
          this.languageService?.getCurrentLanguage() == LANGUAGE_ENUM.ARABIC ? 'ar-EG' : 'en-US'
        )
      : '';
  }
}
