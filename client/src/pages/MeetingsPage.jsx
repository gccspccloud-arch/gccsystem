import { useState, useMemo } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { meetingService, meetingTypeService } from '@/services/meetingService';
import { useAuth } from '@/context/AuthContext';
import { PeoplePickerSingle, PeoplePickerMulti } from '@/components/PeoplePicker';

const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MeetingsPage = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canManageTypes = hasRole('super_admin', 'admin');
  const [scope, setScope] = useState('upcoming'); // upcoming | past | all
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showTypes, setShowTypes] = useState(false);
  const [error, setError] = useState(null);

  const { data: typesData } = useQuery({
    queryKey: ['meeting-types', 'active'],
    queryFn: () => meetingTypeService.list(),
  });
  const types = typesData?.data || [];

  const { data: meetingsData, isLoading } = useQuery({
    queryKey: ['meetings', scope, typeFilter],
    queryFn: () => meetingService.list({
      scope: scope === 'all' ? undefined : scope,
      type: typeFilter || undefined,
    }),
  });
  const meetings = meetingsData?.data || [];

  const createMutation = useMutation({
    mutationFn: meetingService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      closeForm();
    },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => meetingService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      closeForm();
    },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: meetingService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const openCreate = () => {
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (m) => {
    setEditingId(m._id);
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleDelete = (m) => {
    if (window.confirm(`Delete meeting "${m.title}"?`)) deleteMutation.mutate(m._id);
  };

  const editingMeeting = useMemo(
    () => meetings.find((m) => m._id === editingId) || null,
    [editingId, meetings],
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">🗓️ Meetings</h1>
          <p className="text-sm text-gray-500">
            Schedule discipleship, affinity, lighthouse, outreach, and other group meetings.
          </p>
        </div>
        <div className="flex gap-2">
          {canManageTypes && (
            <button className="btn-secondary" onClick={() => setShowTypes(true)}>Manage Types</button>
          )}
          <button className="btn-primary" onClick={openCreate}>+ Schedule Meeting</button>
        </div>
      </div>

      <div className="card mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['upcoming', 'past', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium capitalize transition ${
                scope === s ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <select
            className="input-field"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Loading meetings...</p>
      ) : meetings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-1">No meetings found.</p>
          <p className="text-sm text-gray-400">Click "+ Schedule Meeting" to create one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {meetings.map((m) => (
            <article key={m._id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                      {m.meetingType?.name || 'Unknown type'}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{m.title}</h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    📅 {formatDateTime(m.scheduledAt)}
                    {m.durationMinutes ? ` · ${m.durationMinutes} min` : ''}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {m.locationType === 'Online' ? (
                      <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">💻 Online</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">🏛️ Onsite</span>
                        {m.location && <span>📍 {m.location}</span>}
                      </span>
                    )}
                    {m.teacher?.ref && (
                      <span className="text-gray-500">
                        · 👨‍🏫 Teacher: <span className="font-medium text-gray-700">{m.teacher.ref.firstName} {m.teacher.ref.lastName}</span>
                      </span>
                    )}
                  </p>
                  {m.ministers && m.ministers.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-gray-500">⛪ Ministers:</span>
                      {m.ministers.map((mn, i) => (
                        mn.ref && (
                          <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px]">
                            <span className={`text-[9px] px-1 rounded ${mn.kind === 'User' ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'}`}>
                              {mn.kind}
                            </span>
                            {mn.ref.firstName} {mn.ref.lastName}
                          </span>
                        )
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  <button
                    onClick={() => openEdit(m)}
                    className="text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="text-sm font-medium text-accent-red bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {m.link && (
                <p className="text-sm mb-2">
                  🔗 <a href={m.link} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline break-all">{m.link}</a>
                </p>
              )}

              {m.agenda && (
                <div className="bg-gray-50 rounded-lg p-3 mb-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Agenda / Topic</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.agenda}</p>
                </div>
              )}

              <Link
                to={`/attendance/meeting/${m._id}`}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold py-3 sm:py-3.5 rounded-lg text-base sm:text-lg shadow-sm transition-colors"
              >
                <span className="text-xl">📋</span>
                Take Attendance
              </Link>

              <div className="mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                Scheduled by {m.createdBy?.firstName} {m.createdBy?.lastName}
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <MeetingFormModal
          types={types}
          editing={editingMeeting}
          error={error}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={closeForm}
          onSubmit={(payload) => {
            setError(null);
            if (editingId) updateMutation.mutate({ id: editingId, payload });
            else createMutation.mutate(payload);
          }}
        />
      )}

      {showTypes && (
        <ManageTypesModal onClose={() => setShowTypes(false)} />
      )}
    </div>
  );
};

/* ─── Meeting form modal ────────────────────────────────────────────────── */

const MeetingFormModal = ({ types, editing, error, isPending, onClose, onSubmit }) => {
  const { user } = useAuth();
  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  defaultStart.setHours(defaultStart.getHours() + 1);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: editing
      ? {
          title: editing.title,
          meetingType: editing.meetingType?._id || '',
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
          meetingType: types[0]?._id || '',
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

  const submit = (form) => {
    onSubmit({
      ...form,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      // Clear the irrelevant field for clean data
      location: form.locationType === 'Onsite' ? form.location : '',
      link: form.locationType === 'Online' ? form.link : '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">
            {editing ? 'Edit Meeting' : 'Schedule Meeting'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input
                className="input-field"
                placeholder="e.g. Lighthouse Group – Week 4"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && <p className="text-xs text-accent-red mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Type *</label>
              <select
                className="input-field"
                {...register('meetingType', { required: 'Type is required' })}
              >
                <option value="">Select type...</option>
                {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              {errors.meetingType && <p className="text-xs text-accent-red mt-1">{errors.meetingType.message}</p>}
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
                    placeholder="Exact location (e.g. Church Annex, Room 2)"
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
                  placeholder="🔗 Meeting link (Zoom, Google Meet, etc.)"
                  {...register('link')}
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Agenda / Topic / Verses</label>
              <textarea
                rows={4}
                className="input-field"
                placeholder="e.g. John 3:16-21 — Discussion on God's love and the call to follow Christ."
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
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Manage meeting types modal ───────────────────────────────────────── */

const ManageTypesModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // type object or null
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['meeting-types', 'all'],
    queryFn: () => meetingTypeService.list({ includeInactive: true }),
  });
  const types = data?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', description: '', isActive: true },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['meeting-types'] });
  };

  const createMutation = useMutation({
    mutationFn: meetingTypeService.create,
    onSuccess: () => { invalidate(); reset({ name: '', description: '', isActive: true }); setError(null); },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => meetingTypeService.update(id, payload),
    onSuccess: () => { invalidate(); setEditing(null); reset({ name: '', description: '', isActive: true }); setError(null); },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: meetingTypeService.remove,
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
    if (window.confirm(`Delete meeting type "${t.name}"?`)) deleteMutation.mutate(t._id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">Manage Meeting Types</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <form onSubmit={handleSubmit(submit)} className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {editing ? `Editing: ${editing.name}` : 'Add new type'}
            </p>
            <input
              className="input-field"
              placeholder="Type name (e.g. Bible Study)"
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
              Active (uncheck to hide from new meetings)
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

export default MeetingsPage;
