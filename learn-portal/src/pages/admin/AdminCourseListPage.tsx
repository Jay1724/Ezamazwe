import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Course } from '../../types/database';
import { formatMoney } from '../../lib/paymentProvider';
import { PageSpinner } from '../../components/PageSpinner';

export function AdminCourseListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setCourses((data ?? []) as Course[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePublish(course: Course) {
    const { error } = await supabase.from('courses').update({ published: !course.published }).eq('id', course.id);
    if (!error) load();
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`Delete "${course.title}"? This also deletes its lessons and cannot be undone.`)) return;
    const { error } = await supabase.from('courses').delete().eq('id', course.id);
    if (!error) load();
  }

  return (
    <div className="wrap section">
      <div className="spread-row" style={{ marginBottom: 24 }}>
        <div>
          <h1>Admin — Courses</h1>
          <p className="text-soft" style={{ fontSize: 14 }}>
            Internal course management. Not a public-facing surface.
          </p>
        </div>
        <Link to="/admin/courses/new" className="btn btn--primary">
          + New course
        </Link>
      </div>

      {loading && <PageSpinner />}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && (
        <div className="card" style={{ overflowX: 'auto', padding: 8 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Age group</th>
                <th>Level</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <Link to={`/admin/courses/${course.id}`} style={{ fontWeight: 600 }}>
                      {course.title}
                    </Link>
                    <div className="text-soft" style={{ fontSize: 12 }}>
                      {course.category}
                    </div>
                  </td>
                  <td>{course.age_group}</td>
                  <td>{course.level}</td>
                  <td>{formatMoney(course.price_cents, course.currency)}</td>
                  <td>
                    <span className={`status-pill ${course.published ? 'status-pill--published' : 'status-pill--draft'}`}>
                      {course.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div className="stack-row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn--secondary btn--sm" onClick={() => togglePublish(course)}>
                        {course.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => deleteCourse(course)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-soft" style={{ textAlign: 'center', padding: 32 }}>
                    No courses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
