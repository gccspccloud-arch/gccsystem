import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { announcementService } from '@/services/announcementService';
import { useAuth } from '@/context/AuthContext';

const formatDate = (d) =>
  new Date(d).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const AnnouncementsPage = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasRole('super_admin', 'admin');

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: announcementService.list,
  });

  const items = data?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { isPinned: false },
  });

  const createMutation = useMutation({
    mutationFn: announcementService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setCreating(false);
      reset();
      setError(null);
    },
    onError: (e) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => announcementService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setEditingId(null);
      reset();
      setError(null);
    },
    onError: (e) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: announcementService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const togglePin = (item) =>
    updateMutation.mutate({ id: item._id, payload: { isPinned: !item.isPinned } });

  const onSubmit = (formData) => {
    setError(null);
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setCreating(false);
    reset({ title: item.title, body: item.body, isPinned: item.isPinned });
  };

  const handleDelete = (item) => {
    if (window.confirm(`Delete announcement "${item.title}"?`)) {
      deleteMutation.mutate(item._id);
    }
  };

  const showForm = creating || editingId;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center justify-center px-4 py-4">
        <img src="/logo.jpg" alt="Gospel Coalition Church" className="max-h-56 sm:max-h-64 w-auto object-contain" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-primary-700">📢 Announcements</h2>
          <p className="text-sm text-gray-500">
            Latest updates and announcements from Gospel Coalition Church.
          </p>
        </div>
        {canManage && !showForm && (
          <button className="btn-primary" onClick={() => { setCreating(true); reset({ isPinned: false }); }}>
            + New Announcement
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-5">
          <h3 className="text-lg font-semibold text-primary-700 mb-3">
            {editingId ? 'Edit Announcement' : 'Post New Announcement'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input
                className="input-field"
                placeholder="e.g. Sunday Service Schedule Update"
                {...register('title', { required: 'Title is required', maxLength: 200 })}
              />
              {errors.title && <p className="text-xs text-accent-red mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Content *</label>
              <textarea
                rows={5}
                className="input-field"
                placeholder="Write your announcement here..."
                {...register('body', { required: 'Content is required', maxLength: 5000 })}
              />
              {errors.body && <p className="text-xs text-accent-red mt-1">{errors.body.message}</p>}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                {...register('isPinned')}
              />
              <span className="text-sm font-medium text-gray-700">📌 Pin to top</span>
            </label>

            {error && (
              <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setCreating(false); setEditingId(null); reset(); setError(null); }}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingId ? 'Save Changes' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Loading announcements...</p>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-2">No announcements yet.</p>
          {canManage && (
            <p className="text-sm text-gray-400">Click "+ New Announcement" to post one.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <article
              key={item._id}
              className={`card transition-all ${item.isPinned ? 'border-l-4 border-l-primary-600 bg-primary-50/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {item.isPinned && (
                    <span className="text-xs font-medium bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                      📌 Pinned
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                </div>
                {canManage && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => togglePin(item)} className="text-xs text-primary-600 hover:underline">
                      {item.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => startEdit(item)} className="text-xs text-primary-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item)} className="text-xs text-accent-red hover:underline">
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.body}</p>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-2">
                <span>By {item.author?.firstName} {item.author?.lastName}</span>
                <span>·</span>
                <span>{formatDate(item.publishedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
