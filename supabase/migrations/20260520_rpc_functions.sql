-- =============================================================================
-- RPC Functions — Buscar Concursos
-- =============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- get_distinct_sources(p_table text)
-- ---------------------------------------------------------------------------
-- Returns the sorted list of distinct, non-null source values for either
-- `predicted_openings` or `news_articles`.
--
-- Replaces the app-side workaround that fetched 500 rows and deduped in JS.
-- A single SERVER-SIDE SELECT DISTINCT is far cheaper: it can use the
-- idx_*_source B-tree index created in the indexes migration, touching only
-- the index pages instead of heap pages.
--
-- Security: SECURITY DEFINER so the function always has read access to the
-- tables regardless of the caller's role (anon / authenticated).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_distinct_sources(p_table text)
RETURNS TABLE(source text)
LANGUAGE plpgsql
STABLE           -- result is stable within a transaction; allows query-plan caching
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_table = 'predicted_openings' THEN
        RETURN QUERY
            SELECT DISTINCT po.source
            FROM   predicted_openings po
            WHERE  po.source IS NOT NULL
            ORDER  BY po.source;

    ELSIF p_table = 'news_articles' THEN
        RETURN QUERY
            SELECT DISTINCT na.source
            FROM   news_articles na
            WHERE  na.source IS NOT NULL
            ORDER  BY na.source;

    ELSE
        RAISE EXCEPTION 'Unknown table: %. Allowed values: predicted_openings, news_articles', p_table;
    END IF;
END;
$$;

-- Grant execution to the roles used by the Supabase JS client
GRANT EXECUTE ON FUNCTION get_distinct_sources(text) TO anon;
GRANT EXECUTE ON FUNCTION get_distinct_sources(text) TO authenticated;
