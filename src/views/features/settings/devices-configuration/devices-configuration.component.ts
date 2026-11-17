import { Component, inject, OnInit } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { TranslatePipe } from '@ngx-translate/core';
import { DevicesConfigurationModalComponent } from '../devices-configuration-modal/devices-configuration-modal.component';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { DevicesConfiguration } from '@/models/features/business/devices-configuration';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { DevicesConfigurationService } from '@/services/features/business/devices-configuration.service';
import { DevicesLocationModalComponent } from '../devices-location-modal/devices-location-modal.component';
import { AccessLocationService } from '@/services/features/business/access-location.service';
import DevicesConfigurationFilter from '@/models/features/business/devices-configuration-filter';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';
import {
  DEVICE_STATUS_CONFIG,
  DEVICE_STATUS_ENUM,
  DEVICE_STATUS_OPTIONS,
} from '@/enums/device-status-enum';

@Component({
  selector: 'app-devices-configuration',
  imports: [
    Breadcrumb,
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    CommonModule,
    PaginatorModule,
    DatePickerModule,
    Select,
    FormsModule,
    TranslatePipe,
    LocalizedNamePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './devices-configuration.component.html',
  styleUrl: './devices-configuration.component.scss',
})
export default class DevicesConfigurationComponent
  extends BaseListComponent<
    DevicesConfiguration,
    DevicesLocationModalComponent,
    DevicesConfigurationService,
    DevicesConfigurationFilter
  >
  implements OnInit
{
  override dialogSize = {
    width: '100%',
    maxWidth: '600px',
  };
  devicesConfigurationService = inject(DevicesConfigurationService);
  filterModel: DevicesConfigurationFilter = new DevicesConfigurationFilter();
  accessLocationService = inject(AccessLocationService);
  accessLocations: BaseLookupModel[] = [];
  deviceStatusEnum = DEVICE_STATUS_ENUM;
  deviceStatuses = DEVICE_STATUS_OPTIONS;

  override get service() {
    return this.devicesConfigurationService;
  }

  override initListComponent(): void {
    this.loadAccessLocations();
  }

  private loadAccessLocations() {
    this.accessLocationService.getLookup().subscribe((locations) => {
      this.accessLocations = locations;
    });
  }

  override openDialog(model: DevicesConfiguration): void {
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    const lookups = { accessLocations: this.accessLocations };
    this.openBaseDialog(DevicesConfigurationModalComponent as any, model, viewMode, lookups);
  }

  addOrEditModel(devicesLocation?: DevicesConfiguration): void {
    this.openDialog(devicesLocation ?? new DevicesConfiguration());
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'DEVICE_CONFIGURATION.DEVICE_CONFIGURATION' }];
  }

  protected override mapModelToExcelRow(model: DevicesConfiguration): { [key: string]: any } {
    return {
      [this.translateService.instant('DEVICE_CONFIGURATION.DEVICE_CODE')]: model.deviceCode,
      [this.translateService.instant('DEVICE_CONFIGURATION.DEVICE_NAME')]: model.deviceName,
      [this.translateService.instant('DEVICE_CONFIGURATION.IP_ADDRESS')]: model.deviceIp,
      [this.translateService.instant('DEVICE_CONFIGURATION.ACCESS_LOCATION')]:
        model.getAccessLocationName(),
      [this.translateService.instant('DEVICE_CONFIGURATION.CONNECTION_STATUS')]:
        this.translateService.instant(this.getStatusConfig(model.status).labelKey),
    };
  }

  getPropertyName() {
    return this.langService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }
  getStatusConfig(status: DEVICE_STATUS_ENUM | null | undefined) {
    return DEVICE_STATUS_CONFIG[status ?? DEVICE_STATUS_ENUM.NOT_ASSIGNED];
  }
}
