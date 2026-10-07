import { describe, expect, it } from "vitest";
import { analyze, AnalysisRejected } from "./analysis-service";
import { canAnalyze } from "./can-analyze";
import { classify } from "./classification";
import { Decimal } from "./money";

const official = {
  fairPriceUsd: new Decimal(10),
  brazilPriceBrl: new Decimal(100),
  parameters: {
    exchangeRate: new Decimal(5),
    importTaxRate: new Decimal("0.10"),
    nationalizationRate: new Decimal("0.10"),
    freightRate: new Decimal("0.10"),
    salesTaxRate: new Decimal("0.08"),
    operationalCostRate: new Decimal("0.05"),
    parameterVersion: 1,
  },
  completeness: {
    name: "Fechadura",
    fairPriceUsd: new Decimal(10),
    currency: "USD",
    brazilPriceBrl: new Decimal(100),
    supplierName: "Stand Norte",
    exchangeRate: new Decimal(5),
    importTaxRate: new Decimal("0.10"),
    nationalizationRate: new Decimal("0.10"),
    freightRate: new Decimal("0.10"),
  },
};

describe("analyze", () => {
  it("câmbio 5, USD 10, alíquotas 10%, Brasil 100, venda 8%, operacional 5% → margem 22% e BOM", () => {
    const result = analyze(official);
    expect(result.margin).toBe("0.220000");
    expect(result.classification).toBe("BOM");
    expect(result.parameterVersion).toBe(1);
    expect(result.composition.fobBrl).toBe("50.0000");
    expect(result.composition.importTaxBrl).toBe("5.0000");
    expect(result.composition.nationalizationBrl).toBe("5.0000");
    expect(result.composition.freightOtherBrl).toBe("5.0000");
    expect(result.composition.finalCostBrl).toBe("65.0000");
    expect(result.composition.grossResultBrl).toBe("35.0000");
    expect(result.composition.salesTaxBrl).toBe("8.0000");
    expect(result.composition.operationalCostBrl).toBe("5.0000");
    expect(result.composition.netResultBrl).toBe("22.0000");
  });

  it("alíquota de custo zero é válida e entra na conta", () => {
    const result = analyze({
      ...official,
      parameters: {
        ...official.parameters,
        importTaxRate: new Decimal(0),
        nationalizationRate: new Decimal(0),
        freightRate: new Decimal(0),
      },
      completeness: {
        ...official.completeness,
        importTaxRate: new Decimal(0),
        nationalizationRate: new Decimal(0),
        freightRate: new Decimal(0),
      },
    });
    expect(result.composition.finalCostBrl).toBe("50.0000");
    expect(result.classification).toBe("EXCELENTE");
  });

  it("preço Brasil 0 não analisa", () => {
    expect(() =>
      analyze({
        ...official,
        brazilPriceBrl: new Decimal(0),
        completeness: { ...official.completeness, brazilPriceBrl: new Decimal(0) },
      }),
    ).toThrow(AnalysisRejected);
  });
});

describe("classify", () => {
  it("fronteiras: 10% RUIM, 15% MÉDIO, 20% BOM, 25% EXCELENTE", () => {
    expect(classify(new Decimal("0.10"))).toBe("RUIM");
    expect(classify(new Decimal("0.1000001"))).toBe("FRACO");
    expect(classify(new Decimal("0.149999"))).toBe("FRACO");
    expect(classify(new Decimal("0.15"))).toBe("MEDIO");
    expect(classify(new Decimal("0.199999"))).toBe("MEDIO");
    expect(classify(new Decimal("0.20"))).toBe("BOM");
    expect(classify(new Decimal("0.249999"))).toBe("BOM");
    expect(classify(new Decimal("0.25"))).toBe("EXCELENTE");
    expect(classify(new Decimal("-0.01"))).toBe("RUIM");
  });
});

describe("canAnalyze", () => {
  it("lista câmbio ausente e preço Brasil zero", () => {
    const result = canAnalyze({
      ...official.completeness,
      brazilPriceBrl: new Decimal(0),
      exchangeRate: null,
      importTaxRate: null,
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("Preço no Brasil");
    expect(result.missing).toContain("Câmbio nos parâmetros");
    expect(result.missing).toContain("Alíquota de importação");
  });
});
