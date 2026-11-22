import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { WorkShiftType } from '@/enums/work-shift-type';
import { UserWorkShiftInterceptor } from '@/model-interceptors/features/lookups/user-work-shift.interceptor';
import { SingleResponseData } from '@/models/shared/response/single-response-data';
import { UserWorkShiftService } from '@/services/features/lookups/user-workshift.service';
import { CustomValidators } from '@/validators/custom-validators';
import { Validators } from '@angular/forms';
import { InterceptModel } from 'cast-response';
import { map, Observable } from 'rxjs';
import { RotationGroup } from '@/models/features/lookups/work-shifts/rotation-group';
import { ShiftDetails } from '@/models/features/lookups/work-shifts/shift-details';

const { send, receive } = new UserWorkShiftInterceptor();

@InterceptModel({ send, receive })
export default class UserWorkShift extends BaseCrudModel<UserWorkShift, UserWorkShiftService> {
  override $$__service_name__$$: string = 'UserWorkShiftService';

  declare id: number;
  declare shiftNameAr: string;
  declare shiftNameEn: string;
  // declare employeeNameAr: string;
  // declare employeeNameEn: string;
  declare startDate: Date | string;
  declare endDate: Date | string;
  declare fkShiftId: number;
  declare fkAssignedUserId: number;
  declare employeeWorkingDays: string;
  declare assignedUserIds: number[];
  workShiftType: WorkShiftType = WorkShiftType.Standard;
  declare presenceInquiryTime: string;
  declare presenceInquiryBuffer: number;
  rotationGroups: RotationGroup[] = [];
  declare shiftDetails: ShiftDetails;
  declare shiftPeriodCount: number;
  declare legacyDaysCount: number;

  declare concurrencyUpdateVersion?: Uint8Array;

  constructor(init?: Partial<UserWorkShift>) {
    super();
    Object.assign(this, init);
  }

  buildForm() {
    const {
      fkShiftId,
      fkAssignedUserId,
      startDate,
      endDate,
      employeeWorkingDays,
      workShiftType,
      presenceInquiryTime,
      presenceInquiryBuffer,
      legacyDaysCount,
    } = this;
    return {
      fkShiftId: [fkShiftId, [Validators.required]],
      fkAssignedUserId: [fkAssignedUserId, []], // Made optional here as we might use assignedUserIds
      startDate: [startDate, [Validators.required]],
      endDate: [endDate, [Validators.required]],
      employeeWorkingDays: [employeeWorkingDays || ''],
      workShiftType: [workShiftType || WorkShiftType.Standard, [Validators.required]],
      presenceInquiryTime: [presenceInquiryTime, []],
      presenceInquiryBuffer: [presenceInquiryBuffer, []],
      legacyDaysCount: [
        legacyDaysCount ?? null,
        [CustomValidators.shiftCycleDaysRange(1, 30), CustomValidators.digitsOnly()],
      ],
    };
  }
}
