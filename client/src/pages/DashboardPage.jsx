import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';
import { useAuth } from '@/context/AuthContext';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (d) =>
  new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const StatCard = ({ label, value, sublabel, icon }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-3xl font-bold mt-1 text-primary-700">{value}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
      </div>
      {icon && <span className="text-3xl opacity-60">{icon}</span>}
    </div>
  </div>
);

const SectionCard = ({ title, action, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportService.dashboard,
  });

  const d = data?.data;

  if (isLoading || !d) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-pulse text-gray-400">Loading dashboard…</div>
      </div>
    );
  }

  const memberAttendance = d.attendanceThisMonth?.members || 0;
  const visitorAttendance = d.attendanceThisMonth?.visitors || 0;
  const totalAttendance = memberAttendance + visitorAttendance;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Snapshot of Gospel Coalition Church · {formatDate(d.generatedAt)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Total Members"
          value={d.members.total}
          sublabel={`${d.members.byStatus.Member} full members`}
          color="primary"
          icon="👥"
        />
        <StatCard
          label="Regular Attendees"
          value={d.members.byStatus['Regular Attendee']}
          color="primary"
          icon="🌱"
        />
        <StatCard
          label="New Attendees"
          value={d.members.byStatus['New Attendee']}
          color="primary"
          icon="✨"
        />
        <StatCard
          label="Attendance MTD"
          value={totalAttendance}
          sublabel={`${memberAttendance} members · ${visitorAttendance} visitors`}
          color="primary"
          icon="📊"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Upcoming column (spans 2) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <SectionCard
            title="Upcoming this week"
            action={
              <Link to="/calendar" className="text-sm text-primary-600 hover:underline">
                View calendar →
              </Link>
            }
          >
            {d.upcoming.meetings.length === 0 && d.upcoming.events.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nothing scheduled in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {[...d.upcoming.meetings.map((m) => ({ ...m, _kind: 'meeting' })),
                  ...d.upcoming.events.map((e) => ({ ...e, _kind: 'event' }))]
                  .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
                  .map((it) => (
                    <li key={`${it._kind}-${it._id}`} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            it._kind === 'meeting' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {it._kind}
                          </span>
                          <p className="font-medium text-gray-800 truncate">{it.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(it.scheduledAt)}
                          {it.location && ` · ${it.location}`}
                        </p>
                      </div>
                      <Link
                        to={`/attendance/${it._kind}/${it._id}`}
                        className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-md whitespace-nowrap"
                      >
                        Attendance
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recent attendance">
            {d.recentAttendance.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No attendance recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {d.recentAttendance.map((r) => (
                  <li key={r._id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-800 truncate">
                        {r.member
                          ? `${r.member.firstName} ${r.member.lastName}`
                          : <span className="italic">{r.visitorName} (visitor)</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.target?.ref?.title || '—'} · {formatDateTime(r.target?.ref?.scheduledAt || r.markedAt)}
                      </p>
                    </div>
                    {r.member?.memberStatus && (
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {r.member.memberStatus}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6">
          <SectionCard
            title="Celebrants this week 🎉"
            action={
              <Link to="/calendar" className="text-sm text-primary-600 hover:underline">
                Calendar →
              </Link>
            }
          >
            {d.celebrantsThisWeek.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No celebrants this week.</p>
            ) : (
              <ul className="space-y-2">
                {d.celebrantsThisWeek.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xl mt-0.5">{c.type === 'birthday' ? '🎂' : '💒'}</span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/members/${c.member._id}`} className="font-medium text-gray-800 hover:text-primary-600 truncate block">
                        {c.member.firstName} {c.member.lastName}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {c.type === 'birthday'
                          ? `Turning ${c.age} · ${formatDate(c.date)}`
                          : `${c.years}${c.years === 1 ? 'st' : c.years === 2 ? 'nd' : c.years === 3 ? 'rd' : 'th'} anniversary · ${formatDate(c.date)}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Member breakdown">
            <div className="space-y-3 text-sm">
              {Object.entries(d.members.byStatus).map(([status, count]) => {
                const pct = d.members.total ? Math.round((count / d.members.total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">{status}</span>
                      <span className="font-semibold text-gray-800">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 pt-3 flex justify-between text-xs text-gray-500">
                <span>Male: <strong className="text-gray-700">{d.members.byGender.Male}</strong></span>
                <span>Female: <strong className="text-gray-700">{d.members.byGender.Female}</strong></span>
              </div>
            </div>
          </SectionCard>

          {(user?.role === 'super_admin' || user?.role === 'admin') && (
            <Link
              to="/reports"
              className="block bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl p-5 shadow-sm transition-all"
            >
              <p className="font-semibold text-lg">Open Reports →</p>
              <p className="text-sm text-primary-100 mt-1">Attendance, regulars, visitors & celebrants</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
