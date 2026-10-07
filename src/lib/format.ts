import Decimal from "decimal.js";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const usd = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });
const exchange = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function asNumber(value: string): number {
  return new Decimal(value).toNumber();
}

export function formatBrl(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return brl.format(asNumber(value));
}

export function formatUsd(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return usd.format(asNumber(value));
}

export function formatPlain(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return number.format(asNumber(value));
}

export function formatMargin(rate: string): string {
  return `${percent.format(new Decimal(rate).mul(100).toNumber())}%`;
}

export function formatWhen(iso: string): string {
  return dateTime.format(new Date(iso));
}
