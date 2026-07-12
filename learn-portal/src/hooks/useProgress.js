import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth.jsx';

const SAVE_INTERVAL_MS = 10000;

export function useProgress(lessonId) {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastSavedAt = useRef(0);

  useEffect(() => {
    if (!user || !lessonId) {
      setProgress(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProgress(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, lessonId]);

  const save = useCallback(
    async (fields) => {
      if (!user || !lessonId) return;
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(
          { user_id: user.id, lesson_id: lessonId, updated_at: new Date().toISOString(), ...fields },
          { onConflict: 'user_id,lesson_id' }
        )
        .select()
        .single();
      if (!error) setProgress(data);
    },
    [user, lessonId]
  );

  const updatePosition = useCallback(
    (seconds, { force = false } = {}) => {
      const now = Date.now();
      if (!force && now - lastSavedAt.current < SAVE_INTERVAL_MS) return;
      lastSavedAt.current = now;
      save({ watch_position: seconds });
    },
    [save]
  );

  const markComplete = useCallback(() => {
    return save({ completed_at: new Date().toISOString() });
  }, [save]);

  return { progress, loading, updatePosition, markComplete };
}
