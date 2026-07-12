import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import CourseCard from '../components/CourseCard.jsx';

const AGE_GROUPS = ['kids', 'teens', 'adult'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

export default function Catalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [level, setLevel] = useState('');

  useEffect(() => {
    let active = true;
    supabase
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) setError("Couldn't reach the server. Check your connection and try again.");
        setCourses(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't reach the server. Check your connection and try again.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(courses.map((c) => c.category).filter(Boolean))].sort(),
    [courses]
  );

  const filtered = useMemo(
    () =>
      courses.filter((c) => {
        if (category && c.category !== category) return false;
        if (ageGroup && c.age_group !== ageGroup && c.age_group !== 'all') return false;
        if (level && c.level !== level) return false;
        return true;
      }),
    [courses, category, ageGroup, level]
  );

  return (
    <div>
      <div className="catalog-hero wrap">
        <h1>Course catalog</h1>
        <p className="text-soft">Browse courses from Ezamazwe Education Centre for Innovation.</p>
      </div>

      <div className="wrap">
        {!loading && !error && courses.length > 0 && (
          <div className="catalog-filters">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              <option value="">All ages</option>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>
              ))}
            </select>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">All levels</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="page-spinner">Loading courses…</div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <h2>No courses yet</h2>
            <p>Check back soon — new courses are on the way.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h2>No courses match those filters</h2>
            <p>Try a different category, age group, or level.</p>
          </div>
        ) : (
          <div className="course-grid">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
