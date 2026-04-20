import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { outreachService } from '@/services/outreachService';
import { useAuth } from '@/context/AuthContext';
import { PeoplePickerSingle, PeoplePickerMulti } from '@/components/PeoplePicker';

const OutreachListPage = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole('super_admin', 'admin');
  const [activeFilter, setActiveFilter] = useState('all'); // all | active | inactive
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['outreaches', activeFilter],
    queryFn: () => outreachService.list({
      active: activeFilter === 'all' ? undefined : (activeFilter === 'active' ? 'true' : 'false'),
    }),
  });
  const items = data?.data || [];

  const createMutation = useMutation({
    mutationFn: outreachService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['outreaches'] }); closeForm(); },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => outreachService.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['outreaches'] }); closeForm(); },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: outreachService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outreaches'] }),
    onError: (e) => alert(e.message),
  });

  const editing = useMemo(() => items.find((o) => o._id === editingId) || null, [editingId, items]);

  const openCreate = () => { setEditingId(null); setError(null); setShowForm(true); };
  const openEdit = (o) => { setEditingId(o._id); setError(null); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setError(null); };
  const handleDelete = (o) => {
    if (window.confirm(`Delete outreach "${o.name}"?`)) deleteMutation.mutate(o._id);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">⛪ Outreach</h1>
          <p className="text-sm text-gray-500">
            Satellite ministry locations with their own attendees and sessions.
          </p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>+ New Outreach</button>
        )}
      </div>

      <div className="card mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 inline-flex">
          {['all', 'active', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium capitalize transition ${
                activeFilter === s ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Loading outreaches...</p>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-1">No outreaches yet.</p>
          {canManage && <p className="text-sm text-gray-400">Click "+ New Outreach" to create one.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((o) => (
            <article key={o._id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{o.name}</h2>
                    {!o.isActive && (
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {[o.barangay, o.city].filter(Boolean).join(', ') || o.address || 'No location set'}
                  </p>
                  {o.teacher?.ref && (
                    <p className="text-xs text-gray-600 mt-1">
                      👨‍🏫 Teacher:{' '}
                      <span className="font-medium text-gray-700">
                        {o.teacher.ref.firstName} {o.teacher.ref.lastName}
                      </span>
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(o)}
                      className="text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-2 py-1 rounded"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(o)}
                      className="text-xs font-medium text-accent-red bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>

              {o.description && (
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">{o.description}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <div className="flex gap-3 text-xs text-gray-600">
                  <span>👥 <strong>{o.attendeeCount}</strong> attendees</span>
                  <span>📅 <strong>{o.sessionCount}</strong> sessions</span>
                </div>
                <Link
                  to={`/outreach/${o._id}`}
                  className="text-sm font-medium text-primary-700 hover:underline"
                >
                  Open →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <OutreachFormModal
          editing={editing}
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
    </div>
  );
};

const OutreachFormModal = ({ editing, error, isPending, onClose, onSubmit }) => {
  const { user } = useAuth();
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: editing
      ? {
          name: editing.name,
          barangay: editing.barangay || '',
          city: editing.city || '',
          address: editing.address || '',
          description: editing.description || '',
          teacher: editing.teacher
            ? { kind: editing.teacher.kind, ref: editing.teacher.ref?._id || editing.teacher.ref }
            : null,
          ministers: (editing.ministers || []).map((mn) => ({
            kind: mn.kind, ref: mn.ref?._id || mn.ref,
          })),
          isActive: editing.isActive,
        }
      : {
          name: '',
          barangay: '',
          city: 'San Pablo City',
          address: '',
          description: '',
          teacher: { kind: 'User', ref: user?.id || user?._id || '' },
          ministers: [],
          isActive: true,
        },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">
            {editing ? 'Edit Outreach' : 'New Outreach'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Brgy. San Roque Outreach"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="text-xs text-accent-red mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Barangay</label>
              <input className="input-field" {...register('barangay')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <input className="input-field" {...register('city')} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Detailed address</label>
              <input className="input-field" placeholder="Street, landmark, etc." {...register('address')} />
            </div>

            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="teacher"
                rules={{ validate: (v) => (v && v.ref ? true : 'Teacher is required') }}
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
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea rows={3} className="input-field" {...register('description')} />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
              <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" {...register('isActive')} />
              Active
            </label>
          </div>

          {error && (
            <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Outreach'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutreachListPage;
