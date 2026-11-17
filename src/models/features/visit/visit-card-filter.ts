export class VisitCardFilter {
  /** Partial match on the hexadecimal card ID. */
  declare cardId?: string;
  /** Exact match on the friendly number. */
  declare friendlyNumber?: number | null;
}
