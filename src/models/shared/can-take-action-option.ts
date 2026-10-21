import { BooleanOption } from '@/enums/boolean-option-enum';
import { BooleanOptionModel } from './boolean-option';

// "Can take action" filter options for incoming permission requests
export const CAN_TAKE_ACTION_OPTIONS: BooleanOptionModel[] = [
  {
    id: true,
    nameEn: 'Awaiting my action',
    nameAr: 'بانتظار إجرائي',
    value: BooleanOption.YES,
  },
  {
    id: false,
    nameEn: 'Not awaiting my action',
    nameAr: 'لا تنتظر إجرائي',
    value: BooleanOption.NO,
  },
];
