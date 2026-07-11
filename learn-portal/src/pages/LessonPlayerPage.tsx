import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Course, Enrollment, Lesson, LessonProgress } from '../types/database';
import { useLearnerProfiles } from '../contexts/LearnerProfileContext';
import { getPlaybackSource } from '../lib/videoProvider';
import { formatDuration } from '../lib/format';
import { PageSpinner } from '../components/PageSpinner';

const COMPLETE_THRESHOLD = 0.9;
const AUTOSAVE_INTERVAL_MS = 5000;

export function LessonPlayerPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const navigate = useNavigate();
  const { activeProfile, profiles, loading: profilesLoading } = useLearnerProfiles();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progressByLesson, setProgressByLesson] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [tab, setTab] = useState<'overview' | 'resources'>('overview');

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedSecondsRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (profilesLoading) return;
      if (!courseId || !activeProfile) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const [{ data: courseData }, { data: lessonData }] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true }),
      ]);

      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('learner_profile_id', activeProfile.id)
        .maybeSingle();

      if (!mounted) return;

      if (!enrollmentData) {
        setNotEnrolled(true);
        setLoading(false);
        return;
      }

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('enrollment_id', enrollmentData.id);

      if (!mounted) return;

      setCourse((courseData as Course) ?? null);
      setLessons((lessonData ?? []) as Lesson[]);
      setEnrollment(enrollmentData as Enrollment);
      setProgressByLesson(
        Object.fromEntries(((progressData ?? []) as LessonProgress[]).map((p) => [p.lesson_id, p]))
      );
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [courseId, activeProfile, profilesLoading]);

  const currentLesson = useMemo(() => lessons.find((l) => l.id === lessonId) ?? null, [lessons, lessonId]);
  const currentIndex = useMemo(() => lessons.findIndex((l) => l.id === lessonId), [lessons, lessonId]);
  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : undefined;

  async function saveProgress(secondsWatched: number, forceComplete = false) {
    if (!enrollment || !currentLesson) return;
    const duration = currentLesson.duration_seconds || 1;
    const completed = forceComplete || secondsWatched / duration >= COMPLETE_THRESHOLD;

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert(
        {
          enrollment_id: enrollment.id,
          lesson_id: currentLesson.id,
          last_watched_seconds: Math.floor(secondsWatched),
          completed,
        },
        { onConflict: 'enrollment_id,lesson_id' }
      )
      .select('*')
      .single();

    if (error || !data) return;

    setProgressByLesson((prev) => ({ ...prev, [currentLesson.id]: data as LessonProgress }));

    // Recompute course-level progress from all lessons' completion state.
    const updatedMap = { ...progressByLesson, [currentLesson.id]: data as LessonProgress };
    const completedCount = lessons.filter((l) => updatedMap[l.id]?.completed).length;
    const percent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
    const allComplete = lessons.length > 0 && completedCount === lessons.length;

    const { data: updatedEnrollment } = await supabase
      .from('enrollments')
      .update({
        progress_percent: percent,
        completed_at: allComplete ? new Date().toISOString() : null,
      })
      .eq('id', enrollment.id)
      .select('*')
      .single();

    if (updatedEnrollment) setEnrollment(updatedEnrollment as Enrollment);
  }

  useEffect(() => {
    if (!currentLesson) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && video.currentTime !== lastSavedSecondsRef.current) {
        lastSavedSecondsRef.current = video.currentTime;
        saveProgress(video.currentTime);
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id, enrollment?.id]);

  if (loading) return <PageSpinner />;

  if (!profilesLoading && profiles.length === 0) {
    return (
      <div className="wrap section empty-state">
        <h2>Set up a learner profile first</h2>
        <p>You'll need a profile (yours, or your child's) before you can watch lessons.</p>
        <Link to="/dashboard" className="btn btn--primary" style={{ marginTop: 16 }}>
          Go to My Learning
        </Link>
      </div>
    );
  }

  if (notEnrolled) {
    return (
      <div className="wrap section empty-state">
        <h2>You're not enrolled in this course yet</h2>
        <Link to={`/course/${courseId}`} className="btn btn--primary" style={{ marginTop: 16 }}>
          Go to course page
        </Link>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="wrap section empty-state">
        <h2>Lesson not found</h2>
        <Link to={`/course/${courseId}`} className="btn btn--secondary" style={{ marginTop: 16 }}>
          Back to course
        </Link>
      </div>
    );
  }

  const source = getPlaybackSource(currentLesson);
  const currentProgress = progressByLesson[currentLesson.id];

  return (
    <div className="player-layout">
      <div className="player-main">
        <p className="text-soft" style={{ fontSize: 13, marginBottom: 12 }}>
          <Link to={`/course/${course.id}`} className="text-soft">
            &larr; {course.title}
          </Link>
        </p>

        <div className="video-shell">
          {source.kind === 'html5' ? (
            <video
              ref={videoRef}
              key={currentLesson.id}
              src={source.url}
              controls
              style={{ width: '100%', height: '100%' }}
              onEnded={() => saveProgress(currentLesson.duration_seconds, true)}
              onPause={(e) => saveProgress(e.currentTarget.currentTime)}
            />
          ) : (
            <p style={{ maxWidth: 420, padding: 24 }}>{source.message}</p>
          )}
        </div>

        <div className="spread-row" style={{ marginTop: 20 }}>
          <h1 style={{ fontSize: 22 }}>{currentLesson.title}</h1>
          {nextLesson ? (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => navigate(`/course/${course.id}/lesson/${nextLesson.id}`)}
            >
              Next lesson &rarr;
            </button>
          ) : (
            <Link to={`/course/${course.id}`} className="btn btn--secondary btn--sm">
              Back to course
            </Link>
          )}
        </div>

        <div className="player-tabs">
          <button className={`player-tab ${tab === 'overview' ? 'is-active' : ''}`} onClick={() => setTab('overview')}>
            Overview
          </button>
          <button className={`player-tab ${tab === 'resources' ? 'is-active' : ''}`} onClick={() => setTab('resources')}>
            Resources {currentLesson.resources.length > 0 && `(${currentLesson.resources.length})`}
          </button>
        </div>

        <div style={{ padding: '20px 0' }}>
          {tab === 'overview' && (
            <p className="text-soft">
              {formatDuration(currentLesson.duration_seconds)} lesson, part of {course.title}.
              {currentProgress?.completed && ' You have completed this lesson.'}
            </p>
          )}
          {tab === 'resources' &&
            (currentLesson.resources.length > 0 ? (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentLesson.resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
                      {r.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-soft">No resources for this lesson.</p>
            ))}
        </div>
      </div>

      <aside className="lesson-sidebar">
        <h3>Course content</h3>
        {enrollment && (
          <p className="mono text-soft" style={{ fontSize: 12, marginBottom: 16 }}>
            {Math.round(enrollment.progress_percent)}% complete
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lessons.map((lesson, i) => {
            const done = progressByLesson[lesson.id]?.completed;
            return (
              <Link
                key={lesson.id}
                to={`/course/${course.id}/lesson/${lesson.id}`}
                className={`lesson-list-item ${lesson.id === currentLesson.id ? 'is-current' : ''}`}
              >
                <span className={`lesson-list-item__check ${done ? 'is-complete' : ''}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span style={{ flexGrow: 1 }}>{lesson.title}</span>
                <span className="mono text-soft" style={{ fontSize: 11 }}>
                  {formatDuration(lesson.duration_seconds)}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
