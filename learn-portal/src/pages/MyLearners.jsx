import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useLearnerProfiles } from '../hooks/useLearnerProfiles.jsx';

const AGE_GROUPS = ['kids', 'teens', 'adult'];

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function LearnerForm({ initial, onSave, onCancel }) {
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [ageGroup, setAgeGroup] = useState(initial?.age_group ?? 'kids');
  const [avatar, setAvatar] = useState(initial?.avatar ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ displayName: displayName.trim(), ageGroup, avatar: avatar.trim() });
    } catch (err) {
      setError(err.message ?? "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lesson-editor-form">
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label>Name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Learner's name" autoFocus />
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
        <label>Avatar URL (optional)</label>
        <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function MyLearners() {
  const { isParent } = useAuth();
  const { profiles, loading, error, createProfile, updateProfile, deleteProfile } = useLearnerProfiles();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  if (!isParent) {
    return (
      <div className="wrap empty-state">
        <h2>This page is for parent accounts</h2>
        <p>Only parent accounts manage learner profiles.</p>
        <Link to="/learn" className="btn btn--primary" style={{ marginTop: 16 }}>Back to dashboard</Link>
      </div>
    );
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name}? Their enrollments and progress will be deleted too.`)) return;
    await deleteProfile(id);
  };

  return (
    <div className="wrap">
      <div className="admin-header">
        <div>
          <h1 style={{ fontSize: 26 }}>My learners</h1>
          <p className="text-soft">Manage the learner profiles you look after.</p>
        </div>
        {!adding && (
          <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>+ Add learner</button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {adding && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <LearnerForm
            onSave={async (fields) => {
              await createProfile(fields);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="page-spinner">Loading…</div>
      ) : profiles.length === 0 && !adding ? (
        <div className="empty-state">
          <h2>No learners yet</h2>
          <p>Add a learner profile to start enrolling them in courses.</p>
        </div>
      ) : (
        <div className="learner-grid">
          {profiles.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="card" style={{ padding: 20 }}>
                <LearnerForm
                  initial={p}
                  onSave={async (fields) => {
                    await updateProfile(p.id, {
                      display_name: fields.displayName,
                      age_group: fields.ageGroup,
                      avatar: fields.avatar || null,
                    });
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={p.id} className="learner-card card">
                <div className="learner-card__avatar">
                  {p.avatar ? <img src={p.avatar} alt="" /> : <span>{initials(p.display_name)}</span>}
                </div>
                <div className="learner-card__body">
                  <h3>{p.display_name}</h3>
                  <span className="badge badge--draft">{p.age_group}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="icon-btn" onClick={() => setEditingId(p.id)}>Edit</button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => handleDelete(p.id, p.display_name)}>
                    Remove
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
