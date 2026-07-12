import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLearnerProfiles } from '../hooks/useLearnerProfiles.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Dashboard() {
  const { profiles, activeProfileId, activeProfile, setActiveProfileId, loading: profilesLoading } = useLearnerProfiles();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeProfileId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');

    supabase
      .from('enrollments')
      .select('*, course:courses(*)')
      .eq('learner_profile_id', activeProfileId)
      .order('enrolled_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) throw fetchError;
        setRows((data ?? []).filter((e) => e.course));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't reach the server. Check your connection and try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeProfileId]);

  if (profilesLoading) return <div className="page-spinner">Loading…</div>;

  if (profiles.length === 0) {
    return (
      <div className="wrap empty-state">
        <h2>No learner profile yet</h2>
        <p>Add a learner profile to start enrolling in courses.</p>
        <Link to="/learn/learners" className="btn btn--primary" style={{ marginTop: 16 }}>Add a learner</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-hero wrap">
        <h1>My learning</h1>
        <p className="text-soft">Pick up where you left off.</p>
      </div>

      <div className="wrap">
        {profiles.length > 1 && (
          <div className="catalog-filters">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn btn--sm ${p.id === activeProfileId ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setActiveProfileId(p.id)}
              >
                {p.display_name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="page-spinner">Loading…</div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <h2>No courses yet</h2>
            <p>{activeProfile ? `Enroll ${activeProfile.display_name} in a course` : 'Enroll in a course'} from the catalog to get started.</p>
            <Link to="/learn/courses" className="btn btn--primary" style={{ marginTop: 16 }}>
              Browse catalog
            </Link>
          </div>
        ) : (
          <div className="dashboard-list">
            {rows.map((enrollment) => (
              <div key={enrollment.id} className="dashboard-card card">
                <div className="dashboard-card__thumb">
                  {enrollment.course.thumbnail_url && <img src={enrollment.course.thumbnail_url} alt="" />}
                </div>
                <div className="dashboard-card__body">
                  <h3>{enrollment.course.title}</h3>
                  <ProgressBar percent={enrollment.progress_percent ?? 0} label={`${Math.round(enrollment.progress_percent ?? 0)}% complete`} />
                </div>
                <Link to={`/learn/courses/${enrollment.course.slug}`} className="btn btn--primary btn--sm">
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
