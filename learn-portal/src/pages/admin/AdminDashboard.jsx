import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCourses(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="wrap">
      <div className="admin-header">
        <h1 style={{ fontSize: 26 }}>Courses</h1>
        <Link to="/learn/admin/courses/new" className="btn btn--primary">New course</Link>
      </div>

      {loading ? (
        <div className="page-spinner">Loading…</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <h2>No courses yet</h2>
          <p>Create your first course to get started.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Age group</th>
              <th>Level</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.title}</td>
                <td>
                  <span className={`badge ${course.published ? 'badge--published' : 'badge--draft'}`}>
                    {course.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td>{course.age_group}</td>
                <td>{course.level}</td>
                <td>
                  <Link to={`/learn/admin/courses/${course.id}`} className="icon-btn">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
