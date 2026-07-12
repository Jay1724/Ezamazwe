import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ModuleEditor from './ModuleEditor.jsx';

const AGE_GROUPS = ['kids', 'teens', 'adult', 'all'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(!isNew);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [ageGroup, setAgeGroup] = useState('all');
  const [level, setLevel] = useState('beginner');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorBio, setInstructorBio] = useState('');
  const [published, setPublished] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const loadModules = async (courseId) => {
    const { data } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setModules(
      (data ?? []).map((m) => ({ ...m, lessons: [...(m.lessons ?? [])].sort((a, b) => a.order_index - b.order_index) }))
    );
  };

  useEffect(() => {
    if (isNew) {
      setCourse(null);
      setModules([]);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()
      .then(async ({ data }) => {
        if (!active || !data) {
          setLoading(false);
          return;
        }
        setCourse(data);
        setTitle(data.title);
        setSlug(data.slug);
        setDescription(data.description ?? '');
        setCategory(data.category ?? '');
        setAgeGroup(data.age_group ?? 'all');
        setLevel(data.level ?? 'beginner');
        setThumbnailUrl(data.thumbnail_url ?? '');
        setInstructorName(data.instructor_name ?? '');
        setInstructorBio(data.instructor_bio ?? '');
        setPublished(data.published);
        await loadModules(data.id);
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleTitleChange = (value) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSaveCourse = async () => {
    if (!title.trim() || !slug.trim()) {
      setError('Title and slug are required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      age_group: ageGroup,
      level,
      thumbnail_url: thumbnailUrl.trim() || null,
      instructor_name: instructorName.trim() || null,
      instructor_bio: instructorBio.trim() || null,
      published,
    };

    if (isNew) {
      const { data, error: insertError } = await supabase.from('courses').insert(payload).select().single();
      setSaving(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
      navigate(`/learn/admin/courses/${data.id}`, { replace: true });
      return;
    }

    const { error: updateError } = await supabase.from('courses').update(payload).eq('id', id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCourse((prev) => ({ ...prev, ...payload }));
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    await supabase.from('modules').insert({
      course_id: id,
      title: newModuleTitle.trim(),
      order_index: modules.length,
    });
    setNewModuleTitle('');
    setAddingModule(false);
    loadModules(id);
  };

  if (loading) return <div className="page-spinner">Loading…</div>;

  return (
    <div className="wrap">
      <div className="admin-editor-header">
        <div>
          <Link to="/learn/admin" className="text-soft" style={{ fontSize: 13 }}>&larr; All courses</Link>
          <h1 style={{ fontSize: 24, marginTop: 6 }}>{isNew ? 'New course' : course?.title}</h1>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-editor-grid">
        <div className="admin-panel card">
          <h2>Course details</h2>
          <div className="field">
            <label>Title</label>
            <input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Course title" />
          </div>
          <div className="field">
            <label>Slug</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="course-slug"
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" />
          </div>
          <div className="field">
            <label>Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Coding, Robotics, Business" />
          </div>
          <div className="field">
            <label>Age group</label>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Thumbnail URL</label>
            <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="field">
            <label>Instructor name</label>
            <input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} placeholder="Who teaches this course?" />
          </div>
          <div className="field">
            <label>Instructor bio</label>
            <textarea value={instructorBio} onChange={(e) => setInstructorBio(e.target.value)} placeholder="A short instructor bio" />
          </div>
          <div className="toggle-row">
            <input
              type="checkbox"
              id="published"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <label htmlFor="published" style={{ margin: 0 }}>Published (visible in catalog)</label>
          </div>
          <button type="button" className="btn btn--primary" onClick={handleSaveCourse} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Saving…' : isNew ? 'Create course' : 'Save changes'}
          </button>
        </div>

        <div className="admin-panel card">
          <h2>Curriculum</h2>
          {isNew ? (
            <p className="text-soft">Save the course first to start adding modules and lessons.</p>
          ) : (
            <>
              {modules.map((module) => (
                <ModuleEditor
                  key={module.id}
                  module={module}
                  onChange={() => loadModules(id)}
                  onDeleteModule={() => loadModules(id)}
                />
              ))}

              {addingModule ? (
                <div className="lesson-editor-form">
                  <div className="field">
                    <label>Module title</label>
                    <input
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      placeholder="e.g. Getting started"
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn--primary btn--sm" onClick={handleAddModule}>Add module</button>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAddingModule(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAddingModule(true)}>
                  + Add module
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
