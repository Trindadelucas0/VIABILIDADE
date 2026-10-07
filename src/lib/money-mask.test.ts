import { describe, expect, it } from "vitest";
import { AppError } from "../server/errors";
import { parseMoney } from "../server/money-input";
import { applyMoneyEdit, formatMoneyCanonical, moneyToApi } from "./money-mask";

function type(keys: string): string {
  let display = "";
  for (const key of keys) {
    display = applyMoneyEdit(display, display + key);
  }
  return display;
}

describe("money-mask", () => {
  it("trata 270 como reais e completa duas casas", () => {
    expect(type("270")).toBe("270");
    expect(moneyToApi("270")).toBe("270.00");
    expect(moneyToApi("270,50")).toBe("270.50");
    expect(moneyToApi("270.0000")).toBe("270.00");
    expect(moneyToApi("1.270,00")).toBe("1270.00");
    expect(moneyToApi("270.000")).toBe("270000.00");
    expect(formatMoneyCanonical("270.0000")).toBe("270,00");
  });

  it("atualiza milhar e centavos enquanto digita", () => {
    expect(type("2700")).toBe("2.700");
    expect(type("270,5")).toBe("270,5");
    expect(type("270.5")).toBe("270,5");
    expect(applyMoneyEdit("2.700", "2.70")).toBe("270");
    expect(applyMoneyEdit("270", "270a")).toBe("270");
    expect(moneyToApi("R$ 270,00")).toBe("270.00");
    expect(moneyToApi("US$ 1.270,50")).toBe("1270.50");
  });

  it("parseMoney aceita moeda e mantém 270.0000 como 270", () => {
    expect(parseMoney("R$ 270,00", "brazil_price_brl")?.eq(270)).toBe(true);
    expect(parseMoney("270.0000", "fair_price_usd")?.toFixed(4)).toBe("270.0000");
    expect(parseMoney("270.1250", "fair_price_usd")?.toFixed(4)).toBe("270.1250");
    expect(parseMoney("1.270,00", "brazil_price_brl")?.eq(1270)).toBe(true);
    expect(() => parseMoney("abc", "fair_price_usd")).toThrow(AppError);
  });
});
