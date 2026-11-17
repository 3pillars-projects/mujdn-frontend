/** The card currently linked to a visit (`assignedCard` on visit rows, and the link response). */
export interface AssignedVisitCard {
  visitCardId: number;
  cardId: string;
  friendlyNumber: number;
}

/** The visit that currently holds a card. Times are `HH:mm:ss` strings, the date is `yyyy-MM-dd`. */
export interface VisitCardHolder {
  visitLogId: number;
  visitorName: string;
  visitDate: string;
  visitTimeFrom: string;
  visitTimeTo: string;
}

/** Result of looking a card up by its friendly number at the gate. */
export interface VisitCardLookup {
  visitCardId: number;
  cardId: string;
  friendlyNumber: number;
  currentAssignment: VisitCardHolder | null;
}

export interface VisitCardAvailability {
  cardIdTaken: boolean;
  friendlyNumberTaken: boolean;
}

export interface LinkVisitCardRequest {
  friendlyNumber: number;
  moveFromOtherVisit: boolean;
}
