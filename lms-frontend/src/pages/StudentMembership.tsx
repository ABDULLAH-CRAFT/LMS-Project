
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import { studentSidebarSections } from '../config/studentSidebar';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import {
  apiErrorMessage,
  cancelSubscription,
  getMembershipPlans,
  getMyMembershipCourses,
  getMySubscriptions,
  resumeSubscription,
} from '../lib/api/membership';
import { useSubscribeToPlan } from '../hooks/useSubscribeToPlan';

export default function StudentMembership() {
  const queryClient = useQueryClient();

  const subscribe = useSubscribeToPlan();

  const plansQuery = useQuery({
    queryKey: ['membership', 'plans'],
    queryFn: getMembershipPlans,
  });

  const mineQuery = useQuery({
    queryKey: ['membership', 'me'],
    queryFn: getMySubscriptions,
  });

  const coursesQuery = useQuery({
    queryKey: ['membership', 'courses'],
    queryFn: getMyMembershipCourses,
  });

  const refreshAll = () =>
    queryClient.invalidateQueries({
      queryKey: ['membership'],
    });

  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: refreshAll,
  });

  const resume = useMutation({
    mutationFn: resumeSubscription,
    onSuccess: refreshAll,
  });

  const liveSubscriptions = (mineQuery.data ?? []).filter(
    (s) => s.hasAccess,
  );

  const pastSubscriptions = (mineQuery.data ?? []).filter(
    (s) => !s.hasAccess,
  );

  const livePlanIds = new Set(
    liveSubscriptions.map((s) => s.planId),
  );

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">
        Membership
      </h1>

      <p className="text-muted mb-8">
        Unlock a library of courses with one monthly plan.
      </p>

      {/* ───── my membership ───── */}
      {liveSubscriptions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text mb-3">
            Your membership
          </h2>

          <div className="space-y-3">
            {liveSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-surface rounded-2xl shadow-soft p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-text">
                    {sub.planName}
                  </p>

                  <p className="text-sm text-muted">
                    {sub.cancelAtPeriodEnd
                      ? `Cancelled — access until ${formatDateTime(
                          sub.currentPeriodEnd,
                        )}`
                      : `Paid through ${formatDateTime(
                          sub.currentPeriodEnd,
                        )}`}
                  </p>
                </div>

                {sub.cancelAtPeriodEnd ? (
                  <button
                    className="bg-primary-600 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    onClick={() => resume.mutate(sub.id)}
                    disabled={resume.isPending}
                    type="button"
                  >
                    Keep my membership
                  </button>
                ) : (
                  <button
                    className="bg-surface-strong text-text rounded-full px-4 py-2 text-sm font-medium hover:bg-surface-high disabled:opacity-50"
                    onClick={() => cancel.mutate(sub.id)}
                    disabled={cancel.isPending}
                    type="button"
                  >
                    Cancel at period end
                  </button>
                )}
              </div>
            ))}
          </div>

          {(cancel.isError || resume.isError) && (
            <p className="text-sm text-danger-600 mt-2">
              {apiErrorMessage(
                cancel.error ?? resume.error,
                'Could not update the subscription',
              )}
            </p>
          )}
        </section>
      )}

      {/* ───── plans ───── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text mb-3">
          Plans
        </h2>

        {plansQuery.isLoading && (
          <p className="text-muted text-sm">
            Loading plans…
          </p>
        )}

        {plansQuery.data?.length === 0 && (
          <p className="text-muted text-sm">
            No membership plans are available right now.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plansQuery.data?.map((plan) => (
            <div
              key={plan.id}
              className="bg-surface rounded-2xl shadow-soft p-6 flex flex-col"
            >
              <p className="font-semibold text-text text-lg">
                {plan.name}
              </p>

              <p className="text-3xl font-bold text-text mt-2">
                {formatMoney(plan.price)}

                <span className="text-sm font-normal text-muted">
                  {' '}
                  / month
                </span>
              </p>

              {plan.description && (
                <p className="text-sm text-muted mt-3">
                  {plan.description}
                </p>
              )}

              <p className="text-sm text-text mt-3">
                {plan.includesAllCourses
                  ? 'Every published course'
                  : `${plan.courseCount} course${
                      plan.courseCount === 1 ? '' : 's'
                    } included`}
              </p>

              <div className="mt-auto pt-5">
                {livePlanIds.has(plan.id) && (
                  <p className="text-sm font-medium text-secondary-600">
                    ✓ You’re subscribed
                  </p>
                )}

                {/* Subscribe / renew button */}
                {(() => {
                  const live = liveSubscriptions.find(
                    (s) => s.planId === plan.id,
                  );

                  const msLeft = live
                    ? new Date(
                        live.currentPeriodEnd,
                      ).getTime() - Date.now()
                    : 0;

                  const canPay =
                    !live ||
                    msLeft <= 7 * 24 * 60 * 60 * 1000;

                  if (!canPay) return null;

                  return (
                    <button
                      type="button"
                      className="w-full bg-primary-600 text-white rounded-full px-4 py-2.5 text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
                      onClick={() =>
                        subscribe.mutate({
                          planId: plan.id,
                        })
                      }
                      disabled={subscribe.isPending}
                    >
                      {subscribe.isPending
                        ? 'Opening checkout…'
                        : live
                          ? `Renew for ${formatMoney(plan.price)}`
                          : `Subscribe — ${formatMoney(
                              plan.price,
                            )}/month`}
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* Payment error message */}
        {subscribe.isError &&
          subscribe.error.message !== 'Payment cancelled' && (
            <p className="text-sm text-danger-600 mt-3">
              {apiErrorMessage(
                subscribe.error,
                'Could not start the payment',
              )}
            </p>
          )}

        {/* Payment success message */}
        {subscribe.isSuccess && (
          <p className="text-sm text-secondary-600 mt-3">
            Payment successful — your membership is active.
          </p>
        )}
      </section>

      {/* ───── included courses ───── */}
      {liveSubscriptions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text mb-3">
            Courses you can open now
          </h2>

          {coursesQuery.isLoading && (
            <p className="text-muted text-sm">
              Loading…
            </p>
          )}

          {coursesQuery.data?.length === 0 && (
            <p className="text-muted text-sm">
              Your plan doesn’t include any published courses yet.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coursesQuery.data?.map((course) => (
              <div
                key={course.id}
                className="bg-surface rounded-2xl shadow-soft p-5"
              >
                <p className="font-medium text-text">
                  {course.title}
                </p>

                <p className="text-sm text-muted mt-1 line-clamp-2">
                  {course.description}
                </p>

                <Link
                  to={`/student/courses/${course.id}/learn`}
                  className="inline-block mt-4 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Start learning →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───── history ───── */}
      {pastSubscriptions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-text mb-3">
            Past memberships
          </h2>

          <div className="bg-surface rounded-2xl shadow-soft divide-y divide-border">
            {pastSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <span className="text-text">
                  {sub.planName}
                </span>

                <span className="text-muted">
                  {sub.status} · ended{' '}
                  {formatDateTime(sub.currentPeriodEnd)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}


