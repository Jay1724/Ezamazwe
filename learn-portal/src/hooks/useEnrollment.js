import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth.jsx';

export function useEnrollment(courseId) {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user || !courseId) {
      setEnrollment(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      setEnrollment(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user, courseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enroll = useCallback(async () => {
    if (!user || !courseId) return;
    setError('');
    const { data, error: insertError } = await supabase
      .from('enrollments')
      .insert({ user_id: user.id, course_id: courseId })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      throw insertError;
    }
    setEnrollment(data);
    return data;
  }, [user, courseId]);

  return { enrollment, isEnrolled: !!enrollment, loading, error, enroll };
}
