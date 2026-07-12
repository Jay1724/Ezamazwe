import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth.jsx';

const LearnerProfilesContext = createContext(undefined);

function storageKey(userId) {
  return `ezamazwe-active-learner-${userId}`;
}

export function LearnerProfilesProvider({ children }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeProfileId, setActiveProfileIdState] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('learner_profiles')
        .select('*')
        .or(`user_id.eq.${user.id},parent_user_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setProfiles(data ?? []);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || profiles.length === 0) {
      setActiveProfileIdState(null);
      return;
    }
    const saved = localStorage.getItem(storageKey(user.id));
    const stillExists = saved && profiles.some((p) => p.id === saved);
    setActiveProfileIdState(stillExists ? saved : profiles[0].id);
  }, [user?.id, profiles]);

  const setActiveProfileId = useCallback(
    (id) => {
      setActiveProfileIdState(id);
      if (user) localStorage.setItem(storageKey(user.id), id);
    },
    [user?.id]
  );

  const createProfile = useCallback(
    async ({ displayName, ageGroup, avatar }) => {
      if (!user) return;
      const { data, error: insertError } = await supabase
        .from('learner_profiles')
        .insert({ parent_user_id: user.id, display_name: displayName, age_group: ageGroup, avatar: avatar || null })
        .select()
        .single();
      if (insertError) throw insertError;
      await refresh();
      return data;
    },
    [user?.id, refresh]
  );

  const updateProfile = useCallback(
    async (id, fields) => {
      const { error: updateError } = await supabase.from('learner_profiles').update(fields).eq('id', id);
      if (updateError) throw updateError;
      await refresh();
    },
    [refresh]
  );

  const deleteProfile = useCallback(
    async (id) => {
      const { error: deleteError } = await supabase.from('learner_profiles').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [refresh]
  );

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  );

  const value = {
    profiles,
    loading,
    error,
    activeProfileId,
    activeProfile,
    setActiveProfileId,
    createProfile,
    updateProfile,
    deleteProfile,
    refresh,
  };

  return <LearnerProfilesContext.Provider value={value}>{children}</LearnerProfilesContext.Provider>;
}

export function useLearnerProfiles() {
  const ctx = useContext(LearnerProfilesContext);
  if (!ctx) throw new Error('useLearnerProfiles must be used within LearnerProfilesProvider');
  return ctx;
}
