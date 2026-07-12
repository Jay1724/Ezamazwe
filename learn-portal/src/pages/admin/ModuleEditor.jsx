import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import LessonEditor from './LessonEditor.jsx';

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ModuleEditor({ module, onChange, onDeleteModule }) {
  const [title, setTitle] = useState(module.title);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [addingLesson, setAddingLesson] = useState(false);

  const saveTitle = async () => {
    if (title.trim() === module.title || !title.trim()) {
      setTitle(module.title);
      return;
    }
    await supabase.from('modules').update({ title: title.trim() }).eq('id', module.id);
    onChange();
  };

  const handleDeleteModule = async () => {
    if (!confirm(`Delete "${module.title}" and all its lessons? This cannot be undone.`)) return;
    await supabase.from('modules').delete().eq('id', module.id);
    onDeleteModule();
  };

  const closeEditors = () => {
    setEditingLessonId(null);
    setAddingLesson(false);
  };

  return (
    <div className="module-block">
      <div className="module-block__header">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} />
        <button type="button" className="icon-btn icon-btn--danger" onClick={handleDeleteModule}>Delete module</button>
      </div>

      <div className="module-block__lessons">
        {module.lessons.map((lesson) =>
          editingLessonId === lesson.id ? (
            <LessonEditor
              key={lesson.id}
              moduleId={module.id}
              lesson={lesson}
              onSaved={() => {
                closeEditors();
                onChange();
              }}
              onCancel={closeEditors}
              onDeleted={() => {
                closeEditors();
                onChange();
              }}
            />
          ) : (
            <div key={lesson.id} className="lesson-row">
              <span className="lesson-row__title">{lesson.title}</span>
              {formatDuration(lesson.duration_seconds) && (
                <span className="lesson-row__meta">{formatDuration(lesson.duration_seconds)}</span>
              )}
              {lesson.video_url && <span className="lesson-row__meta">🎬</span>}
              {lesson.is_preview && <span className="lesson-row__meta">Preview</span>}
              <button type="button" className="icon-btn" onClick={() => setEditingLessonId(lesson.id)}>Edit</button>
            </div>
          )
        )}

        {addingLesson ? (
          <LessonEditor
            moduleId={module.id}
            lesson={null}
            orderIndex={module.lessons.length}
            onSaved={() => {
              closeEditors();
              onChange();
            }}
            onCancel={closeEditors}
            onDeleted={closeEditors}
          />
        ) : (
          <button type="button" className="icon-btn" onClick={() => setAddingLesson(true)}>+ Add lesson</button>
        )}
      </div>
    </div>
  );
}
