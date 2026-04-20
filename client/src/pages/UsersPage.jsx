import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';

import { userService } from '@/services/userService';
import { memberService } from '@/services/memberService';
import { ROLE_LABELS } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';
import PasswordInput from '@/components/PasswordInput';

const formatDate = (d) => (d ? new Date(d).toLocaleString('en-PH') : '—');

const UsersPage = () => {
  const { user: currentUser, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const memberIdParam = searchParams.get('member') || '';

  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState(null);
  const [resetTarget, setResetTarget] = useState(null); // user object being reset

  // Roles this user is allowed to assign when creating accounts
  const assignableRoles = hasRole('super_admin')
    ? ['super_admin', 'admin', 'staff']
    : ['admin', 'staff'];

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.list,
  });

  // If a member is pre-selected via ?member=, fetch its details
  const { data: memberData } = useQuery({
    queryKey: ['member', memberIdParam],
    queryFn: () => memberService.getById(memberIdParam),
    enabled: !!memberIdParam,
  });
  const preselectedMember = memberData?.data || null;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { role: 'staff' },
  });
  const passwordValue = watch('password');

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (memberIdParam) {
        queryClient.invalidateQueries({ queryKey: ['user-by-member', memberIdParam] });
      }
      setShowCreate(false);
      reset({ role: 'staff' });
      // Clear ?member= so the form doesn't try to add another to the same member
      if (memberIdParam) setSearchParams({});
    },
    onError: (err) => setError(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => userService.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: userService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  // Open the create form automatically when arriving with ?member=
  useEffect(() => {
    if (preselectedMember) {
      setShowCreate(true);
      reset({
        role: 'staff',
        firstName: preselectedMember.firstName || '',
        lastName: preselectedMember.lastName || '',
        email: preselectedMember.email || '',
      });
    }
  }, [preselectedMember, reset]);

  const onCreate = (formData) => {
    setError(null);
    const { confirmPassword, ...payload } = formData;
    if (memberIdParam) payload.member = memberIdParam;
    createMutation.mutate(payload);
  };

  const handleDelete = (user) => {
    if (window.confirm(`Delete user "${user.fullName}"? This cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const users = data?.data || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">System Users</h1>
          <p className="text-sm text-gray-500">
            User accounts are created from a member profile. Admins manage admin/staff; super admins manage everyone.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showCreate && (
        <div className="card mb-5">
          <h3 className="text-lg font-semibold text-primary-700 mb-3">
            {preselectedMember
              ? `Create account for ${preselectedMember.fullName || `${preselectedMember.firstName} ${preselectedMember.lastName}`}`
              : 'Create User'}
          </h3>

          {!preselectedMember && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              💡 Tip: Tie a user account to a specific member by going to that member's profile and clicking
              <span className="font-semibold"> "Add User Account"</span>.
            </p>
          )}

          {preselectedMember && (
            <div className="mb-3 text-xs bg-primary-50 border border-primary-100 text-primary-700 rounded-lg px-3 py-2 flex items-center justify-between">
              <span>Linking to member: <span className="font-semibold">{preselectedMember.firstName} {preselectedMember.lastName}</span></span>
              <button
                type="button"
                className="text-primary-600 hover:underline"
                onClick={() => { setSearchParams({}); reset({ role: 'staff' }); }}
              >
                Unlink
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">First Name *</label>
              <input className="input-field" {...register('firstName', { required: 'Required' })} />
              {errors.firstName && <p className="text-xs text-accent-red">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name *</label>
              <input className="input-field" {...register('lastName', { required: 'Required' })} />
              {errors.lastName && <p className="text-xs text-accent-red">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email *</label>
              <input type="email" className="input-field" {...register('email', { required: 'Required' })} />
              {errors.email && <p className="text-xs text-accent-red">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password *</label>
              <PasswordInput
                placeholder="At least 8 characters"
                {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
              />
              {errors.password && <p className="text-xs text-accent-red">{errors.password.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <select className="input-field bg-white" {...register('role')}>
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password *</label>
              <PasswordInput
                placeholder="Re-type password"
                {...register('confirmPassword', {
                  required: 'Please confirm the password',
                  validate: (v) => v === passwordValue || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && <p className="text-xs text-accent-red">{errors.confirmPassword.message}</p>}
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] text-gray-500">
                <span className="font-semibold">Admin</span> can manage everything except other admins/super admins.
                <span className="font-semibold"> Staff</span> can only schedule meetings.
              </p>
            </div>
            {error && (
              <div className="md:col-span-2 text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-center text-gray-500 text-sm">Loading...</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-center text-gray-500 text-sm">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Linked Member</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Last Login</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const canManageThis =
                    !isSelf && (currentUser?.role === 'super_admin' || u.role !== 'super_admin');
                  return (
                    <tr key={u.id} className="hover:bg-primary-50/30">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.fullName} {isSelf && <span className="text-xs text-primary-600">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-primary-100 text-primary-700 px-2 py-1 rounded">
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {u.member?.id ? (
                          <Link to={`/members/${u.member.id}`} className="text-primary-600 hover:underline">
                            {u.member.fullName || `${u.member.firstName} ${u.member.lastName}`}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.lastLoginAt)}</td>
                      <td className="px-4 py-3 flex gap-2">
                        {canManageThis && (
                          <>
                            <button
                              className="text-xs text-primary-600 hover:underline"
                              onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              className="text-xs text-amber-700 hover:underline"
                              onClick={() => setResetTarget(u)}
                            >
                              Reset Password
                            </button>
                            <button
                              className="text-xs text-accent-red hover:underline"
                              onClick={() => handleDelete(u)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetTarget && (
        <ResetPasswordModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
};

/* ─── Reset password modal ─────────────────────────────────────────────── */

const ResetPasswordModal = ({ target, onClose }) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [doneWith, setDoneWith] = useState(null); // { password } once successful
  const [revealDone, setRevealDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { password: '', confirmPassword: '' },
  });
  const passwordValue = watch('password');

  const mutation = useMutation({
    mutationFn: ({ password }) => userService.update(target.id, { password }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDoneWith({ password: vars.password });
    },
    onError: (e) => setError(e.message),
  });

  const submit = (form) => {
    setError(null);
    mutation.mutate({ password: form.password });
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(doneWith.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary-700">Reset Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 mb-3">
            Setting a new password for <span className="font-semibold text-gray-800">{target.fullName}</span>
            <span className="text-gray-400"> ({target.email})</span>.
          </p>

          {!doneWith ? (
            <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">New password *</label>
                <PasswordInput
                  placeholder="At least 8 characters"
                  autoFocus
                  {...register('password', {
                    required: 'Required',
                    minLength: { value: 8, message: 'Min 8 chars' },
                  })}
                />
                {errors.password && <p className="text-xs text-accent-red">{errors.password.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Confirm new password *</label>
                <PasswordInput
                  placeholder="Re-type password"
                  {...register('confirmPassword', {
                    required: 'Please confirm the password',
                    validate: (v) => v === passwordValue || 'Passwords do not match',
                  })}
                />
                {errors.confirmPassword && <p className="text-xs text-accent-red">{errors.confirmPassword.message}</p>}
              </div>

              <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded p-2">
                💡 Passwords are stored as one-way hashes — even the system can't read the old one.
                After saving, share the new password with the user and ask them to change it on next login.
              </p>

              {error && (
                <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={mutation.isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : 'Reset Password'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-800">
                ✓ Password updated. Share this with the user — it won't be shown again after you close this dialog.
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">New password</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm break-all">
                    {revealDone ? doneWith.password : '•'.repeat(Math.max(8, doneWith.password.length))}
                  </code>
                  <button
                    type="button"
                    onClick={() => setRevealDone((v) => !v)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {revealDone ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
