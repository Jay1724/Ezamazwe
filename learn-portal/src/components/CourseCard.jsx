import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  return (
    <Link to={`/learn/courses/${course.slug}`} className="course-card card">
      <div className="course-card__thumb">
        {course.thumbnail_url && <img src={course.thumbnail_url} alt="" />}
      </div>
      <div className="course-card__body">
        <h3>{course.title}</h3>
        {course.description && <p className="course-card__desc">{course.description}</p>}
        <div className="course-card__meta">
          {course.category && <span className="badge badge--draft">{course.category}</span>}
          <span className="text-soft" style={{ fontSize: 13 }}>{course.level}</span>
        </div>
      </div>
    </Link>
  );
}
