-- =============================================================================
-- Job Interests — Buscar Concursos
-- =============================================================================
-- Permite que usuários autenticados marquem concursos/processos seletivos
-- como "tenho interesse" ou "não tenho interesse". Essas marcações são usadas
-- pela UI para:
--   1) Destacar visualmente o card (borda/selo de interesse ou "esmaecer"
--      os marcados como sem interesse);
--   2) Reordenar a lista (interessantes no topo, sem interesse no final);
--   3) Filtrar a lista (mostrar apenas interessantes / apenas sem interesse).
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- All statements use IF NOT EXISTS / OR REPLACE, so re-running is safe.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.job_interests (
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_link   text        NOT NULL,
    status     text        NOT NULL CHECK (status IN ('interested', 'not_interested')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_link)
);

COMMENT ON TABLE public.job_interests IS
    'Marcações de interesse do usuário sobre vagas (interested / not_interested), usadas para destacar, reordenar e filtrar a lista de concursos.';

-- Index to speed up "fetch all marks for this user" on load.
CREATE INDEX IF NOT EXISTS idx_job_interests_user_id
    ON public.job_interests (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — cada usuário só pode ver/alterar suas próprias marcações
-- (mesmo padrão de policy usado em `user_data`).
-- ---------------------------------------------------------------------------
ALTER TABLE public.job_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total para o próprio usuário" ON public.job_interests;
CREATE POLICY "Acesso total para o próprio usuário"
    ON public.job_interests
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at automático em updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_job_interests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_interests_updated_at ON public.job_interests;
CREATE TRIGGER trg_job_interests_updated_at
    BEFORE UPDATE ON public.job_interests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_job_interests_updated_at();
