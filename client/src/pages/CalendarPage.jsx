import { useState, useMemo } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { eventService, eventTypeService } from '@/services/eventService';
import { meetingService } from '@/services/meetingService';
import { outreachSessionService } from '@/services/outreachService';
import { reportService } from '@/services/reportService';
import { PeoplePickerSingle, PeoplePickerMulti } from '@/components/PeoplePicker';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatTime = (d) =>
  new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

const CalendarPage = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasRole('super_admin', 'admin');

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showTypes, setShowTypes] = useState(false);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const fromISO = gridStart.toISOString();
  const toISO = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate(), 23, 59, 59).toISOString();

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', cursor.getFullYear(), cursor.getMonth()],
    queryFn: () => eventService.list({ from: fromISO, to: toISO }),
  });

  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings', 'calendar', cursor.getFullYear(), cursor.getMonth()],
    queryFn: () => meetingService.list({ from: fromISO, to: toISO }),
  });

  const { data: outreachSessionsData, isLoading: outreachLoading } = useQuery({
    queryKey: ['outreach-sessions', 'calendar', cursor.getFullYear(), cursor.getMonth()],
    queryFn: () => outreachSessionService.list({ from: fromISO, to: toISO }),
  });

  const { data: celebrantsData } = useQuery({
    queryKey: ['celebrants', cursor.getFullYear(), cursor.getMonth()],
    queryFn: () => reportService.celebrants({ from: fromISO, to: toISO }),
  });

  const events = eventsData?.data || [];
  const meetings = meetingsData?.data || [];
  const outreachSessions = outreachSessionsData?.data || [];
  const celebrants = celebrantsData?.data?.items || [];

  const items = useMemo(() => {
    const e = events.map((x) => ({
      kind: 'event',
      _id: x._id,
      title: x.title,
      type: x.eventType?.name || 'Event',
      startDate: x.scheduledAt,
      durationMinutes: x.durationMinutes,
      locationType: x.locationType,
      location: x.location,
      link: x.link,
      teacher: x.teacher,
      ministers: x.ministers,
      agenda: x.agenda,
      raw: x,
    }));
    const m = meetings.map((x) => ({
      kind: 'meeting',
      _id: x._id,
      title: x.title,
      type: x.meetingType?.name || 'Meeting',
      startDate: x.scheduledAt,
      durationMinutes: x.durationMinutes,
      locationType: x.locationType,
      location: x.location,
      link: x.link,
      teacher: x.teacher,
      ministers: x.ministers,
      agenda: x.agenda,
    }));
    const o = outreachSessions.map((x) => ({
      kind: 'outreachSession',
      _id: x._id,
      title: x.title,
      type: x.outreach?.name || 'Outreach',
      startDate: x.scheduledAt,
      durationMinutes: x.durationMinutes,
      locationType: 'Onsite',
      location: x.location
        || [x.outreach?.barangay, x.outreach?.city].filter(Boolean).join(', '),
      link: '',
      teacher: x.teacher,
      ministers: x.ministers,
      agenda: x.agenda,
      outreachId: x.outreach?._id || x.outreach,
    }));
    return [...e, ...m, ...o];
  }, [events, meetings, outreachSessions]);

  const eventsByDay = useMemo(() => {
    const map = {};
    items.forEach((e) => {
      const d = new Date(e.startDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [items]);

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const selectedItems = (eventsByDay[dayKey(selectedDate)] || []).sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate),
  );

  const celebrantsByDay = useMemo(() => {
    const map = {};
    celebrants.forEach((c) => {
      const d = new Date(c.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [celebrants]);
  const selectedCelebrants = celebrantsByDay[dayKey(selectedDate)] || [];

  const days = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const deleteMutation = useMutation({
    mutationFn: eventService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const startCreate = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const startEdit = (eventRaw) => {
    setEditingEvent(eventRaw);
    setShowForm(true);
  };

  const handleDelete = (e) => {
    if (window.confirm(`Delete event "${e.title}"?`)) deleteMutation.mutate(e._id);
  };

  const today = new Date();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">📅 Calendar</h1>
          <p className="text-sm text-gray-500">
            Larger church gatherings — services, conferences, outreaches. Smaller group meetings appear here too.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowTypes(true)}>Manage Types</button>
            <button className="btn-primary" onClick={startCreate}>+ New Event</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <button
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              ← Prev
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800">
                {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
              </h2>
              <button
                className="text-xs text-primary-600 hover:underline"
                onClick={() => { setCursor(startOfMonth(new Date())); setSelectedDate(new Date()); }}
              >
                Today
              </button>
            </div>
            <button
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              Next →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-gray-50 text-center text-xs font-semibold text-gray-500 py-2">
                {w}
              </div>
            ))}
            {days.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = isSameDay(d, today);
              const isSelected = isSameDay(d, selectedDate);
              const dayItems = eventsByDay[dayKey(d)] || [];
              const dayCelebrants = celebrantsByDay[dayKey(d)] || [];
              const hasBirthday = dayCelebrants.some((c) => c.type === 'birthday');
              const hasAnniversary = dayCelebrants.some((c) => c.type === 'anniversary');
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(new Date(d))}
                  className={`bg-white min-h-[80px] sm:min-h-[96px] p-1.5 text-left transition-colors hover:bg-primary-50/40 ${
                    inMonth ? '' : 'bg-gray-50/60 text-gray-400'
                  } ${isSelected ? 'ring-2 ring-inset ring-primary-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday ? 'bg-primary-600 text-white' : inMonth ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasBirthday && <span className="text-[10px]" title="Birthday">🎂</span>}
                      {hasAnniversary && <span className="text-[10px]" title="Anniversary">💒</span>}
                      {dayItems.length > 0 && (
                        <span className="text-[10px] text-gray-400">{dayItems.length}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayItems.slice(0, 2).map((e) => {
                      const dot =
                        e.kind === 'meeting' ? 'bg-amber-500'
                        : e.kind === 'outreachSession' ? 'bg-purple-500'
                        : 'bg-primary-600';
                      const tipPrefix =
                        e.kind === 'meeting' ? '🗓️ Meeting: '
                        : e.kind === 'outreachSession' ? '🫶 Outreach: '
                        : '📅 Event: ';
                      return (
                        <div
                          key={`${e.kind}-${e._id}`}
                          className="flex items-center gap-1 text-[10px] truncate"
                          title={`${tipPrefix}${e.title}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                          <span className="truncate text-gray-700">{e.title}</span>
                        </div>
                      );
                    })}
                    {dayItems.length > 2 && (
                      <span className="text-[10px] text-gray-400">+{dayItems.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {(isLoading || meetingsLoading || outreachLoading) && <p className="text-xs text-gray-400 mt-2">Loading...</p>}
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            {selectedDate.toLocaleDateString('en-PH', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })}
          </h3>
          {selectedCelebrants.length > 0 && (
            <div className="mb-3 p-3 bg-pink-50 border border-pink-100 rounded-md">
              <p className="text-xs font-semibold text-pink-700 mb-1">Celebrants 🎉</p>
              <ul className="space-y-1">
                {selectedCelebrants.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span>{c.type === 'birthday' ? '🎂' : '💒'}</span>
                    <Link to={`/members/${c.member._id}`} className="hover:text-primary-600">
                      <strong>{c.member.firstName} {c.member.lastName}</strong>{' '}
                      {c.type === 'birthday' ? `— turning ${c.age}` : `— ${c.years} yr${c.years === 1 ? '' : 's'}${c.spouse ? ` with ${c.spouse}` : ''}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedItems.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing scheduled.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedItems.map((e) => {
                const isMeeting = e.kind === 'meeting';
                const isOutreach = e.kind === 'outreachSession';
                const accent = isMeeting
                  ? 'bg-amber-50 border-amber-400 text-amber-900'
                  : isOutreach
                    ? 'bg-purple-50 border-purple-500 text-purple-900'
                    : 'bg-primary-50 border-primary-500 text-primary-900';
                const kindLabel = isMeeting ? '🗓️ Meeting · ' : isOutreach ? '🫶 Outreach · ' : '📅 Event · ';
                const attendanceKind = isMeeting ? 'meeting' : isOutreach ? 'outreachSession' : 'event';
                return (
                  <div key={`${e.kind}-${e._id}`} className={`border-l-4 rounded-md p-3 ${accent}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{e.title}</p>
                        <p className="text-[11px] opacity-75">
                          {kindLabel}{e.type}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 items-center">
                        {isMeeting ? (
                          <Link
                            to="/meetings"
                            className="text-xs font-medium bg-white/70 hover:bg-white border border-current px-2 py-1 rounded-md"
                          >
                            Open →
                          </Link>
                        ) : isOutreach ? (
                          <Link
                            to={e.outreachId ? `/outreach/${e.outreachId}` : '/outreach'}
                            className="text-xs font-medium bg-white/70 hover:bg-white border border-current px-2 py-1 rounded-md"
                          >
                            Open →
                          </Link>
                        ) : canManage && (
                          <>
                            <button
                              onClick={() => startEdit(e.raw)}
                              className="text-xs font-medium text-primary-700 bg-white hover:bg-primary-50 border border-primary-200 px-2 py-1 rounded-md"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(e)}
                              className="text-xs font-medium text-accent-red bg-white hover:bg-red-50 border border-red-200 px-2 py-1 rounded-md"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs mt-1 opacity-90">
                      {formatTime(e.startDate)}
                      {e.durationMinutes ? ` · ${e.durationMinutes} min` : ''}
                    </div>
                    {e.locationType === 'Online' ? (
                      <p className="text-xs mt-1">💻 Online{e.link ? ` · 🔗 ${e.link}` : ''}</p>
                    ) : (
                      <p className="text-xs mt-1">🏛️ Onsite{e.location ? ` · 📍 ${e.location}` : ''}</p>
                    )}
                    {e.teacher?.ref && (
                      <p className="text-xs mt-1">👨‍🏫 Teacher: {e.teacher.ref.firstName} {e.teacher.ref.lastName}</p>
                    )}
                    {e.ministers && e.ministers.length > 0 && (
                      <p className="text-xs mt-1 flex flex-wrap items-center gap-1">
                        <span>⛪ Ministers:</span>
                        {e.ministers.map((mn, i) => (
                          mn.ref && (
                            <span key={i} className="inline-flex items-center gap-1 bg-white/60 px-1.5 py-0.5 rounded text-[10px]">
                              <span className={`text-[9px] px-1 rounded ${mn.kind === 'User' ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'}`}>
                                {mn.kind}
                              </span>
                              {mn.ref.firstName} {mn.ref.lastName}
                            </span>
                          )
                        ))}
                      </p>
                    )}
                    {e.agenda && (
                      <p className="text-xs mt-1 whitespace-pre-wrap opacity-90">{e.agenda}</p>
                    )}
                    <Link
                      to={`/attendance/${attendanceKind}/${e._id}`}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-colors"
                    >
                      <span className="text-lg">📋</span>
                      Take Attendance
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <EventFormModal
          editing={editingEvent}
          defaultDate={selectedDate}
          onClose={() => { setShowForm(false); setEditingEvent(null); }}
        />
      )}

      {showTypes && (
        <ManageEventTypesModal onClose={() => setShowTypes(false)} />
      )}
    </div>
  );
};

/* ─── Event form modal (mirrors Meeting form) ──────────────────────────── */

const EventFormModal = ({ editing, defaultDate, onClose }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState(null);

  const { data: typesData } = useQuery({
    queryKey: ['event-types', 'active'],
    queryFn: () => eventTypeService.list(),
  });
  const types = typesData?.data || [];

  const defaultStart = useMemo(() => {
    const d = new Date(defaultDate || new Date());
    d.setHours(9, 0, 0, 0);
    return d;
  }, [defaultDate]);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: editing
      ? {
          title: editing.title,
          eventType: editing.eventType?._id || '',
          teacher: editing.teacher
            ? { kind: editing.teacher.kind, ref: editing.teacher.ref?._id || editing.teacher.ref }
            : null,
          ministers: (editing.ministers || []).map((mn) => ({
            kind: mn.kind,
            ref: mn.ref?._id || mn.ref,
          })),
          scheduledAt: toLocalInput(editing.scheduledAt),
          durationMinutes: editing.durationMinutes,
          locationType: editing.locationType || 'Onsite',
          location: editing.location || '',
          link: editing.link || '',
          agenda: editing.agenda || '',
        }
      : {
          title: '',
          eventType: types[0]?._id || '',
          teacher: { kind: 'User', ref: user?.id || user?._id || '' },
          ministers: [],
          scheduledAt: toLocalInput(defaultStart),
          durationMinutes: 60,
          locationType: 'Onsite',
          location: '',
          link: '',
          agenda: '',
        },
  });

  const locationType = useWatch({ control, name: 'locationType' });

  const createMutation = useMutation({
    mutationFn: eventService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); onClose(); },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => eventService.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); onClose(); },
    onError: (e) => setError(e.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const submit = (form) => {
    setError(null);
    const payload = {
      ...form,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      location: form.locationType === 'Onsite' ? form.location : '',
      link: form.locationType === 'Online' ? form.link : '',
    };
    if (editing) updateMutation.mutate({ id: editing._id, payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">
            {editing ? 'Edit Event' : 'New Event'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input
                className="input-field"
                placeholder="e.g. Sunday Worship Service"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && <p className="text-xs text-accent-red mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Type *</label>
              <select
                className="input-field"
                {...register('eventType', { required: 'Type is required' })}
              >
                <option value="">Select type...</option>
                {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              {errors.eventType && <p className="text-xs text-accent-red mt-1">{errors.eventType.message}</p>}
            </div>

            <div>
              <Controller
                control={control}
                name="teacher"
                rules={{
                  validate: (v) => (v && v.ref ? true : 'Teacher is required'),
                }}
                render={({ field }) => (
                  <PeoplePickerSingle
                    label="Teacher"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.teacher?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date &amp; Time *</label>
              <input
                type="datetime-local"
                className="input-field"
                {...register('scheduledAt', { required: 'Date is required' })}
              />
              {errors.scheduledAt && <p className="text-xs text-accent-red mt-1">{errors.scheduledAt.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Duration (minutes)</label>
              <input
                type="number"
                min="0"
                max="1440"
                className="input-field"
                {...register('durationMinutes')}
              />
            </div>

            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="ministers"
                render={({ field }) => (
                  <PeoplePickerMulti
                    label="Ministers (optional)"
                    value={field.value || []}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Location *</label>
              <div className="flex gap-2 mb-2">
                {['Onsite', 'Online'].map((opt) => (
                  <label
                    key={opt}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition ${
                      locationType === opt
                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt}
                      className="hidden"
                      {...register('locationType', { required: 'Location type is required' })}
                    />
                    <span>{opt === 'Onsite' ? '🏛️ Onsite' : '💻 Online'}</span>
                  </label>
                ))}
              </div>
              {locationType === 'Onsite' ? (
                <>
                  <input
                    className="input-field"
                    placeholder="Exact location (e.g. Main Sanctuary)"
                    {...register('location', {
                      validate: (v) => (locationType === 'Onsite' && !v?.trim() ? 'Exact location is required' : true),
                    })}
                  />
                  {errors.location && <p className="text-xs text-accent-red mt-1">{errors.location.message}</p>}
                </>
              ) : (
                <input
                  type="url"
                  className="input-field"
                  placeholder="🔗 Streaming/meeting link"
                  {...register('link')}
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Agenda / Topic / Verses</label>
              <textarea
                rows={4}
                className="input-field"
                placeholder="e.g. Theme, Scripture passage, program flow..."
                {...register('agenda')}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Manage event types modal ─────────────────────────────────────────── */

const ManageEventTypesModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['event-types', 'all'],
    queryFn: () => eventTypeService.list({ includeInactive: true }),
  });
  const types = data?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', description: '', isActive: true },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['event-types'] });

  const createMutation = useMutation({
    mutationFn: eventTypeService.create,
    onSuccess: () => { invalidate(); reset({ name: '', description: '', isActive: true }); setError(null); },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => eventTypeService.update(id, payload),
    onSuccess: () => { invalidate(); setEditing(null); reset({ name: '', description: '', isActive: true }); setError(null); },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: eventTypeService.remove,
    onSuccess: invalidate,
    onError: (e) => setError(e.message),
  });

  const startEdit = (t) => {
    setEditing(t);
    reset({ name: t.name, description: t.description || '', isActive: t.isActive });
    setError(null);
  };
  const cancelEdit = () => {
    setEditing(null);
    reset({ name: '', description: '', isActive: true });
    setError(null);
  };
  const submit = (form) => {
    setError(null);
    if (editing) updateMutation.mutate({ id: editing._id, payload: form });
    else createMutation.mutate(form);
  };
  const handleDelete = (t) => {
    if (window.confirm(`Delete event type "${t.name}"?`)) deleteMutation.mutate(t._id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">Manage Event Types</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <form onSubmit={handleSubmit(submit)} className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {editing ? `Editing: ${editing.name}` : 'Add new type'}
            </p>
            <input
              className="input-field"
              placeholder="Type name (e.g. Conference)"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-xs text-accent-red">{errors.name.message}</p>}
            <input
              className="input-field"
              placeholder="Short description (optional)"
              {...register('description')}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" {...register('isActive')} />
              Active
            </label>
            {error && <p className="text-xs text-accent-red bg-red-50 px-2 py-1 rounded">{error}</p>}
            <div className="flex gap-2 justify-end">
              {editing && (
                <button type="button" className="btn-secondary text-xs" onClick={cancelEdit} disabled={isPending}>
                  Cancel edit
                </button>
              )}
              <button type="submit" className="btn-primary text-xs" disabled={isPending}>
                {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Type'}
              </button>
            </div>
          </form>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Existing types</p>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : types.length === 0 ? (
              <p className="text-sm text-gray-500">No types yet — add one above.</p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {types.map((t) => (
                  <li key={t._id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {t.name}{' '}
                        {!t.isActive && (
                          <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-1">
                            inactive
                          </span>
                        )}
                      </p>
                      {t.description && <p className="text-xs text-gray-500 truncate">{t.description}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(t)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(t)} className="text-xs text-accent-red hover:underline">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
