import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const SAVE_INTERVAL_MS = 10000;

export function useProgress(enrollmentId, lessonId) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastSavedAt = useRef(0);

  useEffect(() => {
    if (!enrollmentId || !lessonId) {
      setProgress(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from('lesson_progress')
      .select('*')
      .eq('enrollment_id', enrollmentId)
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
  }, [enrollmentId, lessonId]);

  const save = useCallback(
    async (fields) => {
      if (!enrollmentId || !lessonId) return;
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(
          { enrollment_id: enrollmentId, lesson_id: lessonId, updated_at: new Date().toISOString(), ...fields },
          { onConflict: 'enrollment_id,lesson_id' }
        )
        .select()
        .single();
      if (!error) setProgress(data);
    },
    [enrollmentId, lessonId]
  );

  const updateWatchedSeconds = useCallback(
    (seconds, { force = false } = {}) => {
      const now = Date.now();
      if (!force && now - lastSavedAt.current < SAVE_INTERVAL_MS) return;
      lastSavedAt.current = now;
      save({ last_watched_seconds: seconds });
    },
    [save]
  );

  const markComplete = useCallback(() => {
    return save({ completed: true });
  }, [save]);

  return { progress, loading, updateWatchedSeconds, markComplete };
}
