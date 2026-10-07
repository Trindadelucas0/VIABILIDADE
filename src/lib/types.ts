export type Role = "ADMIN" | "OPERATOR";

export type User = {
  id: string;
  email: string;
  role: Role;
  display_name: string;
};

export type Classification = "RUIM" | "FRACO" | "MEDIO" | "BOM" | "EXCELENTE";

export type ProductStatus = "DRAFT" | "PENDING" | "READY_FOR_ANALYSIS" | "ANALYZED" | "ARCHIVED";

export type LatestAnalysis = {
  id: string;
  sequence: number;
  margin: string;
  classification: Classification;
  parameter_version: number;
  final_cost_brl: string | null;
  net_result_brl: string | null;
  market_price_brl: string | null;
};

export type ProductCard = {
  id: string;
  name: string;
  segment: string | null;
  stand: string | null;
  status: ProductStatus;
  currency: string;
  fair_price_usd: string | null;
  brazil_price_brl: string | null;
  supplier_name: string | null;
  cover_image_id: string | null;
  can_analyze: boolean;
  missing: string[];
  latest_analysis: LatestAnalysis | null;
  created_by: string;
};

export type Catalog = {
  products: ProductCard[];
  segments: string[];
  page: number;
  page_size: number;
  total: number;
};

export type Composition = {
  fair_price_usd: string;
  market_price_brl: string;
  exchange_rate: string;
  import_tax_rate: string;
  nationalization_rate: string;
  freight_rate: string;
  sales_tax_rate: string;
  operational_cost_rate: string;
  fob_brl: string;
  import_tax_brl: string;
  nationalization_brl: string;
  freight_other_brl: string;
  final_cost_brl: string;
  gross_result_brl: string;
  sales_tax_brl: string;
  operational_cost_brl: string;
  net_result_brl: string;
};

export type Analysis = {
  id: string;
  product_id: string;
  sequence: number;
  created_at: string;
  created_by: string;
  parameter_version: number;
  classification: Classification;
  margin: string;
  composition: Composition;
};

export type Supplier = {
  id: string;
  number: string | null;
  name: string;
  phone: string | null;
  notes: string | null;
  created_by: string;
};

export type ProductImage = {
  id: string;
  mime_type: string;
  sort_order: number;
  url: string;
};

export type ProductDetail = {
  id: string;
  name: string;
  code: string | null;
  segment: string | null;
  stand: string | null;
  notes: string | null;
  fair_price_usd: string | null;
  currency: string;
  brazil_price_brl: string | null;
  brazil_price_notes: string | null;
  brazil_price_reference: string | null;
  status: ProductStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  can_analyze: boolean;
  missing: string[];
  supplier: Omit<Supplier, "created_by"> | null;
  images: ProductImage[];
  analyses: Analysis[];
  latest_analysis: LatestAnalysis | null;
};

export type Parameters = {
  id: string;
  version: number;
  exchange_rate: string | null;
  import_tax_percent: string | null;
  nationalization_percent: string | null;
  freight_percent: string | null;
  sales_tax_percent: string | null;
  operational_cost_percent: string | null;
  updated_at: string;
};

export type DashboardData = {
  scope: "all" | "mine";
  counts: { products: number; pending: number; analyzed: number; excellent: number };
  opportunities: { id: string; name: string; margin: string; classification: Classification }[];
};

export type CompareItem =
  | { id: string; found: false }
  | {
      id: string;
      found: true;
      name: string;
      analysis: null | {
        id: string;
        final_cost_brl: string;
        market_price_brl: string;
        net_result_brl: string;
        margin: string;
        classification: Classification;
        parameter_version: number;
      };
    };

export type BatchResult = {
  analyzed: Analysis[];
  skipped: { id: string; reason: string }[];
};
