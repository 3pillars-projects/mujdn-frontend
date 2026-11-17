import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { RegionInterceptor } from '@/model-interceptors/features/lookups/region.interceptor';
import { RegionService } from '@/services/features/lookups/region.service';
import { CustomValidators } from '@/validators/custom-validators';
import { Validators } from '@angular/forms';
import { InterceptModel } from 'cast-response';
import { FactoryService } from '@/services/factory-service';
import { LanguageService } from '@/services/shared/language.service';
import { getLocalizedName } from '@/utils/localized-name';

const { send, receive } = new RegionInterceptor();

@InterceptModel({ send, receive })
export class Region extends BaseCrudModel<Region, RegionService> {
  override $$__service_name__$$: string = 'RegionService';
  declare nameAr: string;
  declare nameEn: string;
  private languageService!: LanguageService;

  constructor() {
    super();
    this.languageService = FactoryService.getService('LanguageService');
  }

  getName(): string {
    return getLocalizedName(this, this.languageService?.getCurrentLanguage() ?? '');
  }

  buildForm() {
    const { nameAr, nameEn } = this;
    return {
      nameAr: [
        nameAr,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.REGION_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
          CustomValidators.pattern('AR_NUM'),
        ],
      ],
      nameEn: [
        nameEn,
        [
          Validators.maxLength(CustomValidators.defaultLengths.REGION_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
          CustomValidators.pattern('ENG_NUM'),
        ],
      ],
    };
  }
}
