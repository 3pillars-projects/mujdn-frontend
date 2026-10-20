import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TextareaModule } from 'primeng/textarea';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '@/services/shared/language.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { RequiredMarkerDirective } from '../../../../directives/required-marker.directive';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { markFormGroupTouched } from '@/utils/general-helper';

/** Optional texts so other request types (e.g. work missions) can reuse this dialog. */
export interface RejectPopupData {
  titleKey?: string;
  confirmKey?: string;
}

/** Notes made only of spaces count as empty; the API trims them and would refuse them. */
function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  return value && value.trim().length === 0 ? { required: true } : null;
}

@Component({
  selector: 'app-leaves-reject-popup',
  imports: [
    ReactiveFormsModule,
    TextareaModule,
    TranslatePipe,
    RequiredMarkerDirective,
    ValidationMessagesComponent,
  ],
  templateUrl: './leaves-reject-popup.component.html',
  styleUrl: './leaves-reject-popup.component.scss',
})
export class LeavesRejectPopupComponent {
  private dialogRef = inject(MatDialogRef<LeavesRejectPopupComponent>);
  private languageService = inject(LanguageService);
  private data = inject<RejectPopupData | null>(MAT_DIALOG_DATA, { optional: true });
  fb = inject(FormBuilder);

  titleKey = this.data?.titleKey ?? 'LEAVES_PAGE.REJECT_LEAVE';
  confirmKey = this.data?.confirmKey ?? 'LEAVES_PAGE.REJECT';

  direction =
    this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
      ? LAYOUT_DIRECTION_ENUM.LTR
      : LAYOUT_DIRECTION_ENUM.RTL;

  form = this.fb.group({
    rejectionNotes: [
      null as string | null,
      [Validators.required, notBlank, Validators.maxLength(500)],
    ],
  });

  get rejectionNotesControl() {
    return this.form.get('rejectionNotes') as FormControl;
  }

  close() {
    this.dialogRef.close();
  }

  confirm() {
    if (this.form.invalid) {
      markFormGroupTouched(this.form);
      return;
    }
    this.dialogRef.close(this.form.value.rejectionNotes?.trim());
  }
}
