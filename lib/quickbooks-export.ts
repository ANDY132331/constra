// Invoices as a CSV for QuickBooks Online: Settings > Import data > Invoices.
// Column names are matched on QuickBooks' mapping screen, which also matches the tax codes.
// https://quickbooks.intuit.com/learn-support/en-ca/help-article/import-export-files/import-multiple-invoices/L7E9Xrd8l_CA_en_CA

import type { Invoice } from "./mock-data";
import { escapeCsv } from "./payroll-export";
import { lineAmount, moneyTotals, roundMoney } from "./money";
import { toLocalDateString } from "./utils";
import { saveFile } from "./native";

// QuickBooks' limit for one import
const MAX_INVOICES = 100;

const HEADER = ["InvoiceNo", "Customer", "InvoiceDate", "DueDate", "Memo", "ItemDescription", "ItemQuantity", "ItemRate", "ItemAmount", "ItemTaxCode", "ItemTaxAmount"];

export function invoicesToCsv(invoices: Invoice[]): string {
  const lines = [HEADER.join(",")];
  for (const inv of invoices) {
    const items = inv.items.filter((i) => i.description || i.qty || i.rate);
    const { tax } = moneyTotals(items, inv.taxRate);
    let taxLeft = tax;
    items.forEach((item, i) => {
      const amount = lineAmount(item.qty, item.rate);
      // Tax is worked out on the whole invoice, so the last line takes any rounding cent
      // and QuickBooks' total matches the invoice the client received.
      const lineTax = i === items.length - 1 ? taxLeft : roundMoney((amount * inv.taxRate) / 100);
      taxLeft = roundMoney(taxLeft - lineTax);
      lines.push([
        inv.number,
        inv.clientName,
        // Year first on purpose: a day/month mix-up here would silently misdate invoices
        toLocalDateString(new Date(inv.issueDate)),
        toLocalDateString(new Date(inv.dueDate)),
        inv.notes ?? "",
        item.description,
        Number(item.qty) || 0,
        Number(item.rate) || 0,
        amount.toFixed(2),
        inv.taxRate > 0 ? `${inv.taxRate}%` : "Out of scope",
        lineTax.toFixed(2),
      ].map(escapeCsv).join(","));
    });
  }
  return lines.join("\n");
}

/** Saves the file and says what happened. Drafts stay out: they haven't been billed yet. */
export async function exportInvoicesForQuickBooks(invoices: Invoice[]): Promise<{ exported: number; left: number }> {
  const billed = invoices
    .filter((i) => i.status !== "draft" && i.items.length > 0)
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  const batch = billed.slice(0, MAX_INVOICES);
  if (batch.length > 0) {
    const blob = new Blob(["﻿" + invoicesToCsv(batch)], { type: "text/csv;charset=utf-8" });
    await saveFile(blob, `constra-invoices-quickbooks-${toLocalDateString(new Date())}.csv`);
  }
  return { exported: batch.length, left: billed.length - batch.length };
}
