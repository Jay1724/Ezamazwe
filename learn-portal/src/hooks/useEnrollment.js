import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useEnrollment(learnerProfileId, courseId) {
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!learnerProfileId || !courseId) {
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
        .eq('learner_profile_id', learnerProfileId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      setEnrollment(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [learnerProfileId, courseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enroll = useCallback(async () => {
    if (!learnerProfileId || !courseId) return;
    setError('');
    const { data, error: insertError } = await supabase
      .from('enrollments')
      .insert({ learner_profile_id: learnerProfileId, course_id: courseId })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      throw insertError;
    }
    setEnrollment(data);
    return data;
  }, [learnerProfileId, courseId]);

  return { enrollment, isEnrolled: !!enrollment, loading, error, enroll };
}
