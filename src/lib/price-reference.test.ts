import { describe, expect, it } from "vitest";
import { productWriteSchema } from "../server/schemas";
import {
  OTHER_EMPTY_MESSAGE,
  canonicalPriceReference,
  parsePriceReference,
  priceReferenceError,
  serializePriceReference,
} from "./price-reference";

describe("price-reference", () => {
  it("trata vazio como nenhuma caixa", () => {
    expect(parsePriceReference(null)).toEqual({ sources: [], otherOn: false, otherText: "" });
    expect(parsePriceReference("  ")).toEqual({ sources: [], otherOn: false, otherText: "" });
    expect(serializePriceReference({ sources: [], otherOn: false, otherText: "" })).toBe("");
    expect(canonicalPriceReference("")).toBeNull();
  });

  it("marca lojas no formato em linhas e volta igual", () => {
    const raw = "Mercado Livre\nShopee";
    const parsed = parsePriceReference(raw);
    expect(parsed).toEqual({ sources: ["Mercado Livre", "Shopee"], otherOn: false, otherText: "" });
    expect(serializePriceReference(parsed)).toBe(raw);
  });

  it("aceita vírgula só com lojas da lista", () => {
    expect(parsePriceReference("mercado livre, Amazon")).toEqual({
      sources: ["Mercado Livre", "Amazon"],
      otherOn: false,
      otherText: "",
    });
  });

  it("frase desconhecida vira Outros sem cortar o texto", () => {
    expect(parsePriceReference("loja do bairro")).toEqual({
      sources: [],
      otherOn: true,
      otherText: "loja do bairro",
    });
    expect(parsePriceReference("preço Mercado Livre, conferir")).toEqual({
      sources: [],
      otherOn: true,
      otherText: "preço Mercado Livre, conferir",
    });
  });

  it("Outros sem texto é erro", () => {
    const parsed = parsePriceReference("Outros:");
    expect(parsed).toEqual({ sources: [], otherOn: true, otherText: "" });
    expect(priceReferenceError(parsed)).toBe(OTHER_EMPTY_MESSAGE);
  });

  it("ida e volta com Outros e vírgula no nome", () => {
    const state = {
      sources: ["Magalu"] as const,
      otherOn: true,
      otherText: "Feira, centro",
    };
    const serialized = serializePriceReference({ ...state, sources: [...state.sources] });
    expect(serialized).toBe("Magalu\nOutros: Feira, centro");
    expect(parsePriceReference(serialized)).toEqual({
      sources: ["Magalu"],
      otherOn: true,
      otherText: "Feira, centro",
    });
  });

  it("normaliza caixa e ordem das lojas", () => {
    expect(canonicalPriceReference("shopee\nmercado livre")).toBe("Mercado Livre\nShopee");
  });

  it("schema recusa Outros sem nome", () => {
    const result = productWriteSchema.safeParse({ brazil_price_reference: "Outros:" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.brazil_price_reference).toContain(OTHER_EMPTY_MESSAGE);
  });
});
