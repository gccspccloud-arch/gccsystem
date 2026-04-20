import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { meetingService } from '@/services/meetingService';
import { eventService } from '@/services/eventService';
import { memberService } from '@/services/memberService';
import { attendanceService } from '@/services/attendanceService';
import {
  outreachSessionService,
  outreachAttendeeService,
} from '@/services/outreachService';
import { useAuth } from '@/context/AuthContext';
import { MEMBER_STATUS_STYLES } from '@/utils/constants';

const KIND_TO_TARGET = {
  meeting: 'Meeting',
  event: 'Event',
  outreachSession: 'OutreachSession',
};
const KIND_LABEL = {
  meeting: '🗓️ Meeting',
  event: '📅 Event',
  outreachSession: '⛪ Outreach Session',
};

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-PH', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : '—';

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '';

// HH:MM <input type="time"> value derived from a Date.
const toTimeInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

// Combine an HH:MM string with the target's scheduledAt date so we save
// "9:15 on the day of the event" rather than "9:15 today".
const buildEnteredAt = (timeStr, baseDate) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const base = baseDate ? new Date(baseDate) : new Date();
  base.setHours(h || 0, m || 0, 0, 0);
  return base.toISOString();
};

const visitorKey = (name, contact) =>
  `${(name || '').trim().toLowerCase()}|${(contact || '').trim()}`;

const AttendancePage = () => {
  const { kind, id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('super_admin', 'admin');

  const targetKind = KIND_TO_TARGET[kind];
  if (!targetKind) {
    return (
      <div className="card text-center py-12">
        <p className="text-accent-red">Unknown attendance target.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-3">Go back</button>
      </div>
    );
  }

  const isOutreach = targetKind === 'OutreachSession';

  // Target fetch
  const { data: targetData, isLoading: targetLoading, isError: targetError } = useQuery({
    queryKey: [kind, id],
    queryFn: () => {
      if (targetKind === 'Meeting') return meetingService.get(id);
      if (targetKind === 'Event') return eventService.getById(id);
      return outreachSessionService.get(id);
    },
  });
  const target = targetData?.data;

  // Roster: members for meeting/event, outreach attendees for outreach session.
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'all-for-attendance'],
    queryFn: () => memberService.list({ limit: 1000 }),
    enabled: !isOutreach,
  });
  const members = membersData?.data?.items || [];

  const outreachId = target?.outreach?._id || target?.outreach;
  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ['outreach-attendees', outreachId, 'roster'],
    queryFn: () => outreachAttendeeService.list({ outreach: outreachId }),
    enabled: isOutreach && Boolean(outreachId),
  });
  const roster = rosterData?.data || [];

  const attendanceQueryKey = ['attendance', targetKind, id];
  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: attendanceQueryKey,
    queryFn: () => attendanceService.list({ targetKind, targetRef: id }),
  });
  const records = recordsData?.data || [];

  // Lookups
  const recordByMember = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      if (r.member?._id) map.set(String(r.member._id), r);
    });
    return map;
  }, [records]);

  const visitorRecords = useMemo(
    () => records
      .filter((r) => !r.member && r.visitorName)
      .sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt)),
    [records],
  );

  // For outreach: a quick lookup of visitor record by (name+contact) so we
  // know which roster attendees are already marked.
  const visitorByKey = useMemo(() => {
    const map = new Map();
    visitorRecords.forEach((r) => {
      map.set(visitorKey(r.visitorName, r.visitorContactNumber), r);
    });
    return map;
  }, [visitorRecords]);

  const presentCount = recordByMember.size + visitorRecords.length;

  const presentByStatus = useMemo(() => {
    const counts = { Member: 0, 'Regular Attendee': 0, 'New Attendee': 0 };
    records.forEach((r) => {
      if (r.member?.memberStatus && counts[r.member.memberStatus] != null) {
        counts[r.member.memberStatus] += 1;
      }
    });
    return counts;
  }, [records]);

  // Permission: can the current user mark? Mirror server logic.
  const canMark = useMemo(() => {
    if (!target || !user) return false;
    if (isAdmin) return true;
    const uid = String(user.id || user._id);
    const tref = target.teacher?.ref?._id || target.teacher?.ref;
    if (target.teacher?.kind === 'User' && tref && String(tref) === uid) return true;
    return (target.ministers || []).some(
      (m) => m.kind === 'User' && String(m.ref?._id || m.ref) === uid,
    );
  }, [target, user, hasRole, isAdmin]);

  /* ─── Mutations ───────────────────────────────────────────────────── */

  const toggleMutation = useMutation({
    mutationFn: (memberId) =>
      attendanceService.toggleMember({ targetKind, targetRef: id, member: memberId }),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: attendanceQueryKey });
      const prev = queryClient.getQueryData(attendanceQueryKey);
      const member = members.find((m) => m._id === memberId);
      const exists = recordByMember.has(memberId);
      queryClient.setQueryData(attendanceQueryKey, (old) => {
        if (!old) return old;
        const list = old.data || [];
        if (exists) {
          return { ...old, data: list.filter((r) => !(r.member && r.member._id === memberId)) };
        }
        const optimistic = {
          _id: `optimistic-${memberId}`,
          target: { kind: targetKind, ref: id },
          member: member && {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            middleName: member.middleName,
            memberStatus: member.memberStatus,
          },
          visitorName: '',
          markedBy: { firstName: user?.firstName, lastName: user?.lastName },
          markedAt: new Date().toISOString(),
        };
        return { ...old, data: [optimistic, ...list] };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(attendanceQueryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: attendanceQueryKey }),
  });

  const removeMutation = useMutation({
    mutationFn: (recordId) => attendanceService.remove(recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceQueryKey }),
  });

  const visitorAddMutation = useMutation({
    mutationFn: (payload) =>
      attendanceService.addVisitor({ targetKind, targetRef: id, ...payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceQueryKey }),
  });

  const updateTimeMutation = useMutation({
    mutationFn: ({ recordId, enteredAt }) => attendanceService.updateTime(recordId, enteredAt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceQueryKey }),
  });

  // Toggle handler for a roster attendee in outreach mode
  const toggleOutreachAttendee = (att) => {
    if (att.promotedToMember) {
      // Already a Member — use the regular toggle
      const memberId = att.promotedToMember._id || att.promotedToMember;
      toggleMutation.mutate(memberId);
      return;
    }
    const fullName = `${att.firstName} ${att.lastName}`.trim();
    const key = visitorKey(fullName, att.contactNumber);
    const existing = visitorByKey.get(key);
    if (existing) {
      removeMutation.mutate(existing._id);
    } else {
      visitorAddMutation.mutate({
        visitorName: fullName,
        visitorAddress: att.address || '',
        visitorContactNumber: att.contactNumber || '',
      });
    }
  };

  /* ─── Visitor form (ad-hoc) ──────────────────────────────────────── */

  const {
    register: regVisitor,
    handleSubmit: handleVisitorSubmit,
    reset: resetVisitorForm,
    formState: { errors: visitorErrors },
  } = useForm({
    defaultValues: { visitorName: '', visitorContactNumber: '', visitorAddress: '', visitorTime: '' },
  });
  const addVisitorMutation = useMutation({
    mutationFn: (form) =>
      attendanceService.addVisitor({
        targetKind,
        targetRef: id,
        visitorName: form.visitorName.trim(),
        visitorContactNumber: (form.visitorContactNumber || '').trim(),
        visitorAddress: (form.visitorAddress || '').trim(),
        enteredAt: buildEnteredAt(form.visitorTime, target?.scheduledAt),
      }),
    onSuccess: () => {
      resetVisitorForm();
      queryClient.invalidateQueries({ queryKey: attendanceQueryKey });
    },
  });

  /* ─── Visitor promote modal ──────────────────────────────────────── */

  const [promoteRecord, setPromoteRecord] = useState(null); // an attendance record with visitor info
  const [promoteError, setPromoteError] = useState(null);
  const promoteMutation = useMutation({
    mutationFn: (overrides) => attendanceService.promoteVisitor(promoteRecord._id, overrides),
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: attendanceQueryKey });
      const migrated = resp?.data?.migratedRecords ?? 0;
      const memberName = `${resp?.data?.member?.firstName} ${resp?.data?.member?.lastName}`;
      setPromoteRecord(null);
      alert(`Promoted to Member: ${memberName}\nBack-filled ${migrated} past attendance record(s).`);
    },
    onError: (e) => setPromoteError(e.message),
  });

  /* ─── Filters ────────────────────────────────────────────────────── */

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showOnlyMarked, setShowOnlyMarked] = useState(false);

  const filteredMembers = useMemo(() => {
    if (isOutreach) return [];
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => !statusFilter || m.memberStatus === statusFilter)
      .filter((m) => {
        if (!showOnlyMarked) return true;
        return recordByMember.has(String(m._id));
      })
      .filter((m) => {
        if (!q) return true;
        return (
          (m.firstName || '').toLowerCase().includes(q) ||
          (m.lastName || '').toLowerCase().includes(q) ||
          (m.middleName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [isOutreach, members, search, statusFilter, showOnlyMarked, recordByMember]);

  const filteredRoster = useMemo(() => {
    if (!isOutreach) return [];
    const q = search.trim().toLowerCase();
    return roster
      .filter((a) => {
        if (!showOnlyMarked) return true;
        if (a.promotedToMember) {
          const mid = a.promotedToMember._id || a.promotedToMember;
          return recordByMember.has(String(mid));
        }
        const fullName = `${a.firstName} ${a.lastName}`.trim();
        return visitorByKey.has(visitorKey(fullName, a.contactNumber));
      })
      .filter((a) => {
        if (!q) return true;
        return (
          (a.firstName || '').toLowerCase().includes(q) ||
          (a.lastName || '').toLowerCase().includes(q) ||
          (a.middleName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [isOutreach, roster, search, showOnlyMarked, recordByMember, visitorByKey]);

  if (targetLoading) return <p className="text-center text-gray-500 py-8">Loading...</p>;
  if (targetError || !target) {
    return <div className="card text-center py-12 text-accent-red">Could not load this {targetKind.toLowerCase()}.</div>;
  }

  const targetTypeName =
    target.meetingType?.name || target.eventType?.name || target.outreach?.name || '';
  const backTo =
    kind === 'meeting' ? '/meetings'
    : kind === 'outreachSession' ? `/outreach/${outreachId}`
    : '/calendar';
  const backLabel =
    kind === 'meeting' ? 'Meetings'
    : kind === 'outreachSession' ? 'Outreach'
    : 'Calendar';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link to={backTo} className="text-sm text-primary-600 hover:underline">← Back to {backLabel}</Link>
      </div>

      {/* Header */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Attendance · {KIND_LABEL[kind]} {targetTypeName && `· ${targetTypeName}`}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-700 truncate">{target.title}</h1>
            <p className="text-xs text-gray-500 mt-1">📅 {formatDateTime(target.scheduledAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="bg-primary-50 border border-primary-100 text-primary-700 px-4 py-2 rounded-lg text-center min-w-[110px]">
              <p className="text-2xl font-bold leading-none">{presentCount}</p>
              <p className="text-[11px] uppercase tracking-wide">Present</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary-100 text-primary-700">
            <span className="font-bold">{presentByStatus.Member}</span> Members
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            <span className="font-bold">{presentByStatus['Regular Attendee']}</span> Regular Attendees
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            <span className="font-bold">{presentByStatus['New Attendee']}</span> New Attendees
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
            <span className="font-bold">{visitorRecords.length}</span> Visitors
          </span>
        </div>

        {!canMark && (
          <p className="mt-3 text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded px-3 py-2">
            You can view attendance, but only the assigned teacher, ministers, or admins can mark it.
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-col sm:flex-row gap-2">
        <input
          className="input-field flex-1"
          placeholder={isOutreach ? '🔍 Search attendee name...' : '🔍 Search member name...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!isOutreach && (
          <select
            className="input-field sm:max-w-[180px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="Member">Member</option>
            <option value="Regular Attendee">Regular Attendee</option>
            <option value="New Attendee">New Attendee</option>
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-600 sm:px-2">
          <input
            type="checkbox"
            className="w-4 h-4 text-primary-600 rounded"
            checked={showOnlyMarked}
            onChange={(e) => setShowOnlyMarked(e.target.checked)}
          />
          Marked only
        </label>
      </div>

      {/* Roster list */}
      <div className="card p-0 overflow-hidden mb-4">
        {(isOutreach ? rosterLoading : membersLoading) || recordsLoading ? (
          <p className="p-6 text-center text-gray-500 text-sm">Loading...</p>
        ) : isOutreach ? (
          filteredRoster.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">
              No outreach attendees yet. Add them from the outreach roster page.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {filteredRoster.map((a) => {
                const promoted = !!a.promotedToMember;
                const memberId = promoted ? (a.promotedToMember._id || a.promotedToMember) : null;
                const fullName = `${a.firstName} ${a.lastName}`.trim();
                const record = promoted
                  ? recordByMember.get(String(memberId))
                  : visitorByKey.get(visitorKey(fullName, a.contactNumber));
                const isPresent = !!record;
                return (
                  <li key={a._id} className={`flex items-stretch ${isPresent ? 'bg-green-50' : ''}`}>
                    <button
                      type="button"
                      onClick={() => canMark && toggleOutreachAttendee(a)}
                      disabled={!canMark}
                      className={`flex-1 min-w-0 flex items-center gap-4 px-4 py-4 sm:py-5 text-left transition-colors ${
                        isPresent ? 'hover:bg-green-100' : 'hover:bg-gray-50'
                      } ${!canMark ? 'cursor-not-allowed opacity-80' : ''}`}
                    >
                      <span
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isPresent ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isPresent && <span className="text-xl leading-none">✓</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-base sm:text-lg font-medium text-gray-800 truncate">
                          {a.lastName}, {a.firstName}{a.middleName ? ` ${a.middleName.charAt(0)}.` : ''}
                        </p>
                        {a.contactNumber && (
                          <p className="text-xs text-gray-500">📞 {a.contactNumber}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                          promoted ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {promoted ? 'Member' : 'Outreach Attendee'}
                      </span>
                    </button>
                    {isPresent && (
                      <div className="flex items-center pr-3 pl-1">
                        <TimeChip
                          record={record}
                          baseDate={target.scheduledAt}
                          canEdit={canMark}
                          onSave={(recordId, enteredAt) => updateTimeMutation.mutate({ recordId, enteredAt })}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : filteredMembers.length === 0 ? (
          <p className="p-6 text-center text-gray-500 text-sm">No members match the filters.</p>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {filteredMembers.map((m) => {
              const isPresent = recordByMember.has(String(m._id));
              const record = recordByMember.get(String(m._id));
              return (
                <li
                  key={m._id}
                  className={`flex items-stretch ${isPresent ? 'bg-green-50' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => canMark && toggleMutation.mutate(m._id)}
                    disabled={!canMark || toggleMutation.isPending}
                    className={`flex-1 min-w-0 flex items-center gap-4 px-4 py-4 sm:py-5 text-left transition-colors ${
                      isPresent ? 'hover:bg-green-100' : 'hover:bg-gray-50'
                    } ${!canMark ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    <span
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isPresent ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isPresent && <span className="text-xl leading-none">✓</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base sm:text-lg font-medium text-gray-800 truncate">
                        {m.lastName}, {m.firstName}{m.middleName ? ` ${m.middleName.charAt(0)}.` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${MEMBER_STATUS_STYLES[m.memberStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {m.memberStatus}
                    </span>
                  </button>
                  {isPresent && (
                    <div className="flex items-center pr-3 pl-1">
                      <TimeChip
                        record={record}
                        baseDate={target.scheduledAt}
                        canEdit={canMark}
                        onSave={(recordId, enteredAt) => updateTimeMutation.mutate({ recordId, enteredAt })}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Visitors */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Visitors <span className="text-gray-400 font-normal">({visitorRecords.length})</span>
          </h3>
        </div>
        {canMark && (
          <form
            onSubmit={handleVisitorSubmit((f) => addVisitorMutation.mutate(f))}
            className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3"
          >
            <input
              className="input-field sm:col-span-2"
              placeholder="Visitor's full name *"
              {...regVisitor('visitorName', { required: true, maxLength: 120 })}
            />
            <input
              className="input-field"
              placeholder="Contact number"
              {...regVisitor('visitorContactNumber', { maxLength: 30 })}
            />
            <input
              type="time"
              className="input-field"
              title="Time of entry (optional)"
              {...regVisitor('visitorTime')}
            />
            <input
              className="input-field sm:col-span-3"
              placeholder="Address"
              {...regVisitor('visitorAddress', { maxLength: 200 })}
            />
            <div className="flex justify-end items-end">
              <button type="submit" className="btn-primary w-full" disabled={addVisitorMutation.isPending}>
                {addVisitorMutation.isPending ? 'Adding...' : '+ Add Visitor'}
              </button>
            </div>
          </form>
        )}
        {visitorErrors.visitorName && (
          <p className="text-xs text-accent-red mb-2">Please enter the visitor's name.</p>
        )}

        {visitorRecords.length === 0 ? (
          <p className="text-xs text-gray-400">No visitors recorded.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visitorRecords.map((r) => (
              <li
                key={r._id}
                className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg text-sm"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-medium bg-amber-100 px-1 py-0.5 rounded mr-1.5">Visitor</span>
                  <span className="font-medium">{r.visitorName}</span>
                  {r.visitorContactNumber && (
                    <span className="text-xs text-amber-700 ml-2">📞 {r.visitorContactNumber}</span>
                  )}
                  {r.visitorAddress && (
                    <span className="text-xs text-amber-700 ml-2">📍 {r.visitorAddress}</span>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0 items-center">
                  <TimeChip
                    record={r}
                    baseDate={target.scheduledAt}
                    canEdit={canMark}
                    onSave={(recordId, enteredAt) => updateTimeMutation.mutate({ recordId, enteredAt })}
                  />
                  {isAdmin && (
                    <button
                      onClick={() => { setPromoteError(null); setPromoteRecord(r); }}
                      type="button"
                      className="text-[11px] font-medium bg-primary-100 hover:bg-primary-200 text-primary-700 px-2 py-0.5 rounded"
                    >
                      ⬆️ Promote
                    </button>
                  )}
                  {canMark && (
                    <button
                      onClick={() => removeMutation.mutate(r._id)}
                      type="button"
                      className="text-[11px] font-medium bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded"
                      aria-label={`Remove ${r.visitorName}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {promoteRecord && (
        <PromoteVisitorModal
          record={promoteRecord}
          error={promoteError}
          isPending={promoteMutation.isPending}
          onClose={() => setPromoteRecord(null)}
          onSubmit={(overrides) => { setPromoteError(null); promoteMutation.mutate(overrides); }}
        />
      )}
    </div>
  );
};

/**
 * Inline chip for setting/editing the optional time-of-entry on an
 * attendance record. Uses the target's scheduledAt as the date base.
 */
const TimeChip = ({ record, baseDate, canEdit, onSave }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toTimeInput(record?.enteredAt));

  if (!record) return null;

  const display = record.enteredAt ? formatTime(record.enteredAt) : null;

  const submit = () => {
    onSave(record._id, buildEnteredAt(value, baseDate));
    setOpen(false);
  };
  const clear = () => {
    onSave(record._id, null);
    setValue('');
    setOpen(false);
  };

  if (!canEdit) {
    return display ? (
      <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
        🕐 {display}
      </span>
    ) : null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`text-[11px] font-medium px-2 py-1 rounded border whitespace-nowrap ${
          display
            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
        }`}
      >
        🕐 {display || 'Set time'}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="time"
            className="border border-gray-200 rounded px-2 py-1 text-xs"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!value}
            className="text-xs px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300"
          >
            Save
          </button>
          {record.enteredAt && (
            <button
              type="button"
              onClick={clear}
              className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs px-1.5 py-1 text-gray-400 hover:text-gray-600"
            aria-label="Cancel"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

const PromoteVisitorModal = ({ record, error, isPending, onClose, onSubmit }) => {
  const parts = (record.visitorName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
  const middleName = parts.slice(1, -1).join(' ');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      firstName,
      lastName,
      middleName,
      gender: '',
      birthdate: '',
      civilStatus: 'Single',
      contactNumber: record.visitorContactNumber || '',
      permanentAddress: record.visitorAddress || '',
      presentAddress: '',
      memberStatus: 'New Attendee',
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">Promote Visitor to Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 flex flex-col gap-3">
          <p className="text-sm text-gray-700">
            Creates a new <strong>Member</strong> from <strong>{record.visitorName}</strong> and
            back-fills past visitor records with the same name {record.visitorContactNumber ? '+ contact' : ''}.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">First Name *</label>
              <input className="input-field" {...register('firstName', { required: true })} />
              {errors.firstName && <p className="text-xs text-accent-red mt-1">Required</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Middle Name</label>
              <input className="input-field" {...register('middleName')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name *</label>
              <input className="input-field" {...register('lastName', { required: true })} />
              {errors.lastName && <p className="text-xs text-accent-red mt-1">Required</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Gender *</label>
              <select className="input-field" {...register('gender', { required: true })}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && <p className="text-xs text-accent-red mt-1">Required</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Birthdate *</label>
              <input type="date" className="input-field" {...register('birthdate', { required: true })} />
              {errors.birthdate && <p className="text-xs text-accent-red mt-1">Required</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Civil Status</label>
              <select className="input-field" {...register('civilStatus')}>
                <option>Single</option>
                <option>Married</option>
                <option>Widowed</option>
                <option>Separated</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-sm font-medium text-gray-700">Member Status</label>
              <select className="input-field" {...register('memberStatus')}>
                <option>New Attendee</option>
                <option>Regular Attendee</option>
                <option>Member</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-sm font-medium text-gray-700">Contact Number</label>
              <input className="input-field" {...register('contactNumber')} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-sm font-medium text-gray-700">Permanent Address</label>
              <input className="input-field" {...register('permanentAddress')} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-sm font-medium text-gray-700">Present Address</label>
              <input className="input-field" {...register('presentAddress')} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Promoting...' : 'Promote to Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendancePage;
