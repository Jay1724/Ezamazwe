import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Course, CourseAgeGroup, CourseLevel, Lesson, LessonResource, VideoProvider } from '../../types/database';
import { PageSpinner } from '../../components/PageSpinner';
import { formatDuration } from '../../lib/format';

const emptyCourse = {
  title: '',
  description: '',
  category: '',
  age_group: 'all' as CourseAgeGroup,
  level: 'beginner' as CourseLevel,
  instructor_name: '',
  instructor_bio: '',
  price_rand: '0',
  thumbnail_url: '' as string | null,
  outcomesText: '',
  skillsText: '',
};

function parseResources(text: string): LessonResource[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split('|').map((s) => s.trim());
      return { label: label || url, url: url || label };
    });
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function resourcesToText(resources: LessonResource[]): string {
  return resources.map((r) => `${r.label}|${r.url}`).join('\n');
}

export function AdminCourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const isNew = courseId === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyCourse);
  const [courseDbId, setCourseDbId] = useState<string | null>(isNew ? null : courseId ?? null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newLesson, setNewLesson] = useState({
    title: '',
    video_provider: 'stub' as VideoProvider,
    video_url: '',
    duration_minutes: '5',
    is_preview: false,
    resourcesText: '',
  });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  async function loadCourse() {
    if (!courseDbId) return;
    setLoading(true);
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseDbId)
      .maybeSingle();

    if (courseError || !courseData) {
      setError(courseError?.message ?? 'Course not found.');
      setLoading(false);
      return;
    }

    const c = courseData as Course;
    setForm({
      title: c.title,
      description: c.description,
      category: c.category,
      age_group: c.age_group,
      level: c.level,
      instructor_name: c.instructor_name,
      instructor_bio: c.instructor_bio,
      price_rand: (c.price_cents / 100).toString(),
      thumbnail_url: c.thumbnail_url,
      outcomesText: c.outcomes.join('\n'),
      skillsText: c.skills.join('\n'),
    });

    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseDbId)
      .order('order_index', { ascending: true });
    setLessons((lessonData ?? []) as Lesson[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!isNew) loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseDbId]);

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      age_group: form.age_group,
      level: form.level,
      instructor_name: form.instructor_name,
      instructor_bio: form.instructor_bio,
      price_cents: Math.round(parseFloat(form.price_rand || '0') * 100),
      thumbnail_url: form.thumbnail_url,
      outcomes: parseLines(form.outcomesText),
      skills: parseLines(form.skillsText),
    };

    if (courseDbId) {
      const { error } = await supabase.from('courses').update(payload).eq('id', courseDbId);
      setSaving(false);
      if (error) return setError(error.message);
      setNotice('Course saved.');
    } else {
      const { data, error } = await supabase.from('courses').insert(payload).select('*').single();
      setSaving(false);
      if (error) return setError(error.message);
      setCourseDbId(data.id);
      navigate(`/admin/courses/${data.id}`, { replace: true });
      setNotice('Course created — now add some lessons below.');
    }
  }

  async function handleThumbnailUpload(file: File) {
    setUploading(true);
    setError(null);
    const path = `thumbnails/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('course-assets').upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('course-assets').getPublicUrl(path);
    setForm((f) => ({ ...f, thumbnail_url: data.publicUrl }));
    setUploading(false);
  }

  async function handleAddLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!courseDbId) return;
    const { error } = await supabase.from('lessons').insert({
      course_id: courseDbId,
      title: newLesson.title,
      order_index: lessons.length,
      video_provider: newLesson.video_provider,
      video_url: newLesson.video_url || null,
      duration_seconds: Math.round(parseFloat(newLesson.duration_minutes || '0') * 60),
      is_preview: newLesson.is_preview,
      resources: parseResources(newLesson.resourcesText),
    });
    if (error) {
      setError(error.message);
      return;
    }
    setNewLesson({ title: '', video_provider: 'stub', video_url: '', duration_minutes: '5', is_preview: false, resourcesText: '' });
    loadCourse();
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm('Delete this lesson?')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (!error) loadCourse();
  }

  async function moveLesson(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    const a = lessons[index];
    const b = lessons[targetIndex];
    await Promise.all([
      supabase.from('lessons').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('lessons').update({ order_index: a.order_index }).eq('id', b.id),
    ]);
    loadCourse();
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="wrap section" style={{ maxWidth: 760 }}>
      <Link to="/admin" className="text-soft" style={{ fontSize: 13 }}>
        &larr; All courses
      </Link>
      <h1 style={{ margin: '12px 0 24px' }}>{isNew ? 'New course' : 'Edit course'}</h1>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success-banner">{notice}</div>}

      <form className="card" style={{ padding: 28, marginBottom: 32 }} onSubmit={handleSaveCourse}>
        <div className="field">
          <label>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <label>What you'll learn (one per line)</label>
          <textarea
            value={form.outcomesText}
            onChange={(e) => setForm({ ...form, outcomesText: e.target.value })}
            placeholder={'Build a simple circuit from scratch\nProgram a robot to move'}
          />
        </div>
        <div className="field">
          <label>Skill tags (one per line)</label>
          <textarea
            value={form.skillsText}
            onChange={(e) => setForm({ ...form, skillsText: e.target.value })}
            placeholder={'Robotics\nProblem solving'}
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          </div>
          <div className="field">
            <label>Age group</label>
            <select value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value as CourseAgeGroup })}>
              <option value="all">All ages</option>
              <option value="kids">Kids</option>
              <option value="teens">Teens</option>
              <option value="adult">Adult</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Level</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as CourseLevel })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="field">
            <label>Price (ZAR, 0 = free)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price_rand}
              onChange={(e) => setForm({ ...form, price_rand: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label>Instructor name</label>
          <input value={form.instructor_name} onChange={(e) => setForm({ ...form, instructor_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Instructor bio</label>
          <textarea value={form.instructor_bio} onChange={(e) => setForm({ ...form, instructor_bio: e.target.value })} />
        </div>
        <div className="field">
          <label>Thumbnail</label>
          {form.thumbnail_url && (
            <img src={form.thumbnail_url} alt="" style={{ width: 160, borderRadius: 10, marginBottom: 8 }} />
          )}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleThumbnailUpload(e.target.files[0])}
          />
          {uploading && <p className="field-hint">Uploading…</p>}
        </div>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create course' : 'Save changes'}
        </button>
      </form>

      {courseDbId && (
        <>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Lessons</h2>

          {lessons.map((lesson, i) => (
            <div key={lesson.id} className="lesson-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" className="lesson-row__handle" onClick={() => moveLesson(i, -1)} disabled={i === 0} aria-label="Move up">
                  ▲
                </button>
                <button
                  type="button"
                  className="lesson-row__handle"
                  onClick={() => moveLesson(i, 1)}
                  disabled={i === lessons.length - 1}
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <span className="lesson-row__title">
                {lesson.title}
                {lesson.is_preview && <span className="badge" style={{ marginLeft: 8 }}>Preview</span>}
              </span>
              <span className="mono text-soft" style={{ fontSize: 12 }}>
                {formatDuration(lesson.duration_seconds)}
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setEditingLessonId(editingLessonId === lesson.id ? null : lesson.id)}
              >
                {editingLessonId === lesson.id ? 'Close' : 'Edit'}
              </button>
              <button type="button" className="btn btn--danger btn--sm" onClick={() => handleDeleteLesson(lesson.id)}>
                Delete
              </button>
            </div>
          ))}

          {editingLessonId && (
            <LessonEditForm
              lesson={lessons.find((l) => l.id === editingLessonId)!}
              onSaved={() => {
                setEditingLessonId(null);
                loadCourse();
              }}
            />
          )}

          <form className="card" style={{ padding: 24, marginTop: 20 }} onSubmit={handleAddLesson}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Add a lesson</h3>
            <div className="field">
              <label>Title</label>
              <input value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} required />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Video provider</label>
                <select
                  value={newLesson.video_provider}
                  onChange={(e) => setNewLesson({ ...newLesson, video_provider: e.target.value as VideoProvider })}
                >
                  <option value="stub">Stub / placeholder</option>
                  <option value="external_url">External URL (direct .mp4 link)</option>
                  <option value="mux">Mux (not yet wired up)</option>
                  <option value="cloudflare_stream">Cloudflare Stream (not yet wired up)</option>
                </select>
              </div>
              <div className="field">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newLesson.duration_minutes}
                  onChange={(e) => setNewLesson({ ...newLesson, duration_minutes: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Video URL (for stub / external URL)</label>
              <input value={newLesson.video_url} onChange={(e) => setNewLesson({ ...newLesson, video_url: e.target.value })} />
            </div>
            <div className="field">
              <label>Resources (one per line: Label|https://url)</label>
              <textarea
                value={newLesson.resourcesText}
                onChange={(e) => setNewLesson({ ...newLesson, resourcesText: e.target.value })}
              />
            </div>
            <label className="stack-row" style={{ fontSize: 13.5, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={newLesson.is_preview}
                onChange={(e) => setNewLesson({ ...newLesson, is_preview: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Free preview (visible to non-enrolled learners)
            </label>
            <button type="submit" className="btn btn--primary">
              Add lesson
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function LessonEditForm({ lesson, onSaved }: { lesson: Lesson; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? '');
  const [durationMinutes, setDurationMinutes] = useState((lesson.duration_seconds / 60).toString());
  const [isPreview, setIsPreview] = useState(lesson.is_preview);
  const [resourcesText, setResourcesText] = useState(resourcesToText(lesson.resources));
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from('lessons')
      .update({
        title,
        video_url: videoUrl || null,
        duration_seconds: Math.round(parseFloat(durationMinutes || '0') * 60),
        is_preview: isPreview,
        resources: parseResources(resourcesText),
      })
      .eq('id', lesson.id);
    setSaving(false);
    onSaved();
  }

  return (
    <form className="card" style={{ padding: 24, marginTop: 12, background: 'var(--grey)' }} onSubmit={handleSave}>
      <h3 style={{ marginBottom: 16, fontSize: 15 }}>Edit lesson</h3>
      <div className="field">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Video URL</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        </div>
        <div className="field">
          <label>Duration (minutes)</label>
          <input type="number" min="0" step="0.5" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Resources (one per line: Label|https://url)</label>
        <textarea value={resourcesText} onChange={(e) => setResourcesText(e.target.value)} />
      </div>
      <label className="stack-row" style={{ fontSize: 13.5, marginBottom: 16 }}>
        <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} style={{ width: 'auto' }} />
        Free preview
      </label>
      <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
        {saving ? 'Saving…' : 'Save lesson'}
      </button>
    </form>
  );
}
