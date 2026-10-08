export const PRICE_SOURCES = ["Mercado Livre", "Shopee", "Amazon", "Magalu"] as const;

export type PriceSource = (typeof PRICE_SOURCES)[number];

export const OTHER_TEXT_MAX = 120;
export const OTHER_EMPTY_MESSAGE = "Informe a outra referência.";

export type PriceReferenceState = {
  sources: PriceSource[];
  otherOn: boolean;
  otherText: string;
};

const SOURCE_BY_NORM = new Map(PRICE_SOURCES.map((source) => [normalize(source), source]));

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function emptyState(): PriceReferenceState {
  return { sources: [], otherOn: false, otherText: "" };
}

function matchSource(value: string): PriceSource | undefined {
  return SOURCE_BY_NORM.get(normalize(value));
}

function parseOtherLine(line: string): string | undefined {
  const match = /^outros:\s*(.*)$/i.exec(line.trim());
  if (!match) return undefined;
  return match[1].trim();
}

function uniqueSources(found: PriceSource[]): PriceSource[] {
  return PRICE_SOURCES.filter((source) => found.includes(source));
}

function tryParseCanonicalLines(raw: string): PriceReferenceState | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return emptyState();

  const found: PriceSource[] = [];
  let otherOn = false;
  let otherText = "";

  for (const line of lines) {
    const source = matchSource(line);
    if (source) {
      found.push(source);
      continue;
    }
    const other = parseOtherLine(line);
    if (other !== undefined) {
      otherOn = true;
      otherText = other;
      continue;
    }
    return null;
  }

  return { sources: uniqueSources(found), otherOn, otherText };
}

function tryParseCommaStores(raw: string): PriceReferenceState | null {
  if (!raw.includes(",")) return null;
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) return null;
  const found: PriceSource[] = [];
  for (const part of parts) {
    const source = matchSource(part);
    if (!source) return null;
    found.push(source);
  }
  return { sources: uniqueSources(found), otherOn: false, otherText: "" };
}

export function parsePriceReference(raw: string | null | undefined): PriceReferenceState {
  if (raw == null) return emptyState();
  const trimmed = raw.trim();
  if (!trimmed) return emptyState();

  const fromLines = tryParseCanonicalLines(trimmed);
  if (fromLines) return fromLines;

  const fromComma = tryParseCommaStores(trimmed);
  if (fromComma) return fromComma;

  const single = matchSource(trimmed);
  if (single) return { sources: [single], otherOn: false, otherText: "" };

  return { sources: [], otherOn: true, otherText: trimmed };
}

export function serializePriceReference(state: PriceReferenceState): string {
  const lines: string[] = uniqueSources(state.sources);
  if (state.otherOn) {
    const other = state.otherText.trim().slice(0, OTHER_TEXT_MAX);
    lines.push(other ? `Outros: ${other}` : "Outros:");
  }
  return lines.join("\n");
}

export function priceReferenceError(state: PriceReferenceState): string | undefined {
  if (state.otherOn && !state.otherText.trim()) return OTHER_EMPTY_MESSAGE;
  if (state.otherText.trim().length > OTHER_TEXT_MAX) return "Texto longo demais.";
  return undefined;
}

export function canonicalPriceReference(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  if (raw.trim() === "") return null;
  const parsed = parsePriceReference(raw);
  return serializePriceReference(parsed) || null;
}
