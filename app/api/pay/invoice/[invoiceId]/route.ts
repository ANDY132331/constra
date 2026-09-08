export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const supabase = getAdmin();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      id, number, client_name, client_address,
      issue_date, due_date, status, items, tax_rate, notes,
      companies ( name, currency )
    `)
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  type DbItem = { description: string; qty: number; rate: number };
  const items = (invoice.items as DbItem[]) ?? [];
  const sub = items.reduce((s: number, i: DbItem) => s + i.qty * i.rate, 0);
  const total = sub * (1 + Number(invoice.tax_rate) / 100);
  const companiesRaw = invoice.companies as unknown;
  const company = (Array.isArray(companiesRaw) ? companiesRaw[0] : companiesRaw) as { name: string; currency: string } | null;

  // Return only client-safe fields — no internal IDs, no other invoices
  return NextResponse.json({
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.client_name,
    clientAddress: invoice.client_address,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    items,
    taxRate: Number(invoice.tax_rate),
    notes: invoice.notes ?? null,
    subtotal: sub,
    total,
    companyName: company?.name ?? "Your Contractor",
    currency: (company?.currency ?? "CAD") as string,
  });
}
