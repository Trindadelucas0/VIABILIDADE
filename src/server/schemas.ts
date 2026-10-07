import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Texto longo demais.")
    .optional()
    .nullable();

export const supplierWriteSchema = z.object({
  number: optionalText(40),
  name: z.string().trim().min(1, "Informe o nome.").max(200, "Texto longo demais."),
  phone: optionalText(40),
  notes: optionalText(2000),
});

export const supplierPatchSchema = supplierWriteSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Nada para salvar.",
});

const supplierEmbedSchema = z.object({
  number: optionalText(40),
  name: optionalText(200),
  phone: optionalText(40),
  notes: optionalText(2000),
});

export const productWriteSchema = z.object({
  name: z.string().trim().max(200, "Texto longo demais.").optional(),
  code: optionalText(80),
  segment: optionalText(120),
  stand: optionalText(80),
  notes: optionalText(4000),
  fair_price_usd: optionalText(24),
  currency: z.string().trim().max(3).optional(),
  brazil_price_brl: optionalText(24),
  brazil_price_notes: optionalText(2000),
  brazil_price_reference: optionalText(200),
  supplier_id: z.string().uuid("Fornecedor inválido.").optional().nullable(),
  supplier: supplierEmbedSchema.optional().nullable(),
  archive: z.boolean().optional(),
});

export const idListSchema = z.object({
  ids: z.array(z.string().uuid("Identificador inválido.")).min(1, "Selecione um produto.").max(50, "Selecione no máximo 50."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail ou senha inválidos.").max(254),
  password: z.string().trim().min(1, "E-mail ou senha inválidos.").max(200),
});

const userRoleSchema = z.enum(["ADMIN", "OPERATOR"]);

export const createUserSchema = z.object({
  email: z.string().trim().email("E-mail inválido.").max(254),
  password: z.string().trim().min(8, "Senha deve ter pelo menos 8 caracteres.").max(200),
  role: userRoleSchema,
});

export const updateUserSchema = z
  .object({
    password: z.string().trim().min(8, "Senha deve ter pelo menos 8 caracteres.").max(200).optional(),
    role: userRoleSchema.optional(),
  })
  .refine((value) => value.password !== undefined || value.role !== undefined, {
    message: "Nada para salvar.",
  });

export const parametersSchema = z.object({
  exchange_rate: z.string().trim().min(1, "Informe o câmbio.").max(24),
  import_tax_percent: z.string().trim().max(12),
  nationalization_percent: z.string().trim().max(12),
  freight_percent: z.string().trim().max(12),
  sales_tax_percent: z.string().trim().min(1, "Informe o imposto sobre venda.").max(12),
  operational_cost_percent: z.string().trim().min(1, "Informe o custo operacional.").max(12),
});
