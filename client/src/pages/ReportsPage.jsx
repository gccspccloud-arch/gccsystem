import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { reportService } from '@/services/reportService';
import { memberService } from '@/services/memberService';
import { outreachService } from '@/services/outreachService';
import { downloadCsv } from '@/utils/csv';

const TABS = [
  { id: 'matrix', label: 'Matrix' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'byEvent', label: 'By Event/Meeting' },
  { id: 'regulars', label: 'Regulars' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'celebrants', label: 'Celebrants' },
];

const STATUS_OPTIONS = ['', 'New Attendee', 'Regular Attendee', 'Member'];

const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

const PILL_TONES = {
  gray: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-100 text-primary-700',
  amber: 'bg-amber-100 text-amber-700',
  sky: 'bg-sky-100 text-sky-700',
  rose: 'bg-rose-100 text-rose-700',
};
const Pill = ({ children, tone = 'gray' }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${PILL_TONES[tone] || PILL_TONES.gray}`}>
    {children}
  </span>
);

// ---- Attendance tab -------------------------------------------------------

const AttendanceReport = () => {
  const [filters, setFilters] = useState({
    from: firstOfMonth(),
    to: today(),
    targetKind: '',
    memberStatus: '',
    includeVisitors: 'true',
  });

  const { data, isFetching } = useQuery({
    queryKey: ['report-attendance', filters],
    queryFn: () => reportService.attendance(filters),
  });

  const records = data?.data?.records || [];
  const summary = data?.data?.summary;

  const exportCsv = () => {
    downloadCsv(
      `attendance_${filters.from}_to_${filters.to}`,
      [
        { key: 'name', label: 'Name', value: (r) => r.member
            ? `${r.member.firstName} ${r.member.lastName}`
            : `${r.visitorName} (visitor)` },
        { key: 'status', label: 'Status', value: (r) => r.member?.memberStatus || 'Visitor' },
        { key: 'kind', label: 'Target Type', value: (r) => r.target?.kind },
        { key: 'title', label: 'Target', value: (r) => r.target?.ref?.title || '' },
        { key: 'eventDate', label: 'Event Date', value: (r) => formatDateTime(r.target?.ref?.scheduledAt) },
        { key: 'markedAt', label: 'Logged At', value: (r) => formatDateTime(r.markedAt) },
        { key: 'markedBy', label: 'Logged By', value: (r) => r.markedBy ? `${r.markedBy.firstName} ${r.markedBy.lastName}` : '' },
      ],
      records
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Target</label>
          <select value={filters.targetKind}
            onChange={(e) => setFilters({ ...filters, targetKind: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="Meeting">Meetings</option>
            <option value="Event">Events</option>
            <option value="OutreachSession">Outreach Sessions</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Member Status</label>
          <select value={filters.memberStatus}
            onChange={(e) => setFilters({ ...filters, memberStatus: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Visitors</label>
          <select value={filters.includeVisitors}
            onChange={(e) => setFilters({ ...filters, includeVisitors: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm">
            <option value="true">Include</option>
            <option value="false">Exclude</option>
            <option value="only">Only visitors</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div className="bg-white border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total records</p>
            <p className="text-lg font-bold text-primary-700">{summary.totalRecords}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-500">Members</p>
            <p className="text-lg font-bold text-primary-700">{summary.memberRecords}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-500">Visitors</p>
            <p className="text-lg font-bold text-primary-700">{summary.visitorRecords}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-500">Meetings / Events / Outreach</p>
            <p className="text-lg font-bold text-primary-700">
              {summary.byTargetKind.Meeting} / {summary.byTargetKind.Event} / {summary.byTargetKind.OutreachSession || 0}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          disabled={!records.length}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Name</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-left px-4 py-2 font-semibold">Target</th>
                <th className="text-left px-4 py-2 font-semibold">Event Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isFetching && records.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No results.</td></tr>
              )}
              {records.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {r.member
                      ? <Link to={`/members/${r.member._id}`} className="text-primary-700 hover:underline">
                          {r.member.firstName} {r.member.lastName}
                        </Link>
                      : <span className="italic text-gray-600">{r.visitorName}</span>}
                  </td>
                  <td className="px-4 py-2">
                    {r.member
                      ? <Pill tone={r.member.memberStatus === 'Member' ? 'primary' : r.member.memberStatus === 'Regular Attendee' ? 'amber' : 'sky'}>{r.member.memberStatus}</Pill>
                      : <Pill tone="rose">Visitor</Pill>}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <span className="text-[10px] uppercase font-bold mr-1 text-gray-400">{r.target?.kind}</span>
                    {r.target?.ref?.title || '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(r.target?.ref?.scheduledAt || r.markedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---- Regulars tab ---------------------------------------------------------

const RegularsReport = () => {
  const [filters, setFilters] = useState({ from: firstOfMonth(), to: today() });

  const { data, isFetching } = useQuery({
    queryKey: ['report-regulars', filters],
    queryFn: () => reportService.memberAttendanceSummary(filters),
  });

  const rows = data?.data || [];

  const exportCsv = () => {
    downloadCsv(
      `regulars_${filters.from}_to_${filters.to}`,
      [
        { key: 'name', label: 'Name', value: (r) => `${r.firstName} ${r.lastName}` },
        { key: 'memberStatus', label: 'Status' },
        { key: 'gender', label: 'Gender' },
        { key: 'attendances', label: 'Attendances' },
        { key: 'lastAttended', label: 'Last Attended', value: (r) => formatDateTime(r.lastAttended) },
      ],
      rows
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-100 max-w-md">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Name</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-right px-4 py-2 font-semibold">Attendances</th>
                <th className="text-left px-4 py-2 font-semibold">Last Attended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isFetching && rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No attendance in this range.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.memberId} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/members/${r.memberId}`} className="text-primary-700 hover:underline">
                      {r.firstName} {r.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Pill tone={r.memberStatus === 'Member' ? 'primary' : r.memberStatus === 'Regular Attendee' ? 'amber' : 'sky'}>
                      {r.memberStatus}
                    </Pill>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-800">{r.attendances}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(r.lastAttended)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---- Visitors tab ---------------------------------------------------------

const VisitorsReport = () => {
  const [filters, setFilters] = useState({ from: firstOfMonth(), to: today(), includeVisitors: 'only' });

  const { data, isFetching } = useQuery({
    queryKey: ['report-visitors', filters],
    queryFn: () => reportService.attendance(filters),
  });

  const records = data?.data?.records || [];

  // Also compute unique-by-name to show repeat visitors.
  const nameCounts = useMemo(() => {
    const m = new Map();
    records.forEach((r) => {
      const name = (r.visitorName || '').trim();
      if (!name) return;
      m.set(name, (m.get(name) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [records]);

  const exportCsv = () => {
    downloadCsv(
      `visitors_${filters.from}_to_${filters.to}`,
      [
        { key: 'visitorName', label: 'Visitor Name' },
        { key: 'kind', label: 'Target Type', value: (r) => r.target?.kind },
        { key: 'title', label: 'Target', value: (r) => r.target?.ref?.title || '' },
        { key: 'eventDate', label: 'Event Date', value: (r) => formatDateTime(r.target?.ref?.scheduledAt) },
        { key: 'markedAt', label: 'Logged At', value: (r) => formatDateTime(r.markedAt) },
      ],
      records
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-100 max-w-md">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          disabled={!records.length}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 lg:col-span-1">
          <h3 className="font-semibold text-gray-800 mb-3">Repeat visitors</h3>
          {nameCounts.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No visitors logged.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {nameCounts.map((n) => (
                <li key={n.name} className="flex justify-between border-b border-gray-50 py-1">
                  <span className="text-gray-700">{n.name}</span>
                  <span className="font-bold text-primary-700">{n.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Visitor</th>
                  <th className="text-left px-4 py-2 font-semibold">Target</th>
                  <th className="text-left px-4 py-2 font-semibold">Event Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isFetching && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
                )}
                {!isFetching && records.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No visitors in this range.</td></tr>
                )}
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 italic text-gray-700">{r.visitorName}</td>
                    <td className="px-4 py-2 text-gray-700">
                      <span className="text-[10px] uppercase font-bold mr-1 text-gray-400">{r.target?.kind}</span>
                      {r.target?.ref?.title || '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(r.target?.ref?.scheduledAt || r.markedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- By Event / Meeting tab ----------------------------------------------

const ByEventReport = () => {
  const [filters, setFilters] = useState({
    from: firstOfMonth(),
    to: today(),
    targetKind: '',
  });
  const [expanded, setExpanded] = useState({});

  const { data, isFetching } = useQuery({
    queryKey: ['report-by-event', filters],
    queryFn: () => reportService.attendance({ ...filters, includeVisitors: 'true' }),
  });

  const records = data?.data?.records || [];

  // Group records by target.ref._id.
  const groups = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      if (!r.target?.ref) return;
      const id = r.target.ref._id;
      if (!map.has(id)) {
        map.set(id, {
          id,
          kind: r.target.kind,
          title: r.target.ref.title,
          scheduledAt: r.target.ref.scheduledAt,
          location: r.target.ref.location,
          locationType: r.target.ref.locationType,
          records: [],
        });
      }
      map.get(id).records.push(r);
    });
    const arr = Array.from(map.values()).map((g) => {
      const members = g.records.filter((r) => r.member);
      const visitors = g.records.filter((r) => !r.member);
      const byStatus = { 'New Attendee': 0, 'Regular Attendee': 0, Member: 0 };
      members.forEach((r) => {
        if (byStatus[r.member.memberStatus] != null) byStatus[r.member.memberStatus] += 1;
      });
      return { ...g, total: g.records.length, members, visitors, byStatus };
    });
    arr.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    return arr;
  }, [records]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const exportSummary = () => {
    downloadCsv(
      `by-event_summary_${filters.from}_to_${filters.to}`,
      [
        { key: 'kind', label: 'Type' },
        { key: 'title', label: 'Title' },
        { key: 'scheduledAt', label: 'Scheduled At', value: (g) => formatDateTime(g.scheduledAt) },
        { key: 'total', label: 'Total Attendees' },
        { key: 'members', label: 'Members', value: (g) => g.members.length },
        { key: 'visitors', label: 'Visitors', value: (g) => g.visitors.length },
        { key: 'New Attendee', label: 'New Attendees', value: (g) => g.byStatus['New Attendee'] },
        { key: 'Regular Attendee', label: 'Regular Attendees', value: (g) => g.byStatus['Regular Attendee'] },
        { key: 'Member', label: 'Full Members', value: (g) => g.byStatus['Member'] },
      ],
      groups
    );
  };

  const exportDetailed = () => {
    const rows = [];
    groups.forEach((g) => {
      g.records.forEach((r) => {
        rows.push({
          targetKind: g.kind,
          targetTitle: g.title,
          scheduledAt: formatDateTime(g.scheduledAt),
          name: r.member ? `${r.member.firstName} ${r.member.lastName}` : `${r.visitorName} (visitor)`,
          status: r.member?.memberStatus || 'Visitor',
          markedAt: formatDateTime(r.markedAt),
        });
      });
    });
    downloadCsv(
      `by-event_detailed_${filters.from}_to_${filters.to}`,
      [
        { key: 'targetKind', label: 'Type' },
        { key: 'targetTitle', label: 'Title' },
        { key: 'scheduledAt', label: 'Event Date' },
        { key: 'name', label: 'Attendee' },
        { key: 'status', label: 'Status' },
        { key: 'markedAt', label: 'Logged At' },
      ],
      rows
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Target</label>
          <select value={filters.targetKind}
            onChange={(e) => setFilters({ ...filters, targetKind: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm">
            <option value="">All (meetings + events)</option>
            <option value="Meeting">Meetings only</option>
            <option value="Event">Events only</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={exportSummary}
          disabled={!groups.length}
          className="px-4 py-2 bg-white hover:bg-gray-50 border border-primary-200 text-primary-700 text-sm font-semibold rounded-md disabled:opacity-50"
        >
          ⬇ Summary CSV
        </button>
        <button
          onClick={exportDetailed}
          disabled={!groups.length}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md"
        >
          ⬇ Detailed CSV
        </button>
      </div>

      {isFetching ? (
        <p className="p-6 text-center text-gray-400">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400">
          No attendance recorded in this range.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isOpen = !!expanded[g.id];
            return (
              <div key={g.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggle(g.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                >
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    g.kind === 'Meeting' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {g.kind}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{g.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(g.scheduledAt)}
                      {g.location && ` · ${g.location}`}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span><strong className="text-lg text-primary-700">{g.total}</strong> total</span>
                    <span className="text-gray-500">{g.members.length} M · {g.visitors.length} V</span>
                  </div>
                  <span className="text-xl text-gray-400">{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/40">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center mb-3">
                      <Stat label="Total" value={g.total} />
                      <Stat label="Members" value={g.byStatus.Member} />
                      <Stat label="Regulars" value={g.byStatus['Regular Attendee']} />
                      <Stat label="New" value={g.byStatus['New Attendee']} />
                      <Stat label="Visitors" value={g.visitors.length} />
                    </div>

                    {g.members.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Members present</p>
                        <ul className="divide-y divide-gray-100 bg-white rounded-md border border-gray-100">
                          {g.members.map((r) => (
                            <li key={r._id} className="px-3 py-1.5 text-sm flex items-center justify-between">
                              <Link to={`/members/${r.member._id}`} className="text-gray-800 hover:text-primary-600">
                                {r.member.firstName} {r.member.lastName}
                              </Link>
                              <Pill tone={r.member.memberStatus === 'Member' ? 'primary' : r.member.memberStatus === 'Regular Attendee' ? 'amber' : 'sky'}>
                                {r.member.memberStatus}
                              </Pill>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {g.visitors.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Visitors</p>
                        <ul className="divide-y divide-gray-100 bg-white rounded-md border border-gray-100">
                          {g.visitors.map((r) => (
                            <li key={r._id} className="px-3 py-1.5 text-sm italic text-gray-700">
                              {r.visitorName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 text-right">
                      <Link
                        to={`/attendance/${g.kind === 'Meeting' ? 'meeting' : 'event'}/${g.id}`}
                        className="text-xs font-semibold text-primary-700 hover:underline"
                      >
                        Open attendance page →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-white border border-gray-100 rounded-md py-2">
    <p className="text-lg font-bold text-primary-700">{value}</p>
    <p className="text-[10px] uppercase text-gray-500 tracking-wide">{label}</p>
  </div>
);

// ---- Celebrants tab -------------------------------------------------------

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const CelebrantsReport = () => {
  const [filters, setFilters] = useState({ from: firstOfMonth(), to: today() });

  const { data, isFetching } = useQuery({
    queryKey: ['report-celebrants', filters],
    queryFn: () => reportService.celebrants(filters),
  });

  const items = data?.data?.items || [];

  const exportCsv = () => {
    downloadCsv(
      `celebrants_${filters.from}_to_${filters.to}`,
      [
        { key: 'type', label: 'Type' },
        { key: 'name', label: 'Name', value: (r) => `${r.member.firstName} ${r.member.lastName}` },
        { key: 'date', label: 'Date', value: (r) => formatDate(r.date) },
        { key: 'detail', label: 'Detail', value: (r) => r.type === 'birthday' ? `Turning ${r.age}` : `${ordinal(r.years)} anniversary${r.spouse ? ` with ${r.spouse}` : ''}` },
        { key: 'original', label: 'Original Date', value: (r) => formatDate(r.original) },
      ],
      items
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-100 max-w-md">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          disabled={!items.length}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isFetching ? (
          <p className="p-6 text-center text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No celebrants in this range.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((c, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-2xl">{c.type === 'birthday' ? '🎂' : '💒'}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/members/${c.member._id}`} className="font-medium text-gray-800 hover:text-primary-600">
                    {c.member.firstName} {c.member.lastName}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {c.type === 'birthday'
                      ? `Turning ${c.age} · ${formatDate(c.date)}`
                      : `${ordinal(c.years)} anniversary${c.spouse ? ` with ${c.spouse}` : ''} · ${formatDate(c.date)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ---- Matrix tab -----------------------------------------------------------

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shortTitle = (title = '') => {
  // Take uppercase letters of each word; fall back to first 3 chars.
  const words = title.trim().split(/\s+/).filter(Boolean);
  const initials = words.map((w) => w[0]).join('').toUpperCase();
  if (initials.length >= 2 && initials.length <= 4) return initials;
  return title.slice(0, 4).toUpperCase();
};

const enumerateDates = (from, to) => {
  const out = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

const dateKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

const MatrixReport = () => {
  const [filters, setFilters] = useState({
    from: firstOfMonth(),
    to: today(),
    includeAbsent: false,
  });

  const { data: attData, isFetching } = useQuery({
    queryKey: ['report-matrix-att', filters.from, filters.to],
    queryFn: () => reportService.attendance({ from: filters.from, to: filters.to, includeVisitors: 'false' }),
  });

  const { data: membersData } = useQuery({
    queryKey: ['members-all-for-matrix'],
    queryFn: () => memberService.list({ limit: 1000 }),
    enabled: filters.includeAbsent,
  });

  const records = attData?.data?.records || [];
  const allMembers = membersData?.data?.items || [];

  const dates = useMemo(() => enumerateDates(filters.from, filters.to), [filters.from, filters.to]);

  // Build map: memberId -> { member, byDay: { dateKey -> [titles] } }
  const { rows, titleLegend } = useMemo(() => {
    const byMember = new Map();
    const titles = new Map(); // full title -> short

    records.forEach((r) => {
      if (!r.member) return;
      const id = r.member._id;
      if (!byMember.has(id)) {
        byMember.set(id, {
          member: r.member,
          byDay: {},
        });
      }
      const entry = byMember.get(id);
      // Use when the meeting/event actually happened, not when the checkbox
      // was toggled — attendance is often logged after the fact.
      const when = r.target?.ref?.scheduledAt || r.markedAt;
      const key = dateKey(when);
      if (!entry.byDay[key]) entry.byDay[key] = [];
      const title = r.target?.ref?.title || 'Unknown';
      entry.byDay[key].push(title);
      if (!titles.has(title)) titles.set(title, shortTitle(title));
    });

    if (filters.includeAbsent) {
      allMembers.forEach((m) => {
        if (!byMember.has(m._id)) {
          byMember.set(m._id, { member: m, byDay: {} });
        }
      });
    }

    const arr = Array.from(byMember.values());
    arr.sort((a, b) =>
      (a.member.lastName || '').localeCompare(b.member.lastName || '') ||
      (a.member.firstName || '').localeCompare(b.member.firstName || '')
    );
    return { rows: arr, titleLegend: Array.from(titles.entries()) };
  }, [records, allMembers, filters.includeAbsent]);

  const exportCsv = () => {
    const cols = [
      { key: 'name', label: 'Name', value: (r) => `${r.member.lastName}, ${r.member.firstName}${r.member.middleName ? ', ' + r.member.middleName : ''}` },
      { key: 'status', label: 'Status', value: (r) => r.member.memberStatus || '' },
      ...dates.map((d) => ({
        key: dateKey(d),
        label: `${d.getDate()}-${MONTH_SHORT[d.getMonth()]}-${WEEKDAY_SHORT[d.getDay()]}`,
        value: (r) => (r.byDay[dateKey(d)] || []).join(', '),
      })),
    ];
    downloadCsv(`attendance_matrix_${filters.from}_to_${filters.to}`, cols, rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.includeAbsent}
              onChange={(e) => setFilters({ ...filters, includeAbsent: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            Include all members (even if absent)
          </label>
        </div>
        <div className="flex items-end justify-end">
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {titleLegend.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-xs">
          <span className="font-semibold text-gray-600 mr-2">Legend:</span>
          {titleLegend.map(([full, short]) => (
            <span key={full} className="inline-flex items-center gap-1 mr-3">
              <span className="font-mono font-bold bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">{short}</span>
              <span className="text-gray-600">{full}</span>
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isFetching ? (
          <p className="p-6 text-center text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No attendance in this range.</p>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="text-xs border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-30 bg-gray-100 border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-[200px]">
                    Name
                  </th>
                  <th className="sticky left-[200px] z-30 bg-gray-100 border border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 min-w-[110px]">
                    Status
                  </th>
                  {dates.map((d) => {
                    const isSun = d.getDay() === 0;
                    return (
                      <th
                        key={dateKey(d)}
                        className={`border border-gray-200 px-1.5 py-2 text-center font-semibold min-w-[70px] ${
                          isSun ? 'bg-primary-50 text-primary-700' : 'text-gray-600'
                        }`}
                      >
                        <div>{d.getDate()}-{MONTH_SHORT[d.getMonth()]}</div>
                        <div className="text-[10px] font-normal text-gray-500">{WEEKDAY_SHORT[d.getDay()]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.member._id} className={idx % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className={`sticky left-0 z-10 border border-gray-200 px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap ${
                      idx % 2 ? 'bg-gray-50' : 'bg-white'
                    }`}>
                      <Link to={`/members/${r.member._id}`} className="hover:text-primary-600">
                        {r.member.lastName}, {r.member.firstName}
                      </Link>
                    </td>
                    <td className={`sticky left-[200px] z-10 border border-gray-200 px-2 py-1.5 ${
                      idx % 2 ? 'bg-gray-50' : 'bg-white'
                    }`}>
                      <span className="text-[10px] text-gray-500">{r.member.memberStatus || '—'}</span>
                    </td>
                    {dates.map((d) => {
                      const cell = r.byDay[dateKey(d)] || [];
                      const isSun = d.getDay() === 0;
                      return (
                        <td
                          key={dateKey(d)}
                          title={cell.join('\n')}
                          className={`border border-gray-200 px-1.5 py-1.5 text-center ${
                            cell.length > 0
                              ? 'bg-primary-50 text-primary-800 font-semibold'
                              : isSun ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          {cell.length === 0 ? '' : cell.map((t) => shortTitle(t)).join(', ')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Outreach tab ---------------------------------------------------------

const OutreachReport = () => {
  const [filters, setFilters] = useState({ from: firstOfMonth(), to: today(), outreach: '' });

  const { data: listData } = useQuery({
    queryKey: ['outreaches', 'all-for-report'],
    queryFn: () => outreachService.list(),
  });
  const outreaches = listData?.data || [];

  const { data, isFetching } = useQuery({
    queryKey: ['report-outreach', filters],
    queryFn: () => reportService.outreach(filters),
  });
  const rows = data?.data?.rows || [];
  const attendees = data?.data?.attendees || [];

  const exportRowsCsv = () => {
    downloadCsv(
      `outreach_summary_${filters.from}_to_${filters.to}`,
      [
        { key: 'name', label: 'Outreach', value: (r) => r.outreach.name },
        { key: 'location', label: 'Location', value: (r) => [r.outreach.barangay, r.outreach.city].filter(Boolean).join(', ') },
        { key: 'sessions', label: 'Sessions' },
        { key: 'attendances', label: 'Total Attendances' },
        { key: 'memberAttendances', label: 'Member Attendances' },
        { key: 'visitorAttendances', label: 'Visitor Attendances' },
        { key: 'distinctMembers', label: 'Distinct Members' },
        { key: 'lastSession', label: 'Last Session', value: (r) => formatDate(r.lastSession) },
      ],
      rows,
    );
  };

  const exportAttendeesCsv = () => {
    downloadCsv(
      `outreach_attendees_${filters.outreach}_${filters.from}_to_${filters.to}`,
      [
        { key: 'name', label: 'Name', value: (r) => `${r.firstName} ${r.lastName}` },
        { key: 'gender', label: 'Gender' },
        { key: 'contactNumber', label: 'Contact' },
        { key: 'attendances', label: 'Attendances' },
        { key: 'promoted', label: 'Promoted to Member', value: (r) => r.promotedToMember ? 'Yes' : 'No' },
      ],
      attendees,
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Outreach (optional)</label>
          <select value={filters.outreach}
            onChange={(e) => setFilters({ ...filters, outreach: e.target.value })}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm">
            <option value="">All outreaches (overview)</option>
            {outreaches.map((o) => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportRowsCsv}
          disabled={!rows.length}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md"
        >
          ⬇ Export Summary CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Outreach</th>
                <th className="text-right px-4 py-2 font-semibold">Sessions</th>
                <th className="text-right px-4 py-2 font-semibold">Attendances</th>
                <th className="text-right px-4 py-2 font-semibold">Members</th>
                <th className="text-right px-4 py-2 font-semibold">Visitors</th>
                <th className="text-right px-4 py-2 font-semibold">Distinct Members</th>
                <th className="text-left px-4 py-2 font-semibold">Last Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isFetching && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No outreach activity in range.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.outreach._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/outreach/${r.outreach._id}`} className="text-primary-700 hover:underline font-medium">
                      {r.outreach.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {[r.outreach.barangay, r.outreach.city].filter(Boolean).join(', ')}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right">{r.sessions}</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-800">{r.attendances}</td>
                  <td className="px-4 py-2 text-right">{r.memberAttendances}</td>
                  <td className="px-4 py-2 text-right">{r.visitorAttendances}</td>
                  <td className="px-4 py-2 text-right">{r.distinctMembers}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(r.lastSession)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filters.outreach && (
        <>
          <div className="flex items-center justify-between mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Per-attendee breakdown</h3>
            <button
              onClick={exportAttendeesCsv}
              disabled={!attendees.length}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-md"
            >
              ⬇ Export CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Name</th>
                    <th className="text-left px-4 py-2 font-semibold">Gender</th>
                    <th className="text-left px-4 py-2 font-semibold">Contact</th>
                    <th className="text-right px-4 py-2 font-semibold">Attendances</th>
                    <th className="text-left px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendees.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No attendees yet.</td></tr>
                  )}
                  {attendees.map((a) => (
                    <tr key={a._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          to={`/outreach/${filters.outreach}/attendees/${a._id}`}
                          className="text-primary-700 hover:underline"
                        >
                          {a.firstName} {a.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{a.gender || '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{a.contactNumber || '—'}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">{a.attendances}</td>
                      <td className="px-4 py-2">
                        {a.promotedToMember
                          ? <Pill tone="primary">Promoted → Member</Pill>
                          : <Pill tone="amber">Outreach Attendee</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---- Shell ----------------------------------------------------------------

const ReportsPage = () => {
  const [tab, setTab] = useState('attendance');

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Attendance, regulars, visitors, and celebrants.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'matrix' && <MatrixReport />}
      {tab === 'attendance' && <AttendanceReport />}
      {tab === 'byEvent' && <ByEventReport />}
      {tab === 'regulars' && <RegularsReport />}
      {tab === 'visitors' && <VisitorsReport />}
      {tab === 'outreach' && <OutreachReport />}
      {tab === 'celebrants' && <CelebrantsReport />}
    </div>
  );
};

export default ReportsPage;
