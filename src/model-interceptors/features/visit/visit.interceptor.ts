import { VisitStatusEnum } from '@/enums/visit-status-enum';
import { Visit } from '@/models/features/visit/visit';
import {
  convertUtcToSystemTimeZone,
  dateToTimeString,
  didVisitTimePassed,
  timeStringToDate,
  toDateOnly,
  toDateTime,
} from '@/utils/general-helper';
import { ModelInterceptorContract } from 'cast-response';

export class VisitInterceptor implements ModelInterceptorContract<Visit> {
  receive(model: Visit): Visit {
    model.visitDate = toDateTime(model.visitDate);
    model.nationalIdExpiryDate = toDateTime(model.nationalIdExpiryDate);
    model.arrivalTime = model.arrivalTime
      ? dateToTimeString(convertUtcToSystemTimeZone(timeStringToDate(model.arrivalTime || '')))
      : null;
    model.leaveTime = model.leaveTime
      ? dateToTimeString(convertUtcToSystemTimeZone(timeStringToDate(model.leaveTime || '')))
      : null;
    if (model.visitStatus === VisitStatusEnum.NEW && didVisitTimePassed(model)) {
      model.visitStatus = VisitStatusEnum.EXPIRED;
    }
    return model;
  }

  send(model: Partial<Visit>): Partial<Visit> {
    model.visitDate = toDateOnly(model.visitDate);
    model.nationalIdExpiryDate = toDateOnly(model.nationalIdExpiryDate);
    model.visitTimeFrom = model.visitTimeFrom
      ? dateToTimeString(new Date(model.visitTimeFrom))
      : null;
    model.visitTimeTo = model.visitTimeTo ? dateToTimeString(new Date(model.visitTimeTo)) : null;
    // deleting unnecessary models
    delete model.targetDepartment;
    delete model.creationUser;
    delete model.nationalityNameAr;
    delete model.nationalityNameEn;
    delete model.assignedCard;
    return model;
  }
}
