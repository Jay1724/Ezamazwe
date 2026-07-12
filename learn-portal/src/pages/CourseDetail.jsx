import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth.jsx';
import { useEnrollment } from '../hooks/useEnrollment.js';

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const { isEnrolled, loading: enrollmentLoading, enroll } = useEnrollment(course?.id);

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
          .eq('is_published', true)
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
          .order('position', { ascending: true });

        if (!active) return;
        if (moduleError) throw moduleError;
        const sorted = (moduleData ?? []).map((m) => ({
          ...m,
          lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
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
  const isFree = !course?.price || Number(course.price) === 0;

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
          <h1>{course.title}</h1>
          {course.description && <p className="text-soft" style={{ maxWidth: '60ch' }}>{course.description}</p>}
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
                {module.lessons.map((lesson) => (
                  <div key={lesson.id} className="curriculum-lesson">
                    <span className="curriculum-lesson__icon">{isEnrolled ? '▸' : '🔒'}</span>
                    <span>{lesson.title}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="enroll-card card">
          <div className="enroll-card__thumb">
            {course.thumbnail_url && <img src={course.thumbnail_url} alt="" />}
          </div>
          <div className="enroll-card__price">{isFree ? 'Free' : `R${Number(course.price).toFixed(2)}`}</div>

          {isEnrolled ? (
            <Link
              to={firstLesson ? `/learn/courses/${slug}/lesson/${firstLesson.id}` : '#'}
              className="btn btn--primary"
              style={{ width: '100%' }}
            >
              Continue learning
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              style={{ width: '100%' }}
              onClick={handleEnroll}
              disabled={enrolling || enrollmentLoading}
            >
              {enrolling ? 'Enrolling…' : 'Enroll now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
