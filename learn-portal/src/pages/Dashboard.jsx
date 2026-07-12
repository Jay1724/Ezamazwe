import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('course_id, enrolled_at, course:courses(*)')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });

        if (!active) return;
        if (enrollError) throw enrollError;

        const courseIds = (enrollments ?? []).map((e) => e.course_id);
        let progressByCourse = {};
        if (courseIds.length > 0) {
          const { data: progressRows, error: progressError } = await supabase
            .from('course_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('course_id', courseIds);
          if (progressError) throw progressError;
          progressByCourse = Object.fromEntries((progressRows ?? []).map((p) => [p.course_id, p]));
        }

        if (!active) return;
        setRows(
          (enrollments ?? [])
            .filter((e) => e.course)
            .map((e) => ({
              course: e.course,
              progress: progressByCourse[e.course_id],
            }))
        );
        setLoading(false);
      } catch {
        if (!active) return;
        setError("Couldn't reach the server. Check your connection and try again.");
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (loading) return <div className="page-spinner">Loading…</div>;
  if (error) return <div className="wrap" style={{ paddingTop: 48 }}><div className="form-error">{error}</div></div>;

  return (
    <div>
      <div className="dashboard-hero wrap">
        <h1>My learning</h1>
        <p className="text-soft">Pick up where you left off.</p>
      </div>

      <div className="wrap">
        {rows.length === 0 ? (
          <div className="empty-state">
            <h2>No courses yet</h2>
            <p>Enroll in a course from the catalog to get started.</p>
            <Link to="/learn/courses" className="btn btn--primary" style={{ marginTop: 16 }}>
              Browse catalog
            </Link>
          </div>
        ) : (
          <div className="dashboard-list">
            {rows.map(({ course, progress }) => (
              <div key={course.id} className="dashboard-card card">
                <div className="dashboard-card__thumb">
                  {course.thumbnail_url && <img src={course.thumbnail_url} alt="" />}
                </div>
                <div className="dashboard-card__body">
                  <h3>{course.title}</h3>
                  <ProgressBar
                    percent={progress?.percent_complete ?? 0}
                    label={`${progress?.completed_lessons ?? 0} of ${progress?.total_lessons ?? 0} lessons`}
                  />
                </div>
                <Link to={`/learn/courses/${course.slug}`} className="btn btn--primary btn--sm">
                  Continue
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
