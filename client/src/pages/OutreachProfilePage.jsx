import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  outreachService,
  outreachAttendeeService,
  outreachSessionService,
} from '@/services/outreachService';
import { useAuth } from '@/context/AuthContext';
import { PeoplePickerSingle, PeoplePickerMulti } from '@/components/PeoplePicker';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const OutreachProfilePage = () => {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canManage = hasRole('super_admin', 'admin');
  const [tab, setTab] = useState('roster'); // roster | sessions

  const { data: outreachData, isLoading } = useQuery({
    queryKey: ['outreach', id],
    queryFn: () => outreachService.get(id),
  });
  const outreach = outreachData?.data;

  if (isLoading) return <p className="text-center text-gray-500 py-8">Loading outreach...</p>;
  if (!outreach) return <p className="text-center text-accent-red py-8">Outreach not found.</p>;

  return (
    <div className="max-w-6xl mx-auto">
      <Link to="/outreach" className="text-sm text-primary-600 hover:underline">← Back to Outreaches</Link>

      <div className="card my-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-primary-700">⛪ {outreach.name}</h1>
              {!outreach.isActive && (
                <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">inactive</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              📍 {[outreach.barangay, outreach.city].filter(Boolean).join(', ') || outreach.address || 'No location set'}
            </p>
            {outreach.address && (
              <p className="text-xs text-gray-500 mt-0.5">{outreach.address}</p>
            )}
            {outreach.teacher?.ref && (
              <p className="text-sm text-gray-700 mt-2">
                👨‍🏫 <strong>Teacher:</strong> {outreach.teacher.ref.firstName} {outreach.teacher.ref.lastName}
              </p>
            )}
            {outreach.ministers?.length > 0 && (
              <p className="text-sm text-gray-700 mt-1 flex flex-wrap items-center gap-1">
                <span className="font-medium">⛪ Ministers:</span>
                {outreach.ministers.map((mn, i) => (
                  mn.ref && (
                    <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px]">
                      <span className={`text-[9px] px-1 rounded ${mn.kind === 'User' ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'}`}>{mn.kind}</span>
                      {mn.ref.firstName} {mn.ref.lastName}
                    </span>
                  )
                ))}
              </p>
            )}
            {outreach.description && (
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{outreach.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 inline-flex">
        {[
          { k: 'roster', label: '👥 Roster' },
          { k: 'sessions', label: '📅 Sessions' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`text-sm px-3 py-1.5 rounded-md font-medium transition ${
              tab === t.k ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roster' ? (
        <RosterTab outreachId={id} canManage={canManage} />
      ) : (
        <SessionsTab outreach={outreach} canManage={canManage} />
      )}
    </div>
  );
};

/* ─── Roster tab ───────────────────────────────────────────────────────── */

const RosterTab = ({ outreachId, canManage }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['outreach-attendees', outreachId, search],
    queryFn: () => outreachAttendeeService.list({ outreach: outreachId, search: search || undefined }),
  });
  const attendees = data?.data || [];

  const createMutation = useMutation({
    mutationFn: outreachAttendeeService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['outreach-attendees', outreachId] }); closeForm(); },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => outreachAttendeeService.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['outreach-attendees', outreachId] }); closeForm(); },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: outreachAttendeeService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outreach-attendees', outreachId] }),
    onError: (e) => alert(e.message),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setError(null); };
  const openCreate = () => { setEditing(null); setError(null); setShowForm(true); };
  const openEdit = (a) => { setEditing(a); setError(null); setShowForm(true); };
  const handleDelete = (a) => {
    if (window.confirm(`Remove ${a.firstName} ${a.lastName} from the roster?`)) deleteMutation.mutate(a._id);
  };

  return (
    <>
      <div className="card mb-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input-field flex-1"
          placeholder="🔎 Search by name, contact, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canManage && (
          <button className="btn-primary whitespace-nowrap" onClick={openCreate}>+ Add Attendee</button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Loading roster...</p>
      ) : attendees.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No attendees yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Gender</th>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Address</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendees.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/outreach/${outreachId}/attendees/${a._id}`} className="font-medium text-primary-700 hover:underline">
                      {a.lastName}, {a.firstName} {a.middleName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{a.gender || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{a.contactNumber || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{a.address || '—'}</td>
                  <td className="px-3 py-2">
                    {a.promotedToMember ? (
                      <span className="text-[10px] font-medium bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                        Promoted → Member
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Outreach Attendee
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {canManage && (
                      <>
                        <button className="text-xs text-primary-600 hover:underline mr-2" onClick={() => openEdit(a)}>Edit</button>
                        <button className="text-xs text-accent-red hover:underline" onClick={() => handleDelete(a)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AttendeeFormModal
          outreachId={outreachId}
          editing={editing}
          error={error}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={closeForm}
          onSubmit={(payload) => {
            setError(null);
            if (editing) updateMutation.mutate({ id: editing._id, payload });
            else createMutation.mutate({ ...payload, outreach: outreachId });
          }}
        />
      )}
    </>
  );
};

const AttendeeFormModal = ({ editing, error, isPending, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: editing
      ? {
          lastName: editing.lastName,
          firstName: editing.firstName,
          middleName: editing.middleName || '',
          gender: editing.gender || '',
          birthdate: editing.birthdate ? new Date(editing.birthdate).toISOString().slice(0, 10) : '',
          contactNumber: editing.contactNumber || '',
          address: editing.address || '',
          notes: editing.notes || '',
        }
      : {
          lastName: '', firstName: '', middleName: '',
          gender: '', birthdate: '', contactNumber: '', address: '', notes: '',
        },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">
            {editing ? 'Edit Attendee' : 'Add Attendee'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name *</label>
              <input className="input-field" {...register('lastName', { required: 'Last name is required' })} />
              {errors.lastName && <p className="text-xs text-accent-red mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">First Name *</label>
              <input className="input-field" {...register('firstName', { required: 'First name is required' })} />
              {errors.firstName && <p className="text-xs text-accent-red mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Middle Name</label>
              <input className="input-field" {...register('middleName')} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Gender</label>
              <select className="input-field" {...register('gender')}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Birthdate</label>
              <input type="date" className="input-field" {...register('birthdate')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Contact Number</label>
              <input className="input-field" placeholder="09XX XXX XXXX" {...register('contactNumber')} />
            </div>

            <div className="sm:col-span-3">
              <label className="text-sm font-medium text-gray-700">Address</label>
              <input className="input-field" {...register('address')} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea rows={2} className="input-field" {...register('notes')} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Attendee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Sessions tab ─────────────────────────────────────────────────────── */

const SessionsTab = ({ outreach, canManage }) => {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['outreach-sessions', outreach._id, scope],
    queryFn: () => outreachSessionService.list({
      outreach: outreach._id,
      scope: scope === 'all' ? undefined : scope,
    }),
  });
  const sessions = data?.data || [];

  const createMutation = useMutation({
    mutationFn: outreachSessionService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['outreach-sessions', outreach._id] }); closeForm(); },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => outreachSessionService.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['outreach-sessions', outreach._id] }); closeForm(); },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: outreachSessionService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outreach-sessions', outreach._id] }),
    onError: (e) => alert(e.message),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setError(null); };
  const handleDelete = (s) => {
    if (window.confirm(`Delete session "${s.title}"?`)) deleteMutation.mutate(s._id);
  };

  return (
    <>
      <div className="card mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditing(null); setError(null); setShowForm(true); }}>
            + Schedule Session
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No sessions yet.</p></div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <article key={s._id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{s.title}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    📅 {formatDateTime(s.scheduledAt)}
                    {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                  </p>
                  {s.location && <p className="text-xs text-gray-600 mt-1">📍 {s.location}</p>}
                  {s.teacher?.ref && (
                    <p className="text-xs text-gray-600 mt-1">
                      👨‍🏫 {s.teacher.ref.firstName} {s.teacher.ref.lastName}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditing(s); setError(null); setShowForm(true); }}
                      className="text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-2 py-1 rounded"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-xs font-medium text-accent-red bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {s.agenda && (
                <div className="bg-gray-50 rounded-lg p-3 mb-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Agenda / Topic</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.agenda}</p>
                </div>
              )}

              <Link
                to={`/attendance/outreachSession/${s._id}`}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
              >
                <span className="text-xl">📋</span>
                Take Attendance
              </Link>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <SessionFormModal
          outreach={outreach}
          editing={editing}
          error={error}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={closeForm}
          onSubmit={(payload) => {
            setError(null);
            if (editing) updateMutation.mutate({ id: editing._id, payload });
            else createMutation.mutate({ ...payload, outreach: outreach._id });
          }}
        />
      )}
    </>
  );
};

const SessionFormModal = ({ outreach, editing, error, isPending, onClose, onSubmit }) => {
  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  defaultStart.setHours(defaultStart.getHours() + 1);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: editing
      ? {
          title: editing.title,
          teacher: editing.teacher
            ? { kind: editing.teacher.kind, ref: editing.teacher.ref?._id || editing.teacher.ref }
            : null,
          ministers: (editing.ministers || []).map((mn) => ({
            kind: mn.kind, ref: mn.ref?._id || mn.ref,
          })),
          scheduledAt: toLocalInput(editing.scheduledAt),
          durationMinutes: editing.durationMinutes || 60,
          location: editing.location || '',
          agenda: editing.agenda || '',
        }
      : {
          title: `${outreach.name} — ${formatDate(defaultStart)}`,
          teacher: outreach.teacher
            ? { kind: outreach.teacher.kind, ref: outreach.teacher.ref?._id || outreach.teacher.ref }
            : null,
          ministers: (outreach.ministers || []).map((mn) => ({
            kind: mn.kind, ref: mn.ref?._id || mn.ref,
          })),
          scheduledAt: toLocalInput(defaultStart),
          durationMinutes: 60,
          location: outreach.address || '',
          agenda: '',
        },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">
            {editing ? 'Edit Session' : 'Schedule Session'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input className="input-field" {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-xs text-accent-red mt-1">{errors.title.message}</p>}
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
              <label className="text-sm font-medium text-gray-700">Duration (min)</label>
              <input type="number" min="0" max="1440" className="input-field" {...register('durationMinutes')} />
            </div>

            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="teacher"
                render={({ field }) => (
                  <PeoplePickerSingle
                    label="Teacher (defaults to outreach teacher)"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="ministers"
                render={({ field }) => (
                  <PeoplePickerMulti
                    label="Ministers (defaults to outreach ministers)"
                    value={field.value || []}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Location</label>
              <input className="input-field" {...register('location')} />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Agenda / Topic</label>
              <textarea rows={3} className="input-field" {...register('agenda')} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutreachProfilePage;
