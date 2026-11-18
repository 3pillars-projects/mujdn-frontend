import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { VisitCardInterceptor } from '@/model-interceptors/features/visit/visit-card.interceptor';
import { VisitCardService } from '@/services/features/visit/visit-card.service';
import { VisitCardValidators } from '@/validators/visit-card-validators';
import { Validators } from '@angular/forms';
import { InterceptModel } from 'cast-response';

const { send, receive } = new VisitCardInterceptor();

/** A physical DSS access card: long hexadecimal card ID plus the short friendly number typed at the gate. */
@InterceptModel({ send, receive })
export class VisitCard extends BaseCrudModel<VisitCard, VisitCardService> {
  override $$__service_name__$$: string = 'VisitCardService';
  declare id: number;
  declare cardId: string;
  declare friendlyNumber: number | null;
  /** Read-only: true while the card is linked to a visit (cannot be edited or deleted). */
  declare isInUse: boolean;

  buildForm() {
    const { cardId, friendlyNumber } = this;
    return {
      cardId: [
        cardId,
        [
          Validators.required,
          Validators.maxLength(VisitCardValidators.CARD_ID_MAX_LENGTH),
          VisitCardValidators.hexCardId(),
        ],
      ],
      friendlyNumber: [
        friendlyNumber,
        [Validators.required, VisitCardValidators.friendlyNumberRange()],
      ],
    };
  }
}
