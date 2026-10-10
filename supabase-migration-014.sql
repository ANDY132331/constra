-- Migration 014: Add last_reminded_at to invoices for reminder throttling
--
-- Without this column the invoice-reminders cron sends a payment reminder for every
-- overdue invoice on every run. With it, reminders are capped to once per 7 days.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;
