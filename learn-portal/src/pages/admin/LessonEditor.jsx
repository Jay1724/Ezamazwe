import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const VIDEO_PROVIDERS = [
  { value: '', label: 'No video yet' },
  { value: 'direct', label: 'Direct video file (mp4 URL)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
];

export default function LessonEditor({ moduleId, lesson, orderIndex, onSaved, onCancel, onDeleted }) {
  const idRef = useRef(lesson?.id);
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [videoProviderId, setVideoProviderId] = useState(lesson?.video_provider_id ?? '');
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? '');
  const [durationSeconds, setDurationSeconds] = useState(lesson?.duration_seconds ?? '');
  const [isPreview, setIsPreview] = useState(lesson?.is_preview ?? false);
  const [resources, setResources] = useState(lesson?.resources?.length ? lesson.resources : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addResource = () => setResources((prev) => [...prev, { label: '', url: '' }]);
  const updateResource = (index, field, value) =>
    setResources((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  const removeResource = (index) => setResources((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    const cleanResources = resources.filter((r) => r.label.trim() && r.url.trim());
    const payload = {
      module_id: moduleId,
      title: title.trim(),
      video_provider_id: videoProviderId || null,
      video_url: videoUrl.trim() || null,
      duration_seconds: durationSeconds ? Number(durationSeconds) : null,
      is_preview: isPreview,
      resources: cleanResources,
      order_index: lesson?.order_index ?? orderIndex,
    };
    if (idRef.current) payload.id = idRef.current;

    const { error: saveError } = await supabase.from('lessons').upsert(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved();
  };

  const handleDelete = async () => {
    if (!lesson?.id) {
      onCancel();
      return;
    }
    if (!confirm('Delete this lesson? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('lessons').delete().eq('id', lesson.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onDeleted();
  };

  return (
    <div className="lesson-editor-form">
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label>Lesson title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
      </div>
      <div className="field">
        <label>Video provider</label>
        <select value={videoProviderId} onChange={(e) => setVideoProviderId(e.target.value)}>
          {VIDEO_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      {videoProviderId && (
        <div className="field">
          <label>Video URL</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={videoProviderId === 'direct' ? 'https://…/lesson.mp4' : 'https://…'}
          />
        </div>
      )}
      <div className="field">
        <label>Duration (seconds)</label>
        <input
          type="number"
          min="0"
          value={durationSeconds}
          onChange={(e) => setDurationSeconds(e.target.value)}
          placeholder="e.g. 420"
        />
      </div>
      <div className="toggle-row">
        <input type="checkbox" id={`preview-${idRef.current ?? 'new'}`} checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} />
        <label htmlFor={`preview-${idRef.current ?? 'new'}`} style={{ margin: 0 }}>Free preview (visible without enrolling)</label>
      </div>
      <div className="field">
        <label>Resources</label>
        {resources.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={r.label}
              onChange={(e) => updateResource(i, 'label', e.target.value)}
              placeholder="Label"
              style={{ flex: 1 }}
            />
            <input
              value={r.url}
              onChange={(e) => updateResource(i, 'url', e.target.value)}
              placeholder="https://…"
              style={{ flex: 2 }}
            />
            <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeResource(i)}>✕</button>
          </div>
        ))}
        <button type="button" className="icon-btn" onClick={addResource}>+ Add resource</button>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save lesson'}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel}>Cancel</button>
        {lesson?.id && (
          <button type="button" className="icon-btn icon-btn--danger" onClick={handleDelete} style={{ marginLeft: 'auto' }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
