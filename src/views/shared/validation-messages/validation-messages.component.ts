import { Component, inject, input, OnInit } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime, map, Observable, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { ValidationErrorKeyEnum } from '@/enums/validation-error-key-enum';

@Component({
  selector: 'app-validation-messages',
  imports: [TranslatePipe, AsyncPipe],
  templateUrl: './validation-messages.component.html',
  styleUrls: ['./validation-messages.component.scss'],
})
export class ValidationMessagesComponent implements OnInit {
  control = input.required<AbstractControl>();
  activeErrors$!: Observable<{ key: string; value: any }[]>;
  errorKey = ValidationErrorKeyEnum;
  translateService = inject(TranslateService);
  ngOnInit(): void {
    const ctrl = this.control();

    this.activeErrors$ = ctrl.statusChanges.pipe(
      startWith(null), // trigger immediately
      debounceTime(100),
      map(() => {
        const errors = ctrl.errors || {};
        return Object.entries(errors).map(([key, value]) => ({ key, value }));
      })
    );
  }

  getMessage(key: string): string | null {
    const message = this.validationMessages[key as ValidationErrorKeyEnum];

    if (!message) return null;
    const translatedMessage = this.translateService.instant(message);
    // Handle dynamic messages with parameters
    const error = this.control().errors?.[key];

    if (error && typeof error === 'object') {
      return this.formatMessage(translatedMessage, error);
    }

    return message;
  }

  private formatMessage(message: string, errorData: any): string {
    // Handle maxlength and minlength with dynamic values
    if (errorData.requiredLength !== undefined) {
      return message.replace('{length}', errorData.requiredLength.toString());
    }

    // min only
    if (errorData.min !== undefined && errorData.actual !== undefined) {
      return message
        .replace('{min}', this.unwrap(errorData.min, 'min').toString())
        .replace('{actual}', errorData.actual.toString());
    }

    // max only
    if (errorData.max !== undefined && errorData.actual !== undefined) {
      return message
        .replace('{max}', this.unwrap(errorData.max, 'max').toString())
        .replace('{actual}', errorData.actual.toString());
    }
    return message;
  }
  unwrap = (val: any, key: string) => {
    if (typeof val === 'object' && val !== null && key in val) {
      return val[key]; // return the nested numeric value
    }
    return val; // already a number
  };

  validationMessages: Record<ValidationErrorKeyEnum, string> = {
    [ValidationErrorKeyEnum.REQUIRED]: 'COMMON.REQUIRED_FIELD',
    [ValidationErrorKeyEnum.AR_NUM]: 'COMMON.ARABIC_ONLY',
    [ValidationErrorKeyEnum.ENG_NUM]: 'COMMON.ENGLISH_ONLY',
    [ValidationErrorKeyEnum.MIN_LENGTH]: 'COMMON.MIN_LENGTH',
    [ValidationErrorKeyEnum.MAX_LENGTH]: 'COMMON.MAX_LENGTH_DYNAMIC',
    [ValidationErrorKeyEnum.MIN]: 'COMMON.MIN_VALUE',
    [ValidationErrorKeyEnum.MAX]: 'COMMON.MAX_VALUE',
    [ValidationErrorKeyEnum.PAST_DATE]: 'COMMON.DATE_CANNOT_BE_IN_PAST',
    [ValidationErrorKeyEnum.START_AFTER_END]: 'COMMON.START_BEFORE_END',
    [ValidationErrorKeyEnum.TIME_FROM_AFTER_TIME_TO]: 'COMMON.TIME_FROM_BEFORE_TIME_TO',
    [ValidationErrorKeyEnum.TIME_RANGE_SHOULD_CROSS_DAY]: 'COMMON.TIME_RANGE_SHOULD_CROSS_DAY',
    [ValidationErrorKeyEnum.TIME_FROM_AND_TO_ARE_EQUAL]: 'COMMON.TIME_FROM_AND_TO_ARE_EQUAL',
    [ValidationErrorKeyEnum.EMAIL]: 'COMMON.EMAIL_VALIDATION',
    [ValidationErrorKeyEnum.STRONG_PASSWORD]: 'COMMON.STRONG_PASSWORD',
    [ValidationErrorKeyEnum.NATIONAL_ID]: 'COMMON.NATIONAL_ID_VALIDATION',
    [ValidationErrorKeyEnum.PHONE_NUMBER]: 'COMMON.PHONE_NUMBER_VALIDATION',
    [ValidationErrorKeyEnum.FAX]: 'COMMON.FAX_VALIDATION',
    [ValidationErrorKeyEnum.POSITIVE_NUMBER]: 'COMMON.POSITIVE_NUMBER_ONLY',
    [ValidationErrorKeyEnum.INTEGER_NUMBER]: 'COMMON.INTEGER_NUMBER_ONLY',
    [ValidationErrorKeyEnum.INVALID_NUMBER]: 'COMMON.INVALID_NUMBER',
    [ValidationErrorKeyEnum.NUMBER_RANGE]: 'COMMON.NUMBER_RANGE',
    [ValidationErrorKeyEnum.PASSWORD_MISMATCH]: 'USER_PROFILE.PASSWORD_MISMATCH',
    [ValidationErrorKeyEnum.DATE_MAX_RANGE_EXCEEDED]:
      'ATTENDANCE_REPORT_PROCESSING_PAGE.DATE_MAX_RANGE_EXCEEDED',
    [ValidationErrorKeyEnum.DUPLICATE_SHIFT]: 'USER_WORK_SHIFT_ASSIGNMENT.DUPLICATE_SHIFT',
    [ValidationErrorKeyEnum.SHIFTING_PERIOD_MAX_ONE_YEAR]:
      'USER_WORK_SHIFT_ASSIGNMENT.SHIFTING_PERIOD_MAX_ONE_YEAR',
    [ValidationErrorKeyEnum.SHIFT_CYCLE_DAYS_RANGE]:
      'USER_WORK_SHIFT_ASSIGNMENT.SHIFT_PERIOD_DURATION_RANGE',
    [ValidationErrorKeyEnum.INVALID_SHIFT_CONFIGURATION]: 'COMMON.INVALID_SHIFT_CONFIGURATION',
    [ValidationErrorKeyEnum.GRACE_MONTHLY_LESS_THAN_DAILY]:
      'NOTIFICATION.MONTHLY_GRACE_MUST_COVER_DAILY',
    [ValidationErrorKeyEnum.HEX_CARD_ID]: 'VISIT_CARDS_PAGE.CARD_ID_HEX_ONLY',
    [ValidationErrorKeyEnum.CARD_ID_TAKEN]: 'VISIT_CARDS_PAGE.CARD_ID_TAKEN',
    [ValidationErrorKeyEnum.FRIENDLY_NUMBER_TAKEN]: 'VISIT_CARDS_PAGE.FRIENDLY_NUMBER_TAKEN',
    [ValidationErrorKeyEnum.CARD_NOT_FOUND]: 'VISIT_REQUEST_PAGE.CARD_NOT_FOUND',
  };
}
