import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  const isFree = !course.price || Number(course.price) === 0;

  return (
    <Link to={`/learn/courses/${course.slug}`} className="course-card card">
      <div className="course-card__thumb">
        {course.thumbnail_url && <img src={course.thumbnail_url} alt="" />}
      </div>
      <div className="course-card__body">
        <h3>{course.title}</h3>
        {course.description && <p className="course-card__desc">{course.description}</p>}
        <div className="course-card__meta">
          <span className={`price-tag ${isFree ? 'price-tag--free' : ''}`}>
            {isFree ? 'Free' : `R${Number(course.price).toFixed(2)}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
