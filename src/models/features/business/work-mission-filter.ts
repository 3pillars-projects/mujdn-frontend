import { WorkMissionTypesEnum } from '@/enums/work-mission-type-enum';
import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';

export default class WorkMissionFilter {
  declare nameEn?: string;
  declare nameAr?: string;
  declare startDate?: Date;
  declare endDate?: Date;
  declare workMissionType?: WorkMissionTypesEnum;
  declare missionStatus?: WorkMissionStatusEnum;
}
