import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { AgeGroup, LearnerProfile } from '../types/database';
import { useAuth } from './AuthContext';

interface LearnerProfileContextValue {
  profiles: LearnerProfile[];
  activeProfile: LearnerProfile | null;
  loading: boolean;
  setActiveProfileId: (id: string) => void;
  refreshProfiles: () => Promise<void>;
  createChildProfile: (params: { displayName: string; ageGroup: AgeGroup }) => Promise<{ error: string | null }>;
  createSelfProfile: (params: { displayName: string; ageGroup: AgeGroup }) => Promise<{ error: string | null }>;
}

const LearnerProfileContext = createContext<LearnerProfileContextValue | undefined>(undefined);

function storageKey(userId: string) {
  return `ezamazwe-learn:active-profile:${userId}`;
}

export function LearnerProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<LearnerProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfiles = useCallback(async () => {
    if (!session) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // RLS already restricts rows to ones this user owns directly or as parent.
    const { data, error } = await supabase
      .from('learner_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load learner profiles', error);
      setProfiles([]);
    } else {
      setProfiles((data ?? []) as LearnerProfile[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (!session || profiles.length === 0) return;
    const key = storageKey(session.user.id);
    const stored = localStorage.getItem(key);
    const stillValid = stored && profiles.some((p) => p.id === stored);
    setActiveProfileIdState(stillValid ? stored : profiles[0].id);
  }, [session, profiles]);

  function setActiveProfileId(id: string) {
    setActiveProfileIdState(id);
    if (session) localStorage.setItem(storageKey(session.user.id), id);
  }

  async function createChildProfile({ displayName, ageGroup }: { displayName: string; ageGroup: AgeGroup }) {
    if (!session) return { error: 'Not signed in.' };
    const { error } = await supabase.from('learner_profiles').insert({
      parent_user_id: session.user.id,
      user_id: null,
      display_name: displayName,
      age_group: ageGroup,
    });
    if (error) return { error: error.message };
    await refreshProfiles();
    return { error: null };
  }

  async function createSelfProfile({ displayName, ageGroup }: { displayName: string; ageGroup: AgeGroup }) {
    if (!session) return { error: 'Not signed in.' };
    const { error } = await supabase.from('learner_profiles').insert({
      user_id: session.user.id,
      parent_user_id: null,
      display_name: displayName,
      age_group: ageGroup,
    });
    if (error) return { error: error.message };
    await refreshProfiles();
    return { error: null };
  }

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  );

  return (
    <LearnerProfileContext.Provider
      value={{ profiles, activeProfile, loading, setActiveProfileId, refreshProfiles, createChildProfile, createSelfProfile }}
    >
      {children}
    </LearnerProfileContext.Provider>
  );
}

export function useLearnerProfiles() {
  const ctx = useContext(LearnerProfileContext);
  if (!ctx) throw new Error('useLearnerProfiles must be used within LearnerProfileProvider');
  return ctx;
}
