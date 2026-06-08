/*
 * Copyright 2025 Daniel Nery Frangilo Paiva
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createContext, useState, useEffect, useContext, ReactNode, useCallback, FC, useRef, useMemo } from 'react';
import type { JobInterestStatus, JobInterestMap } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import { JOB_INTERESTS_KEY } from '../constants';

interface JobInterestsContextType {
    /** Mapa `link da vaga -> status de interesse`. Ausência de chave = "ainda não avaliado". */
    interestMap: JobInterestMap;
    /** `true` quando as marcações já foram carregadas (cloud ou local) e podem ser confiavelmente lidas/exibidas. */
    isLoaded: boolean;
    /** Define (ou remove, passando `null`) a marcação de interesse de uma vaga pelo seu `link`. */
    setInterest: (jobLink: string, status: JobInterestStatus | null) => void;
    /** Atalho para ler o status de uma vaga específica (`undefined` se ainda não avaliada). */
    getInterest: (jobLink: string) => JobInterestStatus | undefined;
    /** Quantidade de vagas marcadas como "tenho interesse". */
    interestedCount: number;
    /** Quantidade de vagas marcadas como "não tenho interesse". */
    notInterestedCount: number;
}

const JobInterestsContext = createContext<JobInterestsContextType | undefined>(undefined);

const getLocalMap = (): JobInterestMap => {
    try {
        const raw = localStorage.getItem(JOB_INTERESTS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed as JobInterestMap : {};
    } catch {
        return {};
    }
};

const setLocalMap = (map: JobInterestMap) => {
    try {
        if (Object.keys(map).length === 0) {
            localStorage.removeItem(JOB_INTERESTS_KEY);
        } else {
            localStorage.setItem(JOB_INTERESTS_KEY, JSON.stringify(map));
        }
    } catch {
        // Armazenamento indisponível (modo privado, cota excedida, etc.) — ignora silenciosamente.
    }
};

interface JobInterestsProviderProps {
    children: ReactNode;
}

export const JobInterestsProvider: FC<JobInterestsProviderProps> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [interestMap, setInterestMap] = useState<JobInterestMap>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const prevUserIdRef = useRef<string | null>(null);

    // Carrega as marcações ao montar / ao mudar o estado de autenticação.
    useEffect(() => {
        if (authLoading) return;

        const userChanged = user?.id !== prevUserIdRef.current;
        if (!userChanged && isLoaded) return;

        let cancelled = false;

        const load = async () => {
            if (user) {
                const wasAnonymous = prevUserIdRef.current === null;
                const localMap = wasAnonymous ? getLocalMap() : {};

                const { data, error } = await supabase
                    .from('job_interests')
                    .select('job_link, status')
                    .eq('user_id', user.id);

                if (cancelled) return;

                const cloudMap: JobInterestMap = {};
                if (!error && data) {
                    for (const row of data) {
                        if (row.status === 'interested' || row.status === 'not_interested') {
                            cloudMap[row.job_link] = row.status as JobInterestStatus;
                        }
                    }
                }

                // Migra marcações anônimas (localStorage) que ainda não existem na nuvem.
                const localOnlyEntries = Object.entries(localMap).filter(([link]) => !(link in cloudMap));
                if (localOnlyEntries.length > 0) {
                    const rowsToUpsert = localOnlyEntries.map(([job_link, status]) => ({
                        user_id: user.id,
                        job_link,
                        status,
                    }));
                    const { error: upsertError } = await supabase.from('job_interests').upsert(rowsToUpsert);
                    if (!upsertError) {
                        for (const [link, status] of localOnlyEntries) {
                            cloudMap[link] = status;
                        }
                    }
                }
                if (wasAnonymous) {
                    setLocalMap({});
                }

                if (!cancelled) {
                    setInterestMap(cloudMap);
                    setIsLoaded(true);
                }
            } else {
                setInterestMap(getLocalMap());
                setIsLoaded(true);
            }
            prevUserIdRef.current = user?.id ?? null;
        };

        load();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]);

    const setInterest = useCallback((jobLink: string, status: JobInterestStatus | null) => {
        setInterestMap(prev => {
            const next = { ...prev };
            if (status === null) {
                delete next[jobLink];
            } else {
                next[jobLink] = status;
            }

            if (user) {
                if (status === null) {
                    supabase.from('job_interests').delete().eq('user_id', user.id).eq('job_link', jobLink)
                        .then(({ error }) => { if (error) console.error('Error removing job interest:', error); });
                } else {
                    supabase.from('job_interests').upsert({ user_id: user.id, job_link: jobLink, status })
                        .then(({ error }) => { if (error) console.error('Error saving job interest:', error); });
                }
            } else {
                setLocalMap(next);
            }

            return next;
        });
    }, [user]);

    const getInterest = useCallback((jobLink: string): JobInterestStatus | undefined => {
        return interestMap[jobLink];
    }, [interestMap]);

    const { interestedCount, notInterestedCount } = useMemo(() => {
        let interested = 0;
        let notInterested = 0;
        for (const status of Object.values(interestMap)) {
            if (status === 'interested') interested++;
            else if (status === 'not_interested') notInterested++;
        }
        return { interestedCount: interested, notInterestedCount: notInterested };
    }, [interestMap]);

    const value = useMemo<JobInterestsContextType>(() => ({
        interestMap,
        isLoaded,
        setInterest,
        getInterest,
        interestedCount,
        notInterestedCount,
    }), [interestMap, isLoaded, setInterest, getInterest, interestedCount, notInterestedCount]);

    return (
        <JobInterestsContext.Provider value={value}>
            {children}
        </JobInterestsContext.Provider>
    );
};

export const useJobInterests = () => {
    const context = useContext(JobInterestsContext);
    if (context === undefined) {
        throw new Error('useJobInterests must be used within a JobInterestsProvider');
    }
    return context;
};
