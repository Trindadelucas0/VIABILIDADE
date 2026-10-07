import { Decimal } from "../domain/money";
import { AppError } from "./errors";

export function parseMoney(value: string | null | undefined, field: string): Decimal | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new AppError(422, "VALIDATION", "Valor inválido.", {
      fields: { [field]: "Use um número maior ou igual a zero." },
    });
  }
  const amount = new Decimal(normalized);
  if (amount.gt("9999999999.9999")) {
    throw new AppError(422, "VALIDATION", "Valor grande demais.", {
      fields: { [field]: "O valor passa do limite." },
    });
  }
  return amount.toDecimalPlaces(4);
}

export function parsePercentRate(value: string | null | undefined, field: string, required: boolean): Decimal | null {
  if (value == null || value.trim() === "") {
    if (required) {
      throw new AppError(422, "VALIDATION", "Informe o percentual.", {
        fields: { [field]: "Informe um percentual entre 0 e 100." },
      });
    }
    return null;
  }
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new AppError(422, "VALIDATION", "Percentual inválido.", {
      fields: { [field]: "Use um número entre 0 e 100." },
    });
  }
  const percent = new Decimal(normalized);
  if (percent.lt(0) || percent.gt(100)) {
    throw new AppError(422, "VALIDATION", "Percentual fora da faixa.", {
      fields: { [field]: "Use um número entre 0 e 100." },
    });
  }
  return percent.div(100).toDecimalPlaces(6);
}

export function parseExchange(value: string | null | undefined): Decimal | null {
  if (value == null || value.trim() === "") return null;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new AppError(422, "VALIDATION", "Câmbio inválido.", {
      fields: { exchange_rate: "Informe quantos reais valem 1 dólar." },
    });
  }
  const amount = new Decimal(normalized);
  if (amount.lte(0) || amount.gt("999999")) {
    throw new AppError(422, "VALIDATION", "O câmbio precisa ser maior que zero.", {
      fields: { exchange_rate: "Informe quantos reais valem 1 dólar." },
    });
  }
  return amount.toDecimalPlaces(6);
}
