import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth.jsx';
import { useLearnerProfiles } from '../hooks/useLearnerProfiles.jsx';
import { useEnrollment } from '../hooks/useEnrollment.js';

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profiles, activeProfileId, activeProfile, setActiveProfileId, loading: profilesLoading } = useLearnerProfiles();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const { isEnrolled, loading: enrollmentLoading, enroll } = useEnrollment(activeProfileId, course?.id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('slug', slug)
          .eq('published', true)
          .maybeSingle();

        if (!active) return;
        if (courseError) throw courseError;
        if (!courseData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCourse(courseData);

        const { data: moduleData, error: moduleError } = await supabase
          .from('modules')
          .select('*, lessons(*)')
          .eq('course_id', courseData.id)
          .order('order_index', { ascending: true });

        if (!active) return;
        if (moduleError) throw moduleError;
        const sorted = (moduleData ?? []).map((m) => ({
          ...m,
          lessons: [...(m.lessons ?? [])].sort((a, b) => a.order_index - b.order_index),
        }));
        setModules(sorted);
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
  }, [slug]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/learn/login', { state: { from: { pathname: `/learn/courses/${slug}` } } });
      return;
    }
    if (!activeProfileId) return;
    setEnrolling(true);
    try {
      await enroll();
    } catch {
      // error surfaced via useEnrollment's error state if needed
    } finally {
      setEnrolling(false);
    }
  };

  const firstLesson = modules[0]?.lessons?.[0];

  if (loading) return <div className="page-spinner">Loading…</div>;

  if (error) {
    return (
      <div className="wrap" style={{ paddingTop: 48 }}>
        <div className="form-error">{error}</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="wrap empty-state">
        <h2>Course not found</h2>
        <p>This course doesn't exist or isn't published yet.</p>
        <Link to="/learn/courses" className="btn btn--primary" style={{ marginTop: 16 }}>
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="course-detail-hero">
        <div className="wrap">
          <span className="badge badge--draft">{course.category || course.level}</span>
          <h1 style={{ marginTop: 12 }}>{course.title}</h1>
          {course.description && <p className="text-soft" style={{ maxWidth: '60ch' }}>{course.description}</p>}
          {course.instructor_name && (
            <p className="text-soft" style={{ marginTop: 8, fontSize: 14 }}>
              Taught by <strong>{course.instructor_name}</strong>
              {course.instructor_bio ? ` — ${course.instructor_bio}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="wrap course-detail-layout">
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Curriculum</h2>
          {modules.length === 0 ? (
            <p className="text-soft">Curriculum coming soon.</p>
          ) : (
            modules.map((module) => (
              <div key={module.id} className="curriculum-module card">
                <div className="curriculum-module__header">{module.title}</div>
                {module.lessons.map((lesson) =>
                  isEnrolled || lesson.is_preview ? (
                    <Link
                      key={lesson.id}
                      to={`/learn/courses/${slug}/lesson/${lesson.id}`}
                      className="curriculum-lesson"
                    >
                      <span className="curriculum-lesson__icon">▸</span>
                      <span>{lesson.title}</span>
                      {!isEnrolled && lesson.is_preview && (
                        <span className="badge badge--published" style={{ marginLeft: 'auto' }}>Preview</span>
                      )}
                    </Link>
                  ) : (
                    <div key={lesson.id} className="curriculum-lesson">
                      <span className="curriculum-lesson__icon">🔒</span>
                      <span>{lesson.title}</span>
                    </div>
                  )
                )}
              </div>
            ))
          )}
        </div>

        <div className="enroll-card card">
          <div className="enroll-card__thumb">
            {course.thumbnail_url && <img src={course.thumbnail_url} alt="" />}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="badge badge--draft">{course.age_group}</span>
            <span className="badge badge--draft">{course.level}</span>
          </div>

          {user && profiles.length > 1 && !isEnrolled && (
            <div className="learner-picker">
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Enrolling as</label>
              <select value={activeProfileId ?? ''} onChange={(e) => setActiveProfileId(e.target.value)}>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>
          )}

          {isEnrolled ? (
            <Link
              to={firstLesson ? `/learn/courses/${slug}/lesson/${firstLesson.id}` : '#'}
              className="btn btn--primary"
              style={{ width: '100%' }}
            >
              Continue learning{activeProfile ? ` as ${activeProfile.display_name}` : ''}
            </Link>
          ) : user && !profilesLoading && profiles.length === 0 ? (
            <div>
              <p className="text-soft" style={{ marginBottom: 12, fontSize: 14 }}>
                Add a learner profile before enrolling.
              </p>
              <Link to="/learn/learners" className="btn btn--primary" style={{ width: '100%' }}>Add a learner</Link>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              style={{ width: '100%' }}
              onClick={handleEnroll}
              disabled={enrolling || enrollmentLoading || (user && !activeProfileId)}
            >
              {enrolling ? 'Enrolling…' : 'Enroll now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
