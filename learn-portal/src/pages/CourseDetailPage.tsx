import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Course, Enrollment, Lesson } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useLearnerProfiles } from '../contexts/LearnerProfileContext';
import { formatCourseDuration, formatDuration, initials } from '../lib/format';
import { formatMoney, paymentProvider } from '../lib/paymentProvider';
import { PageSpinner } from '../components/PageSpinner';
import { Reveal } from '../components/Reveal';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { isDemoMode } from '../lib/demoMode';
import {
  enrollDemo,
  getDemoCourseProgressPercent,
  getMockCourse,
  getMockLessons,
  isDemoEnrolled,
  MOCK_ENROLLED_COUNTS,
} from '../lib/mockData';

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeProfile, profiles } = useLearnerProfiles();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [demoEnrolled, setDemoEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'processing' | 'error'>('form');

  async function loadData() {
    if (!id) return;
    setLoading(true);

    if (isDemoMode) {
      setCourse(getMockCourse(id) ?? null);
      setLessons(getMockLessons(id));
      setDemoEnrolled(isDemoEnrolled(id));
      setLoading(false);
      return;
    }

    const [{ data: courseData, error: courseError }, { data: lessonData, error: lessonError }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).maybeSingle(),
      supabase.from('lessons').select('*').eq('course_id', id).order('order_index', { ascending: true }),
    ]);

    if (courseError) setError(courseError.message);
    setCourse((courseData as Course) ?? null);
    if (!lessonError) setLessons((lessonData ?? []) as Lesson[]);

    if (activeProfile) {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', id)
        .eq('learner_profile_id', activeProfile.id)
        .maybeSingle();
      setEnrollment((enrollmentData as Enrollment) ?? null);
    } else {
      setEnrollment(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeProfile?.id]);

  if (loading) return <PageSpinner />;
  if (error) return <div className="wrap section form-error">Couldn't load this course: {error}</div>;
  if (!course) {
    return (
      <div className="wrap section empty-state">
        <h2>Course not found</h2>
        <Link to="/" className="btn btn--secondary" style={{ marginTop: 16 }}>
          Back to browse
        </Link>
      </div>
    );
  }

  const totalDuration = lessons.reduce((sum, l) => sum + l.duration_seconds, 0);
  const isFree = course.price_cents === 0;

  function enrollFreeDemo() {
    enrollDemo(course!.id);
    setDemoEnrolled(true);
  }

  async function enrollFree() {
    if (!activeProfile) return;
    setEnrolling(true);
    const { data, error } = await supabase
      .from('enrollments')
      .insert({ learner_profile_id: activeProfile.id, course_id: course!.id })
      .select('*')
      .single();
    setEnrolling(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEnrollment(data as Enrollment);
  }

  async function runCheckout() {
    if (!course) return;
    setCheckoutStep('processing');

    if (isDemoMode) {
      await paymentProvider.pay({ orderId: 'demo', amountCents: course.price_cents, currency: course.currency });
      enrollDemo(course.id);
      setDemoEnrolled(true);
      setShowCheckout(false);
      setCheckoutStep('form');
      return;
    }

    if (!activeProfile) return;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        learner_profile_id: activeProfile.id,
        course_id: course.id,
        amount_cents: course.price_cents,
        currency: course.currency,
        payment_provider: 'mock',
        status: 'pending',
      })
      .select('*')
      .single();

    if (orderError || !order) {
      setCheckoutStep('error');
      return;
    }

    try {
      const result = await paymentProvider.pay({
        orderId: order.id,
        amountCents: course.price_cents,
        currency: course.currency,
      });

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid', paid_at: new Date().toISOString(), provider_reference: result.providerReference })
        .eq('id', order.id);

      if (updateError) throw updateError;

      const { data: newEnrollment, error: enrollError } = await supabase
        .from('enrollments')
        .insert({ learner_profile_id: activeProfile.id, course_id: course.id })
        .select('*')
        .single();

      if (enrollError) throw enrollError;

      setEnrollment(newEnrollment as Enrollment);
      setShowCheckout(false);
      setCheckoutStep('form');
    } catch {
      setCheckoutStep('error');
    }
  }

  function renderEnrollAction() {
    if (isDemoMode) {
      const firstLesson = lessons[0];
      if (demoEnrolled) {
        const percent = getDemoCourseProgressPercent(course!.id);
        return (
          <button
            className="btn btn--primary btn--block"
            onClick={() => firstLesson && navigate(`/course/${course!.id}/lesson/${firstLesson.id}`)}
            disabled={!firstLesson}
          >
            {percent > 0 ? 'Continue learning' : 'Start learning'}
          </button>
        );
      }
      return (
        <>
          <button className="btn btn--primary btn--block" onClick={() => (isFree ? enrollFreeDemo() : setShowCheckout(true))}>
            {isFree ? 'Enroll for free' : `Enroll — ${formatMoney(course!.price_cents, course!.currency)}`}
          </button>
          <p className="field-hint" style={{ textAlign: 'center', marginTop: 8 }}>
            Demo mode — no account needed to preview this course.
          </p>
        </>
      );
    }

    if (!session) {
      return (
        <button className="btn btn--primary btn--block" onClick={() => navigate('/signup')}>
          Sign up to enroll
        </button>
      );
    }
    if (profiles.length === 0) {
      return (
        <>
          <button className="btn btn--secondary btn--block" onClick={() => navigate('/dashboard')}>
            Set up a learner profile first
          </button>
          <p className="field-hint" style={{ textAlign: 'center', marginTop: 8 }}>
            You'll need a profile (yours, or your child's) before enrolling.
          </p>
        </>
      );
    }
    if (enrollment) {
      const firstLesson = lessons[0];
      return (
        <>
          <p className="field-hint" style={{ marginBottom: 10 }}>
            Learning as <strong>{activeProfile?.display_name}</strong>
          </p>
          <button
            className="btn btn--primary btn--block"
            onClick={() => firstLesson && navigate(`/course/${course!.id}/lesson/${firstLesson.id}`)}
            disabled={!firstLesson}
          >
            {enrollment.progress_percent > 0 ? 'Continue learning' : 'Start learning'}
          </button>
        </>
      );
    }
    return (
      <>
        <p className="field-hint" style={{ marginBottom: 10 }}>
          Enrolling as <strong>{activeProfile?.display_name}</strong>
        </p>
        <button
          className="btn btn--primary btn--block"
          disabled={enrolling}
          onClick={() => (isFree ? enrollFree() : setShowCheckout(true))}
        >
          {enrolling ? 'Enrolling…' : isFree ? 'Enroll for free' : `Enroll — ${formatMoney(course!.price_cents, course!.currency)}`}
        </button>
        {!isFree && (
          <p className="checkout-note">
            Payment is simulated in this build (no real gateway is connected yet) — see the project README.
          </p>
        )}
      </>
    );
  }

  const enrolledCount = MOCK_ENROLLED_COUNTS[course.id];

  return (
    <div>
      {isDemoMode && <DemoModeBanner />}
      <div className="wrap">
        <section className="course-detail-hero">
          <Reveal>
            <div className="badge badge--blue" style={{ marginBottom: 12 }}>
              {course.category}
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 14 }}>{course.title}</h1>
            <p className="text-soft" style={{ fontSize: 16, marginBottom: 20 }}>
              {course.description}
            </p>
            <div className="stack-row" style={{ gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <span className="badge">{course.level}</span>
              <span className="mono text-soft" style={{ fontSize: 13 }}>
                {lessons.length} lessons &middot; {formatCourseDuration(totalDuration)}
              </span>
              {isDemoMode && enrolledCount && (
                <span className="mono text-soft" style={{ fontSize: 13 }}>
                  {enrolledCount.toLocaleString()} already enrolled
                </span>
              )}
            </div>

            <div className="course-detail-hero__thumb" style={{ marginBottom: 28 }}>
              {course.thumbnail_url && <img src={course.thumbnail_url} alt="" />}
            </div>

            {course.outcomes.length > 0 && (
              <div className="card" style={{ padding: 28, marginBottom: 28, background: 'var(--grey)', border: 'none' }}>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>What you'll learn</h2>
                <ul className="outcomes-grid">
                  {course.outcomes.map((outcome, i) => (
                    <li key={i} className="outcomes-grid__item">
                      <span className="outcomes-grid__check" aria-hidden="true">
                        ✓
                      </span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {course.skills.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 18, marginBottom: 12 }}>Skills you'll gain</h2>
                <div className="stack-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  {course.skills.map((skill) => (
                    <span key={skill} className="badge badge--blue">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Syllabus</h2>
            <div className="syllabus-list">
              {lessons.map((lesson, i) => (
                <div key={lesson.id} className="card syllabus-item">
                  <span className="syllabus-item__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="syllabus-item__title">
                    {lesson.title}
                    {lesson.is_preview && <span className="badge" style={{ marginLeft: 8 }}>Preview</span>}
                  </span>
                  <span className="syllabus-item__duration">{formatDuration(lesson.duration_seconds)}</span>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 20, margin: '32px 0 16px' }}>Instructor</h2>
            <div className="card instructor-card">
              <div className="instructor-card__avatar">{initials(course.instructor_name || 'EE')}</div>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{course.instructor_name}</p>
                <p className="text-soft" style={{ fontSize: 14 }}>
                  {course.instructor_bio}
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="card enroll-card">
              <div className={`enroll-card__price ${isFree ? 'enroll-card__price--free' : ''}`}>
                {formatMoney(course.price_cents, course.currency)}
              </div>
              <p className="text-soft" style={{ fontSize: 13, marginBottom: 22 }}>
                Full access to all {lessons.length} lessons.
              </p>
              {renderEnrollAction()}
            </div>
          </Reveal>
        </section>

        {showCheckout && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              padding: 20,
            }}
          >
            <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32 }}>
              <h3 style={{ marginBottom: 6 }}>Checkout</h3>
              <p className="text-soft" style={{ fontSize: 13.5, marginBottom: 20 }}>
                {course.title} — {formatMoney(course.price_cents, course.currency)}
              </p>

              <div className="checkout-note" style={{ marginBottom: 20 }}>
                This is a simulated checkout. No real payment gateway is connected — see the project
                README for the flagged decision on choosing PayFast/Yoco/etc.
              </div>

              {checkoutStep === 'form' && (
                <>
                  <div className="field">
                    <label>Card number</label>
                    <input type="text" placeholder="4242 4242 4242 4242" disabled />
                  </div>
                  <div className="grid-2">
                    <div className="field">
                      <label>Expiry</label>
                      <input type="text" placeholder="12/29" disabled />
                    </div>
                    <div className="field">
                      <label>CVC</label>
                      <input type="text" placeholder="123" disabled />
                    </div>
                  </div>
                  <div className="stack-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                    <button className="btn btn--secondary" onClick={() => setShowCheckout(false)}>
                      Cancel
                    </button>
                    <button className="btn btn--primary" onClick={runCheckout}>
                      Pay {formatMoney(course.price_cents, course.currency)}
                    </button>
                  </div>
                </>
              )}

              {checkoutStep === 'processing' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0' }}>
                  <div className="spinner" />
                  <p className="text-soft" style={{ fontSize: 13.5 }}>
                    Processing payment…
                  </p>
                </div>
              )}

              {checkoutStep === 'error' && (
                <>
                  <div className="form-error">Something went wrong processing that payment. Please try again.</div>
                  <div className="stack-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn--secondary" onClick={() => setShowCheckout(false)}>
                      Close
                    </button>
                    <button className="btn btn--primary" onClick={() => setCheckoutStep('form')}>
                      Try again
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
