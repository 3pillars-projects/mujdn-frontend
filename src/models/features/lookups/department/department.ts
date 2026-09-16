import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { DepartmentInterceptor } from '@/model-interceptors/features/lookups/department-interceptor';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { InterceptModel } from 'cast-response';
import { CustomValidators } from '@/validators/custom-validators';
import { Validators } from '@angular/forms';
import { BaseLookupModel } from '../base-lookup-model';
import { DepartmentManager } from '@/models/features/lookups/department/department-manager';

const { send, receive } = new DepartmentInterceptor();

@InterceptModel({ send, receive })
export class Department extends BaseCrudModel<Department, DepartmentService> {
  override $$__service_name__$$: string = 'DepartmentService';
  declare nameEn: string;
  declare nameAr: string;
  declare fkParentDepartmentId?: number | null;
  declare address?: string;
  declare phoneNumber?: string;
  declare fax?: string;
  declare fkRegionId?: number;
  declare region?: BaseLookupModel;
  declare fkCityId?: number;
  declare city?: BaseLookupModel;
  declare fkManagerId?: number | null;
  declare manager?: DepartmentManager;
  declare childDepartments?: Department[];
  declare isOneLevelApproval: boolean;

  buildForm() {
    const {
      nameAr,
      nameEn,
      fkRegionId,
      fkCityId,
      address,
      phoneNumber,
      fax,
      fkManagerId,
      fkParentDepartmentId,
      isOneLevelApproval,
    } = this;
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
      fkRegionId: [fkRegionId, [Validators.required]],
      fkCityId: [fkCityId, [Validators.required]],
      address: [
        address,
        [
          Validators.required,
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
          Validators.maxLength(CustomValidators.defaultLengths.ENGLISH_NAME_MAX),
          CustomValidators.pattern('ENG_AR_NUM_ONLY'),
        ],
      ],
      phoneNumber: [
        phoneNumber,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.PHONE_NUMBER_MAX),
          CustomValidators.pattern('PHONE_NUMBER'),
        ],
      ],
      fax: [
        fax,
        [
          Validators.maxLength(CustomValidators.defaultLengths.FAX_MAX),
          CustomValidators.pattern('FAX'),
        ],
      ],
      fkManagerId: [fkManagerId, []],
      fkParentDepartmentId: [fkParentDepartmentId, []],
      isOneLevelApproval: [isOneLevelApproval !== undefined ? isOneLevelApproval : true, []],
    };
  }
}
