import { Link } from 'react-router-dom';
import type { Course } from '../types/database';
import { formatMoney } from '../lib/paymentProvider';
import { isDemoMode } from '../lib/demoMode';
import { MOCK_ENROLLED_COUNTS } from '../lib/mockData';

const ageGroupLabel: Record<Course['age_group'], string> = {
  kids: 'Kids',
  teens: 'Teens',
  adult: 'Adult & Professional',
  all: 'All ages',
};

const ageGroupBadgeClass: Record<Course['age_group'], string> = {
  kids: 'badge--kids',
  teens: 'badge--teens',
  adult: 'badge--adult',
  all: 'badge--blue',
};

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link to={`/course/${course.id}`} className="card card--hover course-card">
      <div className="course-card__thumb">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt="" />
        ) : (
          <span>{course.category}</span>
        )}
      </div>
      <div className="course-card__body">
        <div className="course-card__badges">
          <span className={`badge ${ageGroupBadgeClass[course.age_group]}`}>{ageGroupLabel[course.age_group]}</span>
          <span className="badge">{course.level}</span>
        </div>
        <h3 className="course-card__title">{course.title}</h3>
        <p className="text-soft" style={{ fontSize: 13.5 }}>
          {course.instructor_name}
        </p>
        {isDemoMode && MOCK_ENROLLED_COUNTS[course.id] && (
          <p className="mono text-soft" style={{ fontSize: 12 }}>
            {MOCK_ENROLLED_COUNTS[course.id].toLocaleString()} enrolled
          </p>
        )}
        <div className="course-card__meta">
          <span className="course-card__price">{formatMoney(course.price_cents, course.currency)}</span>
          <span>&middot;</span>
          <span>{course.category}</span>
        </div>
      </div>
    </Link>
  );
}
