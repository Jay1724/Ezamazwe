import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLearnerProfiles } from '../hooks/useLearnerProfiles.jsx';
import { useEnrollment } from '../hooks/useEnrollment.js';
import { useProgress } from '../hooks/useProgress.js';
import { toEmbedUrl } from '../lib/videoEmbed.js';
import VideoPlayer from '../components/VideoPlayer.jsx';

export default function LessonPlayer() {
  const { slug, lessonId } = useParams();
  const navigate = useNavigate();
  const { activeProfileId } = useLearnerProfiles();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { enrollment, isEnrolled, loading: enrollmentLoading } = useEnrollment(activeProfileId, course?.id);

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
          .maybeSingle();

        if (!active) return;
        if (courseError) throw courseError;
        if (!courseData) {
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

  useEffect(() => {
    if (!enrollment) {
      setCompletedIds(new Set());
      return;
    }
    let active = true;
    supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('enrollment_id', enrollment.id)
      .then(({ data }) => {
        if (!active) return;
        setCompletedIds(new Set((data ?? []).filter((r) => r.completed).map((r) => r.lesson_id)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [enrollment?.id]);

  const flatLessons = useMemo(
    () => modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))),
    [modules]
  );
  const currentLesson = flatLessons.find((l) => l.id === lessonId);
  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  const { progress, updateWatchedSeconds, markComplete } = useProgress(enrollment?.id, currentLesson?.id);

  const canView = isEnrolled || currentLesson?.is_preview;

  useEffect(() => {
    if (loading || enrollmentLoading || !currentLesson) return;
    if (!canView) {
      navigate(`/learn/courses/${slug}`, { replace: true });
    }
  }, [loading, enrollmentLoading, canView, currentLesson, slug]);

  const handleMarkComplete = async () => {
    if (!currentLesson || !enrollment) return;
    await markComplete();
    setCompletedIds((prev) => new Set(prev).add(currentLesson.id));
  };

  if (loading || enrollmentLoading) return <div className="page-spinner">Loading…</div>;
  if (error) return <div className="wrap" style={{ paddingTop: 48 }}><div className="form-error">{error}</div></div>;
  if (!course) return <div className="wrap empty-state"><h2>Course not found</h2></div>;
  if (!currentLesson) return <div className="wrap empty-state"><h2>Lesson not found</h2></div>;
  if (!canView) return null;

  const embedUrl = currentLesson.video_provider_id && currentLesson.video_provider_id !== 'direct'
    ? toEmbedUrl(currentLesson.video_provider_id, currentLesson.video_url)
    : null;

  return (
    <div className="player-layout">
      <aside className="player-sidebar">
        <div className="player-sidebar__header">
          <Link to={`/learn/courses/${slug}`} className="text-soft" style={{ fontSize: 13 }}>&larr; Back to course</Link>
          <h2>{course.title}</h2>
        </div>
        {modules.map((module) => (
          <div key={module.id} className="player-module">
            <h4>{module.title}</h4>
            {module.lessons.map((lesson) => {
              const locked = !isEnrolled && !lesson.is_preview;
              return locked ? (
                <span key={lesson.id} className="player-lesson" style={{ opacity: 0.5, cursor: 'default' }}>
                  <span className="player-lesson__check">🔒</span>
                  <span>{lesson.title}</span>
                </span>
              ) : (
                <Link
                  key={lesson.id}
                  to={`/learn/courses/${slug}/lesson/${lesson.id}`}
                  className={`player-lesson ${lesson.id === lessonId ? 'is-active' : ''} ${completedIds.has(lesson.id) ? 'is-complete' : ''}`}
                >
                  <span className="player-lesson__check">{completedIds.has(lesson.id) ? '✓' : ''}</span>
                  <span>{lesson.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="player-content">
        {!isEnrolled && currentLesson.is_preview && (
          <div className="badge badge--published" style={{ marginBottom: 16 }}>Free preview</div>
        )}

        {currentLesson.video_provider_id === 'direct' && currentLesson.video_url ? (
          <VideoPlayer
            src={currentLesson.video_url}
            startPosition={progress?.last_watched_seconds ?? 0}
            onTimeUpdate={(seconds) => updateWatchedSeconds(seconds)}
            onEnded={handleMarkComplete}
          />
        ) : embedUrl ? (
          <iframe
            className="player-video"
            src={embedUrl}
            title={currentLesson.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
          />
        ) : null}

        <span className="text-soft" style={{ fontSize: 13 }}>{currentLesson.moduleTitle}</span>
        <h1>{currentLesson.title}</h1>

        {currentLesson.resources?.length > 0 && (
          <div style={{ margin: '16px 0' }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Resources</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentLesson.resources.map((r, i) => (
                <li key={i}>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontSize: 14 }}>
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {enrollment && (
          <div className="player-footer">
            <div>{prevLesson && (isEnrolled || prevLesson.is_preview) && (
              <Link to={`/learn/courses/${slug}/lesson/${prevLesson.id}`} className="btn btn--secondary btn--sm">&larr; Previous</Link>
            )}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {!completedIds.has(currentLesson.id) && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={handleMarkComplete}>
                  Mark complete
                </button>
              )}
              {nextLesson && (isEnrolled || nextLesson.is_preview) && (
                <Link to={`/learn/courses/${slug}/lesson/${nextLesson.id}`} className="btn btn--primary btn--sm">Next &rarr;</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
