// What an invoice's status *means*, in one place.
//
// "overdue" is sometimes stored and sometimes only true by the calendar: an invoice marked
// "sent" whose due date has passed is overdue whether or not anyone pressed the button.
// The dashboard and invoice list knew that; Ask Constra, the morning brief, the invoice page
// and the PDF did not. Measured on the same data, the dashboard said $18,283.40 outstanding
// with 2 overdue while the AI was told $7,661.40 and 1 — it dropped every invoice already
// marked overdue from "outstanding", and counted an unsent draft as billed.

type Inv = { status: string; dueDate: Date | string };

/** Sent, unpaid, and past its due date — overdue in fact even if not on record. */
export function isPastDue(inv: Inv, now: Date = new Date()): boolean {
  return inv.status === "sent" && new Date(inv.dueDate).getTime() < now.getTime();
}

/** Overdue on record, or overdue by the calendar. */
export function isOverdue(inv: Inv, now: Date = new Date()): boolean {
  return inv.status === "overdue" || isPastDue(inv, now);
}

/** Money the client owes: everything sent and not yet paid, late or not. */
export function isOutstanding(inv: Inv): boolean {
  return inv.status === "sent" || inv.status === "overdue";
}

/** Actually issued to a client. A draft has not been billed to anyone. */
export function isBilled(inv: Inv): boolean {
  return inv.status !== "draft";
}

/** The status to show and act on. */
export function effectiveStatus(inv: Inv, now: Date = new Date()): string {
  return isPastDue(inv, now) ? "overdue" : inv.status;
}
