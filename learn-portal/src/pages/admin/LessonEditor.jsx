import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LessonEditor({ courseId, moduleId, lesson, position, onSaved, onCancel, onDeleted }) {
  const idRef = useRef(lesson?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [content, setContent] = useState(lesson?.content ?? '');
  const [durationSeconds, setDurationSeconds] = useState(lesson?.duration_seconds ?? '');
  const [videoPath, setVideoPath] = useState(lesson?.video_path ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const path = `${courseId}/${idRef.current}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('course-videos')
      .upload(path, file, { upsert: true });
    setUploading(false);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    setVideoPath(path);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: saveError } = await supabase.from('lessons').upsert({
      id: idRef.current,
      module_id: moduleId,
      title: title.trim(),
      content: content.trim() || null,
      duration_seconds: durationSeconds ? Number(durationSeconds) : null,
      video_path: videoPath || null,
      position: lesson?.position ?? position,
    });
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
        <label>Content (optional text/markdown)</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Optional lesson notes or transcript" />
      </div>
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
      <div className="field">
        <label>Video</label>
        <input type="file" accept="video/*" onChange={handleFileChange} disabled={uploading} />
        {uploading && <span className="file-upload-status">Uploading…</span>}
        {videoPath && !uploading && <span className="file-upload-status">Video attached: {videoPath.split('/').pop()}</span>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving || uploading}>
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
