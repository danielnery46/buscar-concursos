-- =============================================================================
-- Performance Indexes — Buscar Concursos
-- =============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- All statements use IF NOT EXISTS, so re-running is safe.
--
-- NOTE: These indexes are created WITHOUT the CONCURRENTLY option because
-- the SQL Editor runs each script inside a transaction, and
-- CREATE INDEX CONCURRENTLY cannot be used inside a transaction block.
-- For large tables (>100 k rows), consider running each statement
-- individually with CONCURRENTLY to avoid locking reads.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- job_openings
-- ---------------------------------------------------------------------------

-- Fast equality filter on `type` ('concurso' vs 'processo_seletivo').
-- Used in every standard paginated query.
CREATE INDEX IF NOT EXISTS idx_job_openings_type
    ON job_openings (type);

-- Salary sorting and minimum-salary filter
CREATE INDEX IF NOT EXISTS idx_job_openings_max_salary
    ON job_openings (max_salary_numeric NULLS LAST);

-- Vacancy sorting and minimum-vacancies filter
CREATE INDEX IF NOT EXISTS idx_job_openings_vacancies
    ON job_openings (vacancies_numeric NULLS LAST);

-- Deadline sorting
CREATE INDEX IF NOT EXISTS idx_job_openings_deadline
    ON job_openings (deadline_date NULLS LAST);

-- Alphabetical sorting by organisation name
CREATE INDEX IF NOT EXISTS idx_job_openings_organization
    ON job_openings (organization);

-- City equality filter (normalized_effective_city = ?)
CREATE INDEX IF NOT EXISTS idx_job_openings_normalized_city
    ON job_openings (normalized_effective_city);

-- GIN index for JSONB array containment queries on mentioned_states.
-- Speeds up state/region filters:  mentioned_states @> '["SP"]'
CREATE INDEX IF NOT EXISTS idx_job_openings_mentioned_states
    ON job_openings USING GIN (mentioned_states);

-- GIN index for education level containment queries.
-- Speeds up escolaridade filters:  education_levels @> '["Nível Superior"]'
CREATE INDEX IF NOT EXISTS idx_job_openings_education_levels
    ON job_openings USING GIN (education_levels);


-- ---------------------------------------------------------------------------
-- news_articles
-- ---------------------------------------------------------------------------

-- publication_date is used for sorting and date range filtering.
-- Descending order matches the default sort (most recent first).
CREATE INDEX IF NOT EXISTS idx_news_articles_publication_date
    ON news_articles (publication_date DESC);

-- Source equality filter (IN clause) and DISTINCT in get_distinct_sources RPC
CREATE INDEX IF NOT EXISTS idx_news_articles_source
    ON news_articles (source);

-- GIN index for state/region containment filters
CREATE INDEX IF NOT EXISTS idx_news_articles_mentioned_states
    ON news_articles USING GIN (mentioned_states);


-- ---------------------------------------------------------------------------
-- predicted_openings
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_predicted_openings_publication_date
    ON predicted_openings (publication_date DESC);

CREATE INDEX IF NOT EXISTS idx_predicted_openings_source
    ON predicted_openings (source);

CREATE INDEX IF NOT EXISTS idx_predicted_openings_mentioned_states
    ON predicted_openings USING GIN (mentioned_states);
