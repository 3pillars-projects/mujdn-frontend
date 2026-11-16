import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { InterceptModel } from 'cast-response';
import { Validators } from '@angular/forms';
import { CustomValidators } from '@/validators/custom-validators';
import { DevicesConfigurationService } from '@/services/features/business/devices-configuration.service';
import { DevicesConfigurationInterceptor } from '@/model-interceptors/features/business/devices-configuration.interceptor';
import { A } from '@angular/cdk/activedescendant-key-manager.d-Bjic5obv';
import { AccessLocation } from './access-location';
import { FactoryService } from '@/services/factory-service';
import { LanguageService } from '@/services/shared/language.service';
import { getLocalizedName } from '@/utils/localized-name';

const { send, receive } = new DevicesConfigurationInterceptor();

@InterceptModel({ send, receive })
export class DevicesConfiguration extends BaseCrudModel<
  DevicesConfiguration,
  DevicesConfigurationService
> {
  override $$__service_name__$$: string = 'DevicesConfigurationService';
  declare deviceCode: string;
  declare deviceIp: string;
  declare deviceName: string;
  declare accessLocationId: number;
  declare status: number;
  declare accessLocation: AccessLocation;
  private languageService?: LanguageService;

  constructor() {
    super();
    this.languageService = FactoryService.getService('LanguageService');
  }
  buildForm() {
    const { accessLocationId } = this;
    return {
      accessLocationId: [accessLocationId, []],
    };
  }

  getAccessLocationName(): string {
    return getLocalizedName(this.accessLocation, this.languageService?.getCurrentLanguage() ?? '');
  }
}
