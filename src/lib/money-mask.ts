import Decimal from "decimal.js";

export type MoneyDraft = {
  intDigits: string;
  /** null = sem vírgula; "" = vírgula sem centavos; até 2 dígitos. */
  frac: string | null;
};

export type MoneyRead = { status: "empty" } | { status: "invalid" } | { status: "amount"; api: string };

function stripMoneyDecor(value: string): string {
  return value.replace(/\s/g, "").replace(/^(?:US\$|R\$|USD|BRL)/i, "");
}

function trimInt(digits: string): string {
  const trimmed = digits.replace(/^0+(?=\d)/, "");
  return trimmed;
}

function formatInt(digits: string): string {
  const clean = trimInt(digits);
  if (clean === "") return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDraft(draft: MoneyDraft): string {
  const intShown = formatInt(draft.intDigits);
  if (draft.frac === null) return intShown;
  const intPart = intShown === "" ? "0" : intShown;
  return `${intPart},${draft.frac}`;
}

function parseDisplay(display: string): MoneyDraft {
  const cleaned = stripMoneyDecor(display);
  if (cleaned === "") return { intDigits: "", frac: null };
  if (!cleaned.includes(",")) {
    return { intDigits: trimInt(cleaned.replace(/\D/g, "")), frac: null };
  }
  const comma = cleaned.indexOf(",");
  const left = cleaned.slice(0, comma).replace(/\D/g, "");
  const right = cleaned.slice(comma + 1).replace(/\D/g, "").slice(0, 2);
  return { intDigits: trimInt(left), frac: right };
}

function appendChar(draft: MoneyDraft, ch: string): MoneyDraft {
  if (ch === "," || ch === ".") {
    if (draft.frac !== null) return draft;
    return { intDigits: draft.intDigits, frac: "" };
  }
  if (!/\d/.test(ch)) return draft;
  if (draft.frac === null) {
    return { intDigits: trimInt(draft.intDigits + ch), frac: null };
  }
  if (draft.frac.length >= 2) return draft;
  return { intDigits: draft.intDigits, frac: draft.frac + ch };
}

function backspace(draft: MoneyDraft): MoneyDraft {
  if (draft.frac !== null) {
    if (draft.frac.length === 0) return { intDigits: draft.intDigits, frac: null };
    return { intDigits: draft.intDigits, frac: draft.frac.slice(0, -1) };
  }
  return { intDigits: trimInt(draft.intDigits.slice(0, -1)), frac: null };
}

function draftFromRounded(canonical: string): MoneyDraft {
  const fixed = new Decimal(canonical).toDecimalPlaces(2).toFixed(2);
  const [intPart, frac] = fixed.split(".") as [string, string];
  return { intDigits: trimInt(intPart), frac };
}

function parseLoose(raw: string): MoneyDraft | null {
  const cleaned = stripMoneyDecor(raw);
  if (cleaned === "") return { intDigits: "", frac: null };
  if (/[^\d.,]/.test(cleaned)) return null;

  if (cleaned.includes(",")) {
    const comma = cleaned.indexOf(",");
    const left = cleaned.slice(0, comma);
    const right = cleaned.slice(comma + 1);
    if (right.includes(",") || /[^\d.]/.test(left) || /\D/.test(right)) return null;
    return {
      intDigits: trimInt(left.replace(/\./g, "")),
      frac: right.slice(0, 2),
    };
  }

  if (/^\d+\.\d{4}$/.test(cleaned)) return draftFromRounded(cleaned);
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return { intDigits: trimInt(cleaned.replace(/\./g, "")), frac: null };
  }
  if (/^\d{1,3}(\.\d{3})*\.\d{1,2}$/.test(cleaned)) {
    const last = cleaned.lastIndexOf(".");
    return {
      intDigits: trimInt(cleaned.slice(0, last).replace(/\./g, "")),
      frac: cleaned.slice(last + 1),
    };
  }
  if (/^\d{1,3}(\.\d{3})*\.$/.test(cleaned)) {
    return { intDigits: trimInt(cleaned.replace(/\./g, "")), frac: "" };
  }
  if (/^\d+$/.test(cleaned)) return { intDigits: trimInt(cleaned), frac: null };
  return null;
}

function draftToApi(draft: MoneyDraft): string {
  if (draft.intDigits === "" && (draft.frac == null || draft.frac === "")) return "";
  const intPart = draft.intDigits === "" ? "0" : draft.intDigits;
  let frac = draft.frac ?? "00";
  if (frac.length === 0) frac = "00";
  else if (frac.length === 1) frac = `${frac}0`;
  return `${intPart}.${frac}`;
}

/** Lê texto de preço. Número simples (`270.1250`) guarda até 4 casas. Milhar pt-BR e moeda viram 2 casas. */
export function readMoney(value: string): MoneyRead {
  const trimmed = value.trim();
  if (trimmed === "") return { status: "empty" };
  const compact = stripMoneyDecor(trimmed);
  if (compact === "") return { status: "empty" };

  if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    const digits = trimInt(compact.replace(/\./g, ""));
    if (digits === "") return { status: "empty" };
    return { status: "amount", api: `${digits}.00` };
  }

  if (/^\d+(\.\d+)?$/.test(compact)) {
    const amount = new Decimal(compact);
    if (!amount.isFinite() || amount.lt(0)) return { status: "invalid" };
    return { status: "amount", api: amount.toDecimalPlaces(4).toFixed(4) };
  }

  const loose = parseLoose(compact);
  if (loose == null) return { status: "invalid" };
  const api = draftToApi(loose);
  if (api === "") return { status: "empty" };
  return { status: "amount", api: new Decimal(api).toDecimalPlaces(2).toFixed(2) };
}

/** Valor canônico com 2 casas (`270.00`) ou vazio. Texto inválido vira vazio. */
export function moneyToApi(value: string): string {
  const read = readMoney(value);
  if (read.status !== "amount") return "";
  return new Decimal(read.api).toDecimalPlaces(2).toFixed(2);
}

/** Miolo pt-BR com 2 casas, sem o símbolo. `270.0000` vira `270,00`. */
export function formatMoneyCanonical(value: string): string {
  const api = moneyToApi(value);
  if (api === "") return "";
  const [intPart, frac] = api.split(".") as [string, string];
  return `${formatInt(intPart)},${frac}`;
}

/** Atualiza o miolo a cada tecla. O símbolo fica fora deste texto. */
export function applyMoneyEdit(previousDisplay: string, incoming: string): string {
  const prev = stripMoneyDecor(previousDisplay);
  const next = stripMoneyDecor(incoming);
  if (next === "") return "";
  if (next.length === prev.length + 1 && next.startsWith(prev)) {
    return formatDraft(appendChar(parseDisplay(prev), next[next.length - 1] ?? ""));
  }
  if (prev.length === next.length + 1 && prev.startsWith(next)) {
    return formatDraft(backspace(parseDisplay(prev)));
  }
  const loose = parseLoose(next);
  if (loose == null) return previousDisplay;
  return formatDraft(loose);
}
