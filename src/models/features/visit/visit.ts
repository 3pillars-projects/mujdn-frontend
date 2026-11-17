import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { Validators } from '@angular/forms';
import { InterceptModel } from 'cast-response';
import { VisitInterceptor } from '@/model-interceptors/features/visit/visit.interceptor';
import { VisitService } from '@/services/features/visit/visit.service';
import { BaseLookupModel } from '../lookups/base-lookup-model';
import { CustomValidators } from '@/validators/custom-validators';
import { timeStringToDate } from '@/utils/general-helper';
import { VisitCreatorModel } from './visit-creator';
import { AssignedVisitCard } from './visit-card-assignment';

const { send, receive } = new VisitInterceptor();

@InterceptModel({ send, receive })
export class Visit extends BaseCrudModel<Visit, VisitService> {
  override $$__service_name__$$: string = 'VisitService';
  declare id: number;
  declare nationalId: string;
  declare nationalIdExpiryDate: Date | string | null;
  declare fullName: string;
  declare fkNationalityId: number;
  declare visitorOrganization: string;
  declare fkTargetDepartmentId: number;
  declare targetDepartment: BaseLookupModel;
  declare phoneNumber: string;
  declare address: string;
  declare email: string;
  declare visitDate: Date | string | null;
  declare visitTimeFrom?: Date | string | null;
  declare visitTimeTo?: Date | string | null;
  declare visitPurpose: string;
  declare visitStatus: number;
  declare isEditable: boolean;
  declare creationUser: VisitCreatorModel;
  declare qRcode: string;
  declare arrivalTime: string | null;
  declare leaveTime: string | null;
  accessLocationIds: number[] = []; // selected IDs (for saving)
  declare accessLocations: BaseLookupModel[];
  declare nationalityNameAr?: string;
  declare nationalityNameEn?: string;
  declare attendanceStatus: number;
  /** Read-only: the access card currently linked to this visit, if any. */
  declare assignedCard: AssignedVisitCard | null;

  constructor() {
    super();
  }

  buildForm() {
    const {
      nationalId,
      nationalIdExpiryDate,
      fullName,
      fkNationalityId,
      visitorOrganization,
      fkTargetDepartmentId,
      phoneNumber,
      address,
      email,
      visitDate,
      visitTimeFrom,
      visitTimeTo,
      visitPurpose,
      accessLocationIds,
    } = this;
    return {
      nationalId: [nationalId, [Validators.required, CustomValidators.pattern('NATIONAL_ID')]],
      nationalIdExpiryDate: [nationalIdExpiryDate, [Validators.required]],
      fullName: [
        fullName,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.ARABIC_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
        ],
      ],
      fkNationalityId: [fkNationalityId, [Validators.required]],
      visitorOrganization: [visitorOrganization, [Validators.required]],
      fkTargetDepartmentId: [fkTargetDepartmentId, [Validators.required]],
      phoneNumber: [
        phoneNumber,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.PHONE_NUMBER_MAX),
          Validators.minLength(CustomValidators.defaultLengths.PHONE_NUMBER_MAX),
          CustomValidators.pattern('PHONE_NUMBER'),
        ],
      ],
      address: [address, []],
      email: [
        email,
        [
          CustomValidators.pattern('EMAIL'),
          Validators.maxLength(CustomValidators.defaultLengths.EMAIL_MAX),
        ],
      ],
      visitDate: [visitDate, [Validators.required]],
      visitTimeFrom: [
        visitTimeFrom ? timeStringToDate(visitTimeFrom.toString()) : null,
        [Validators.required],
      ],
      visitTimeTo: [
        visitTimeTo ? timeStringToDate(visitTimeTo.toString()) : null,
        [Validators.required],
      ],
      visitPurpose: [
        visitPurpose,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.NOTES),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
        ],
      ],
      accessLocationIds: [accessLocationIds ?? [], [Validators.required]],
    };
  }
}
