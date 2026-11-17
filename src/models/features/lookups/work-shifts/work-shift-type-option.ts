import { WorkShiftType } from '@/enums/work-shift-type';

export interface WorkShiftTypeOption {
  id: number;
  nameEn: string;
  nameAr: string;
  value: WorkShiftType;
}

export const WORK_SHIFT_TYPE_OPTIONS: WorkShiftTypeOption[] = [
  {
    id: 1,
    nameEn: 'Standard Shift',
    nameAr: 'وردية بنظام ساعات العمل المعتمدة',
    value: WorkShiftType.Standard,
  },
  {
    id: 2,
    nameEn: 'Work / Rest Cycle Shift',
    nameAr: 'وردية بنظام فترات العمل والراحة',
    value: WorkShiftType.WeekOnWeekOff,
  },
  {
    id: 3,
    nameEn: '24-Hour Rest Shift',
    nameAr: 'وردية بنظام الراحات 24 س',
    value: WorkShiftType.WeekOnWeekOff24,
  },
  {
    id: 4,
    nameEn: 'Rotating Shift',
    nameAr: 'وردية متناوبة',
    value: WorkShiftType.Rotating,
  },
];
