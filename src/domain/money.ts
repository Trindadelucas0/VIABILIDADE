import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function toDecimal(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export function money(value: Decimal): string {
  return value.toDecimalPlaces(4).toFixed(4);
}

export function rate(value: Decimal): string {
  return value.toDecimalPlaces(6).toFixed(6);
}

export function isPresentRate(value: Decimal | null | undefined): value is Decimal {
  return value instanceof Decimal && value.isFinite();
}
