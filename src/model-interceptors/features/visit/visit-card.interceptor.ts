import { VisitCard } from '@/models/features/visit/visit-card';
import { VisitCardValidators } from '@/validators/visit-card-validators';
import { ModelInterceptorContract } from 'cast-response';

export class VisitCardInterceptor implements ModelInterceptorContract<VisitCard> {
  receive(model: VisitCard): VisitCard {
    return model;
  }

  send(model: Partial<VisitCard>): Partial<VisitCard> {
    model.cardId = VisitCardValidators.normalizeCardId(model.cardId);
    model.friendlyNumber = model.friendlyNumber == null ? null : Number(model.friendlyNumber);
    // read-only, computed by the server
    delete model.isInUse;
    return model;
  }
}
