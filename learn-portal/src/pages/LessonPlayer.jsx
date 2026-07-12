import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth.jsx';
import { useEnrollment } from '../hooks/useEnrollment.js';
import { useProgress } from '../hooks/useProgress.js';
import VideoPlayer from '../components/VideoPlayer.jsx';

const SIGNED_URL_TTL = 60 * 60 * 2; // 2 hours

export default function LessonPlayer() {
  const { slug, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoError, setVideoError] = useState('');

  const { isEnrolled, loading: enrollmentLoading } = useEnrollment(course?.id);

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
          .order('position', { ascending: true });

        if (!active) return;
        if (moduleError) throw moduleError;
        const sorted = (moduleData ?? []).map((m) => ({
          ...m,
          lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
        }));
        setModules(sorted);

        const allLessonIds = sorted.flatMap((m) => m.lessons.map((l) => l.id));
        if (user && allLessonIds.length > 0) {
          const { data: progressRows, error: progressError } = await supabase
            .from('lesson_progress')
            .select('lesson_id, completed_at')
            .eq('user_id', user.id)
            .in('lesson_id', allLessonIds);
          if (progressError) throw progressError;
          if (active) {
            setCompletedIds(new Set((progressRows ?? []).filter((r) => r.completed_at).map((r) => r.lesson_id)));
          }
        }
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
  }, [slug, user?.id]);

  const flatLessons = useMemo(
    () => modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))),
    [modules]
  );
  const currentLesson = flatLessons.find((l) => l.id === lessonId);
  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  const { progress, updatePosition, markComplete } = useProgress(currentLesson?.id);

  useEffect(() => {
    setVideoUrl(null);
    setVideoError('');
    if (!currentLesson?.video_path) return;
    let active = true;
    supabase.storage
      .from('course-videos')
      .createSignedUrl(currentLesson.video_path, SIGNED_URL_TTL)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setVideoError("Couldn't load this video.");
        } else {
          setVideoUrl(data.signedUrl);
        }
      })
      .catch(() => {
        if (!active) return;
        setVideoError("Couldn't load this video.");
      });
    return () => {
      active = false;
    };
  }, [currentLesson?.video_path]);

  useEffect(() => {
    if (loading || enrollmentLoading) return;
    if (course && !isEnrolled) {
      navigate(`/learn/courses/${slug}`, { replace: true });
    }
  }, [loading, enrollmentLoading, isEnrolled, course, slug]);

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    await markComplete();
    setCompletedIds((prev) => new Set(prev).add(currentLesson.id));
  };

  const handleEnded = () => {
    handleMarkComplete();
  };

  if (loading || enrollmentLoading) return <div className="page-spinner">Loading…</div>;
  if (error) return <div className="wrap" style={{ paddingTop: 48 }}><div className="form-error">{error}</div></div>;
  if (!course) return <div className="wrap empty-state"><h2>Course not found</h2></div>;
  if (!isEnrolled) return null;

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
            {module.lessons.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/learn/courses/${slug}/lesson/${lesson.id}`}
                className={`player-lesson ${lesson.id === lessonId ? 'is-active' : ''} ${completedIds.has(lesson.id) ? 'is-complete' : ''}`}
              >
                <span className="player-lesson__check">{completedIds.has(lesson.id) ? '✓' : ''}</span>
                <span>{lesson.title}</span>
              </Link>
            ))}
          </div>
        ))}
      </aside>

      <div className="player-content">
        {!currentLesson ? (
          <div className="empty-state"><h2>Lesson not found</h2></div>
        ) : (
          <>
            {currentLesson.video_path && (
              videoError ? (
                <div className="form-error">{videoError}</div>
              ) : videoUrl ? (
                <VideoPlayer
                  src={videoUrl}
                  startPosition={progress?.watch_position ?? 0}
                  onTimeUpdate={(seconds) => updatePosition(seconds)}
                  onEnded={handleEnded}
                />
              ) : (
                <div className="player-video" />
              )
            )}
            <span className="text-soft" style={{ fontSize: 13 }}>{currentLesson.moduleTitle}</span>
            <h1>{currentLesson.title}</h1>
            {currentLesson.content && <p className="player-content__text">{currentLesson.content}</p>}

            <div className="player-footer">
              <div>{prevLesson && (
                <Link to={`/learn/courses/${slug}/lesson/${prevLesson.id}`} className="btn btn--secondary btn--sm">&larr; Previous</Link>
              )}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {!completedIds.has(currentLesson.id) && (
                  <button type="button" className="btn btn--secondary btn--sm" onClick={handleMarkComplete}>
                    Mark complete
                  </button>
                )}
                {nextLesson && (
                  <Link to={`/learn/courses/${slug}/lesson/${nextLesson.id}`} className="btn btn--primary btn--sm">Next &rarr;</Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
