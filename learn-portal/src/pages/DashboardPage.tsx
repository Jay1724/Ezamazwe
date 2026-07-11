import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { AgeGroup, Course, Enrollment } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useLearnerProfiles } from '../contexts/LearnerProfileContext';
import { ProgressBar } from '../components/ProgressBar';
import { PageSpinner } from '../components/PageSpinner';
import { initials } from '../lib/format';

interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

export function DashboardPage() {
  const { appUser } = useAuth();
  const { profiles, activeProfile, setActiveProfileId, createChildProfile, createSelfProfile, loading: profilesLoading } =
    useLearnerProfiles();

  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAgeGroup, setNewAgeGroup] = useState<AgeGroup>('kids');
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!activeProfile) {
      setEnrollments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('enrollments')
      .select('*, course:courses(*)')
      .eq('learner_profile_id', activeProfile.id)
      .order('enrolled_at', { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error) setEnrollments((data ?? []) as unknown as EnrollmentWithCourse[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeProfile?.id]);

  async function handleAddProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setAddError(null);

    // A learner (self-signup) account manages its own profile; a parent account manages child profiles.
    const result =
      appUser?.role === 'parent'
        ? await createChildProfile({ displayName: newName.trim(), ageGroup: newAgeGroup })
        : await createSelfProfile({ displayName: newName.trim(), ageGroup: newAgeGroup });

    setSaving(false);
    if (result.error) {
      setAddError(result.error);
      return;
    }
    setNewName('');
    setShowAddProfile(false);
  }

  if (profilesLoading) return <PageSpinner />;

  return (
    <div className="wrap section">
      <h1 style={{ marginBottom: 24 }}>My Learning</h1>

      {profiles.length === 0 && !showAddProfile && (
        <div className="card empty-state" style={{ marginBottom: 32 }}>
          <h3>
            {appUser?.role === 'parent' ? "Add your child's first profile" : 'Set up your learner profile'}
          </h3>
          <p style={{ marginBottom: 16 }}>
            {appUser?.role === 'parent'
              ? "Your child doesn't need their own login — just a first name/nickname and age group."
              : 'Tell us your name and age group so we can tailor course recommendations.'}
          </p>
          <button className="btn btn--primary" onClick={() => setShowAddProfile(true)}>
            {appUser?.role === 'parent' ? 'Add child' : 'Set up profile'}
          </button>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="profile-switcher">
          {profiles.map((p) => (
            <button
              key={p.id}
              className={`profile-chip ${activeProfile?.id === p.id ? 'is-active' : ''}`}
              onClick={() => setActiveProfileId(p.id)}
            >
              <span className="profile-chip__avatar">{initials(p.display_name)}</span>
              {p.display_name}
            </button>
          ))}
          {appUser?.role === 'parent' && (
            <button className="filter-chip" onClick={() => setShowAddProfile(true)}>
              + Add child
            </button>
          )}
        </div>
      )}

      {showAddProfile && (
        <form className="card" style={{ padding: 24, marginBottom: 32, maxWidth: 420 }} onSubmit={handleAddProfile}>
          <h3 style={{ marginBottom: 16 }}>{appUser?.role === 'parent' ? "Add a child profile" : 'Your profile'}</h3>
          {addError && <div className="form-error">{addError}</div>}
          <div className="field">
            <label>{appUser?.role === 'parent' ? "Child's first name or nickname" : 'Display name'}</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required />
            {appUser?.role === 'parent' && (
              <p className="field-hint">We only ask for a first name/nickname — no surname, school, or location needed.</p>
            )}
          </div>
          <div className="field">
            <label>Age group</label>
            <select value={newAgeGroup} onChange={(e) => setNewAgeGroup(e.target.value as AgeGroup)}>
              <option value="kids">Kids</option>
              <option value="teens">Teens</option>
              {appUser?.role !== 'parent' && <option value="adult">Adult</option>}
            </select>
          </div>
          <div className="stack-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn--secondary" onClick={() => setShowAddProfile(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {activeProfile && (
        <>
          {loading ? (
            <PageSpinner />
          ) : enrollments.length === 0 ? (
            <div className="empty-state">
              <h3>No courses yet</h3>
              <p style={{ marginBottom: 16 }}>
                {activeProfile.display_name} hasn't enrolled in anything yet.
              </p>
              <Link to="/" className="btn btn--primary">
                Browse courses
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {enrollments.map((e) => (
                <Link key={e.id} to={`/course/${e.course.id}`} className="card enrolled-card">
                  <div className="enrolled-card__thumb">
                    {e.course.thumbnail_url && <img src={e.course.thumbnail_url} alt="" />}
                  </div>
                  <div className="enrolled-card__body">
                    <h3 className="enrolled-card__title">{e.course.title}</h3>
                    <ProgressBar percent={e.progress_percent} />
                  </div>
                  {e.completed_at && <span className="badge badge--adult">Completed</span>}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
