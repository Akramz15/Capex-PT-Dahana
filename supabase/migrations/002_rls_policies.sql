-- =============================================================================
-- Migration: 002_rls_policies.sql
-- Project  : Sistem Monitoring Investasi (Capex) PT Dahana
-- Strategy : Admin = full CRUD | authenticated user = SELECT only
-- =============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE capex_master     ENABLE ROW LEVEL SECURITY;
ALTER TABLE capex_realization ENABLE ROW LEVEL SECURITY;
ALTER TABLE capex_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE capex_timeline   ENABLE ROW LEVEL SECURITY;
ALTER TABLE capex_lku        ENABLE ROW LEVEL SECURITY;
ALTER TABLE capex_assets     ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTION: Check if current user is admin
-- =============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- =============================================================================
-- POLICIES: profiles
-- =============================================================================
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "profiles_admin_all"
    ON profiles FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================================================
-- POLICIES: capex_master
-- =============================================================================
CREATE POLICY "capex_master_select_all"
    ON capex_master FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "capex_master_insert_admin"
    ON capex_master FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "capex_master_update_admin"
    ON capex_master FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "capex_master_delete_admin"
    ON capex_master FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- POLICIES: capex_realization
-- =============================================================================
CREATE POLICY "capex_realization_select_all"
    ON capex_realization FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "capex_realization_insert_admin"
    ON capex_realization FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "capex_realization_update_admin"
    ON capex_realization FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "capex_realization_delete_admin"
    ON capex_realization FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- POLICIES: capex_status_log
-- =============================================================================
CREATE POLICY "capex_status_log_select_all"
    ON capex_status_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "capex_status_log_insert_admin"
    ON capex_status_log FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "capex_status_log_update_admin"
    ON capex_status_log FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "capex_status_log_delete_admin"
    ON capex_status_log FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- POLICIES: capex_timeline
-- =============================================================================
CREATE POLICY "capex_timeline_select_all"
    ON capex_timeline FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "capex_timeline_insert_admin"
    ON capex_timeline FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "capex_timeline_update_admin"
    ON capex_timeline FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "capex_timeline_delete_admin"
    ON capex_timeline FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- POLICIES: capex_lku
-- =============================================================================
CREATE POLICY "capex_lku_select_all"
    ON capex_lku FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "capex_lku_insert_admin"
    ON capex_lku FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "capex_lku_update_admin"
    ON capex_lku FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "capex_lku_delete_admin"
    ON capex_lku FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- POLICIES: capex_assets
-- =============================================================================
CREATE POLICY "capex_assets_select_all"
    ON capex_assets FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "capex_assets_insert_admin"
    ON capex_assets FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "capex_assets_update_admin"
    ON capex_assets FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "capex_assets_delete_admin"
    ON capex_assets FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- GRANT: Revoke anonymous access, allow only authenticated
-- =============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON
    capex_master,
    capex_realization,
    capex_status_log,
    capex_timeline,
    capex_lku,
    capex_assets,
    profiles
TO authenticated;
