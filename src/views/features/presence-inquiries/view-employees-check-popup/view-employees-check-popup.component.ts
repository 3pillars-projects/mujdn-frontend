import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { PRESENCE_INQUIRY_STATUS_ENUM } from '@/enums/presence-inquiry-status-enum';
import { USER_PRESENCE_INQUIRY_STATUS_ENUM } from '@/enums/user-presence-inquiry-status-enum';
import { PresenceInquiry } from '@/models/features/presence-inquiry/presence-inquiry';
import { UserProfilePresenceInquiry } from '@/models/features/presence-inquiry/user-profile-presence-inquiry';
import { AlertService } from '@/services/shared/alert.service';
import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { M } from '@angular/material/dialog.d-B5HZULyo';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { NotificationTypeEnum } from '@/enums/notification-type-enum';
import { NotificationTypeService } from '@/services/features/setting/notification-type.service';
import { NotificationTypeBaseLookupModel } from '@/models/features/lookups/notification-type-base-lookup-model';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';

@Component({
  selector: 'app-view-employees-check-popup',
  imports: [CommonModule, TranslatePipe, LocalizedNamePipe],
  templateUrl: './view-employees-check-popup.component.html',
  styleUrl: './view-employees-check-popup.component.scss',
})
export class ViewEmployeesCheckPopupComponent
  extends BasePopupComponent<PresenceInquiry>
  implements OnInit
{
  override afterSave(model: PresenceInquiry, dialogRef: M<any, any>): void {}

  beforeSave(model: PresenceInquiry, form: FormGroup) {
    return form.valid;
  }
  declare model: PresenceInquiry;
  declare form: FormGroup;

  alertService = inject(AlertService);
  fb = inject(FormBuilder);
  data = inject(MAT_DIALOG_DATA);
  inquiryStatusEnum = PRESENCE_INQUIRY_STATUS_ENUM;
  userInquiryStatusEnum = USER_PRESENCE_INQUIRY_STATUS_ENUM;
  statusGroups: any[] = [];
  notificationTypeService = inject(NotificationTypeService);
  declare presenceProofNotificationType: NotificationTypeBaseLookupModel;

  override initPopup() {
    this.model = this.data.model ?? new PresenceInquiry();
    const grouped =
      this.model.assignedUsers?.reduce(
        (acc, user) => {
          if (!acc[user.inquiryStatusId]) acc[user.inquiryStatusId] = [];
          acc[user.inquiryStatusId].push(user);
          return acc;
        },
        {} as Record<number, UserProfilePresenceInquiry[]>
      ) ?? {};

    this.statusGroups = Object.keys(grouped).map((id) => ({
      id: +id,
      users: grouped[+id],
    }));

    this.notificationTypeService.getById(NotificationTypeEnum.PRESENCE_INQUIRY).subscribe({
      next: (type) => {
        this.presenceProofNotificationType = type;
      },
    });
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm());
  }

  override prepareModel(
    model: PresenceInquiry,
    form: FormGroup
  ): PresenceInquiry | Observable<PresenceInquiry> {
    this.model = Object.assign(model, { ...form.value });
    return this.model;
  }

  override saveFail(error: Error): void {
    // optional error handling
  }
}
