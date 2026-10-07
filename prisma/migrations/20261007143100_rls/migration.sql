-- Isolamento por dono. A sessão da aplicação define app.user_id e app.role
-- dentro da transação (set_config ..., true). Superuser ignora RLS;
-- a conexão de runtime não deve ser superuser nem ter BYPASSRLS.
-- users e sessions ficam sem RLS: o login ainda não tem papel definido.

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" FORCE ROW LEVEL SECURITY;
ALTER TABLE "analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analyses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "analysis_parameter_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analysis_parameter_snapshots" FORCE ROW LEVEL SECURITY;
ALTER TABLE "financial_parameters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_parameters" FORCE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select" ON "suppliers"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
    OR EXISTS (
      SELECT 1 FROM "products" p
      WHERE p."supplier_id" = "suppliers"."id"
        AND p."created_by"::text = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "suppliers_insert" ON "suppliers"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
  );

CREATE POLICY "suppliers_update" ON "suppliers"
  FOR UPDATE
  USING (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
  );

CREATE POLICY "suppliers_delete" ON "suppliers"
  FOR DELETE
  USING (current_setting('app.role', true) = 'ADMIN');

CREATE POLICY "products_select" ON "products"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
  );

CREATE POLICY "products_insert" ON "products"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
  );

CREATE POLICY "products_update" ON "products"
  FOR UPDATE
  USING (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'ADMIN'
    OR "created_by"::text = current_setting('app.user_id', true)
  );

CREATE POLICY "products_delete" ON "products"
  FOR DELETE
  USING (current_setting('app.role', true) = 'ADMIN');

CREATE POLICY "product_images_all" ON "product_images"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM "products" p
      WHERE p."id" = "product_images"."product_id"
        AND p."created_by"::text = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM "products" p
      WHERE p."id" = "product_images"."product_id"
        AND p."created_by"::text = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "analyses_select" ON "analyses"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM "products" p
      WHERE p."id" = "analyses"."product_id"
        AND p."created_by"::text = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "analyses_insert" ON "analyses"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM "products" p
      WHERE p."id" = "analyses"."product_id"
        AND p."created_by"::text = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "analyses_delete" ON "analyses"
  FOR DELETE
  USING (current_setting('app.role', true) = 'ADMIN');

CREATE POLICY "snapshots_select" ON "analysis_parameter_snapshots"
  FOR SELECT
  USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) <> '');

CREATE POLICY "snapshots_insert" ON "analysis_parameter_snapshots"
  FOR INSERT
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) <> '');

CREATE POLICY "snapshots_delete" ON "analysis_parameter_snapshots"
  FOR DELETE
  USING (current_setting('app.role', true) = 'ADMIN');

CREATE POLICY "parameters_select" ON "financial_parameters"
  FOR SELECT
  USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) <> '');

CREATE POLICY "parameters_write" ON "financial_parameters"
  FOR ALL
  USING (current_setting('app.role', true) = 'ADMIN')
  WITH CHECK (current_setting('app.role', true) = 'ADMIN');
