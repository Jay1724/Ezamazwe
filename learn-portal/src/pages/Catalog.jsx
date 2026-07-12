import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import CourseCard from '../components/CourseCard.jsx';

export default function Catalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
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

  return (
    <div>
      <div className="catalog-hero wrap">
        <h1>Course catalog</h1>
        <p className="text-soft">Browse courses from Ezamazwe Education Centre for Innovation.</p>
      </div>

      <div className="wrap">
        {loading ? (
          <div className="page-spinner">Loading courses…</div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <h2>No courses yet</h2>
            <p>Check back soon — new courses are on the way.</p>
          </div>
        ) : (
          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
