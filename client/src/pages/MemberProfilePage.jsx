import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { memberService } from '@/services/memberService';
import { userService } from '@/services/userService';
import { attendanceService } from '@/services/attendanceService';
import { ldpCategoryService } from '@/services/ldpService';
import { meetingTypeService } from '@/services/meetingService';
import { eventTypeService } from '@/services/eventService';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/utils/constants';
import {
  GENDERS,
  CIVIL_STATUSES,
  EDUCATIONAL_STATUSES,
  EMPLOYMENT_STATUSES,
  MEMBER_STATUSES,
  MEMBER_STATUS_STYLES,
} from '@/utils/constants';
import { calculateAge, getAgeClass, AGE_CLASS_STYLES } from '@/utils/age';
import FormField from '@/components/forms/FormField';
import FormSection from '@/components/forms/FormSection';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' }) : '—');
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const ViewRow = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>
    <span className="text-sm text-gray-800 mt-0.5">{value || '—'}</span>
  </div>
);

const MemberProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole('super_admin', 'admin');
  const canDelete = hasRole('super_admin');

  const [editing, setEditing] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ldp'

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['member', id],
    queryFn: () => memberService.getById(id),
  });

  const member = data?.data;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  useEffect(() => {
    if (member) {
      reset({
        ...member,
        birthdate: toDateInput(member.birthdate),
        dateOfMarriage: toDateInput(member.dateOfMarriage),
        dateBaptized: toDateInput(member.dateBaptized),
        dateJoinedChurch: toDateInput(member.dateJoinedChurch),
      });
    }
  }, [member, reset]);

  const civilStatus = watch('civilStatus');
  const isBaptized = watch('isBaptized');
  const birthdate = watch('birthdate');
  const previewAge = calculateAge(birthdate);
  const previewAgeClass = getAgeClass(previewAge);

  const updateMutation = useMutation({
    mutationFn: (payload) => memberService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setEditing(false);
      setServerError(null);
    },
    onError: (err) => setServerError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => memberService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      navigate('/members');
    },
    onError: (err) => setServerError(err.message),
  });

  const onSubmit = (formData) => {
    setServerError(null);
    const payload = {
      ...formData,
      isBaptized: Boolean(formData.isBaptized),
      dateOfMarriage: civilStatus === 'Married' ? formData.dateOfMarriage || null : null,
      spouse: civilStatus === 'Married' ? formData.spouse || '' : '',
      churchBaptized: formData.isBaptized ? formData.churchBaptized || '' : '',
      dateBaptized: formData.isBaptized ? formData.dateBaptized || null : null,
      dateJoinedChurch: formData.dateJoinedChurch || null,
    };
    updateMutation.mutate(payload);
  };

  const handleDelete = () => {
    if (window.confirm(`Permanently delete ${member.fullName}? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  // Linked user account (only fetched if current viewer is admin/super_admin)
  const { data: linkedUserData } = useQuery({
    queryKey: ['user-by-member', id],
    queryFn: () => userService.getByMember(id),
    enabled: canEdit && !!id,
  });
  const linkedUser = linkedUserData?.data || null;

  // Attendance history
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', 'by-member', id],
    queryFn: () => attendanceService.byMember(id),
    enabled: !!id,
  });
  const attendanceRecords = attendanceData?.data || [];

  if (isLoading) return <div className="text-center text-gray-500 py-8">Loading...</div>;
  if (isError) return <div className="text-center text-accent-red py-8">{queryError.message}</div>;
  if (!member) return null;

  const inputClass = 'input-field';
  const selectClass = 'input-field bg-white';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <Link to="/members" className="text-sm text-primary-600 hover:underline">← Back to Members</Link>
      </div>

      <div className="card mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold">
              {member.firstName?.[0]}{member.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{member.fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs font-medium px-2 py-1 rounded ${MEMBER_STATUS_STYLES[member.memberStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {member.memberStatus}
                </span>
                {member.ageClass && (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${AGE_CLASS_STYLES[member.ageClass]}`}>
                    {member.ageClass} · {member.age}
                  </span>
                )}
                <span className="text-xs text-gray-500">{member.gender}</span>
              </div>
            </div>
          </div>

          {canEdit && !editing && (
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="btn-primary text-sm">Edit Profile</button>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="text-sm text-accent-red border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="card mb-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">User Account</h3>
              {linkedUser ? (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-800">{linkedUser.email}</span>
                  <span className="text-xs font-medium bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                    {ROLE_LABELS[linkedUser.role]}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    linkedUser.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {linkedUser.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  This member has no system account yet.
                </p>
              )}
            </div>
            {linkedUser ? (
              <Link to="/users" className="btn-secondary text-sm">Manage in Users →</Link>
            ) : (
              <Link to={`/users?member=${member._id}`} className="btn-primary text-sm">
                + Add User Account
              </Link>
            )}
          </div>
        </div>
      )}

      {!editing && (
        <div className="mb-5 border-b border-gray-200 flex gap-1">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'ldp',      label: 'Life Development' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {!editing && activeTab === 'ldp' ? (
        <LdpTab memberId={id} canEdit={canEdit} />
      ) : !editing ? (
        <div className="flex flex-col gap-5">
          <FormSection title="Personal Information">
            <ViewRow label="Last Name" value={member.lastName} />
            <ViewRow label="First Name" value={member.firstName} />
            <ViewRow label="Middle Name" value={member.middleName} />
            <ViewRow label="Gender" value={member.gender} />
            <ViewRow label="Birthdate" value={formatDate(member.birthdate)} />
            <ViewRow label="Educational Status" value={member.educationalStatus} />
          </FormSection>

          <FormSection title="Contact Information">
            <ViewRow label="Contact Number" value={member.contactNumber} />
            <ViewRow label="Email Address" value={member.email} />
            <div className="md:col-span-2">
              <ViewRow label="Permanent Address" value={member.permanentAddress} />
            </div>
            <div className="md:col-span-2">
              <ViewRow label="Present Address" value={member.presentAddress} />
            </div>
          </FormSection>

          <FormSection title="Civil & Family Status">
            <ViewRow label="Civil Status" value={member.civilStatus} />
            <ViewRow label="Employment Status" value={member.employmentStatus} />
            {member.civilStatus === 'Married' && (
              <>
                <ViewRow label="Spouse" value={member.spouse} />
                <ViewRow label="Date of Marriage" value={formatDate(member.dateOfMarriage)} />
              </>
            )}
          </FormSection>

          <FormSection title="Spiritual Background">
            <ViewRow label="Baptized" value={member.isBaptized ? 'Yes' : 'No'} />
            <ViewRow label="Date Joined Church" value={formatDate(member.dateJoinedChurch)} />
            {member.isBaptized && (
              <>
                <ViewRow label="Church Baptized" value={member.churchBaptized} />
                <ViewRow label="Date Baptized" value={formatDate(member.dateBaptized)} />
              </>
            )}
          </FormSection>

          <FormSection title="Attendance History" description={`Last ${attendanceRecords.length} record${attendanceRecords.length === 1 ? '' : 's'}.`}>
            <div className="md:col-span-2">
              {attendanceLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : attendanceRecords.length === 0 ? (
                <p className="text-sm text-gray-500">No attendance recorded yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg max-h-72 overflow-y-auto">
                  {attendanceRecords.map((r) => {
                    const targetTitle = r.target?.ref?.title || '(deleted)';
                    const targetWhen = r.target?.ref?.scheduledAt ? formatDate(r.target.ref.scheduledAt) : '';
                    const isMeeting = r.target?.kind === 'Meeting';
                    return (
                      <li key={r._id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {isMeeting ? '🗓️' : '📅'} {targetTitle}
                          </p>
                          <p className="text-[11px] text-gray-500">{targetWhen}</p>
                        </div>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex-shrink-0">
                          ✓ Present
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </FormSection>

          {member.notes && (
            <FormSection title="Notes & Remarks">
              <div className="md:col-span-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{member.notes}</p>
              </div>
            </FormSection>
          )}

          <p className="text-xs text-gray-400 text-right">
            Registered {formatDate(member.createdAt)} · Last updated {formatDate(member.updatedAt)}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FormSection title="Membership Status">
            <div className="md:col-span-2">
              <FormField label="Status" required error={errors.memberStatus}>
                <select className={selectClass} {...register('memberStatus', { required: 'Required' })}>
                  {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Personal Information">
            <FormField label="Last Name" required error={errors.lastName}>
              <input className={inputClass} {...register('lastName', { required: 'Required' })} />
            </FormField>
            <FormField label="First Name" required error={errors.firstName}>
              <input className={inputClass} {...register('firstName', { required: 'Required' })} />
            </FormField>
            <FormField label="Middle Name" error={errors.middleName}>
              <input className={inputClass} {...register('middleName')} />
            </FormField>
            <FormField label="Gender" required error={errors.gender}>
              <select className={selectClass} {...register('gender', { required: 'Required' })}>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>
            <FormField
              label="Birthdate"
              required
              error={errors.birthdate}
              hint={previewAge != null && previewAge >= 0 ? `Age ${previewAge} · ${previewAgeClass}` : null}
            >
              <input type="date" className={inputClass} {...register('birthdate', { required: 'Required' })} />
            </FormField>
            <FormField label="Educational Status" error={errors.educationalStatus}>
              <select className={selectClass} {...register('educationalStatus')}>
                {EDUCATIONAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </FormSection>

          <FormSection title="Contact Information">
            <FormField label="Contact Number" error={errors.contactNumber} hint="9XXXXXXXXX">
              <input className={inputClass} {...register('contactNumber', {
                pattern: { value: /^9\d{9}$/, message: 'Must be 9XXXXXXXXX' },
              })} />
            </FormField>
            <FormField label="Email Address" error={errors.email}>
              <input type="email" className={inputClass} {...register('email', {
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
              })} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Permanent Address" required error={errors.permanentAddress}>
                <input className={inputClass} {...register('permanentAddress', { required: 'Required' })} />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label="Present Address" error={errors.presentAddress}>
                <input className={inputClass} {...register('presentAddress')} />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Civil & Family Status">
            <FormField label="Civil Status" required error={errors.civilStatus}>
              <select className={selectClass} {...register('civilStatus', { required: 'Required' })}>
                {CIVIL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Employment Status" error={errors.employmentStatus}>
              <select className={selectClass} {...register('employmentStatus')}>
                {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            {civilStatus === 'Married' && (
              <>
                <FormField label="Spouse" error={errors.spouse}>
                  <input className={inputClass} {...register('spouse')} />
                </FormField>
                <FormField label="Date of Marriage" error={errors.dateOfMarriage}>
                  <input type="date" className={inputClass} {...register('dateOfMarriage')} />
                </FormField>
              </>
            )}
          </FormSection>

          <FormSection title="Spiritual Background">
            <FormField label="Date Joined Church" error={errors.dateJoinedChurch} hint="When this person started attending GCC">
              <input type="date" className={inputClass} {...register('dateJoinedChurch')} />
            </FormField>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" {...register('isBaptized')} />
                <span className="text-sm font-medium text-gray-700">Already Baptized?</span>
              </label>
            </div>
            {isBaptized && (
              <>
                <FormField label="Church Baptized" error={errors.churchBaptized}>
                  <input className={inputClass} {...register('churchBaptized')} />
                </FormField>
                <FormField label="Date Baptized" error={errors.dateBaptized}>
                  <input type="date" className={inputClass} {...register('dateBaptized')} />
                </FormField>
              </>
            )}
          </FormSection>

          <FormSection title="Notes & Remarks" description="Internal notes for ministry follow-up. Visible to admins only.">
            <div className="md:col-span-2">
              <FormField label="Notes" error={errors.notes}>
                <textarea
                  rows={4}
                  className={inputClass}
                  placeholder="e.g. Joined youth ministry, prayer requests, follow-up needs..."
                  {...register('notes')}
                />
              </FormField>
            </div>
          </FormSection>

          {serverError && (
            <div className="card border-accent-red/30 bg-red-50">
              <p className="text-sm text-accent-red">{serverError}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setEditing(false); setServerError(null); }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

/* ─── Life Development tab ─────────────────────────────────────────────── */

const LdpTab = ({ memberId, canEdit }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({}); // { categoryId: value }
  const [showManage, setShowManage] = useState(false);
  const [serverError, setServerError] = useState(null);

  const { data: memberData, isLoading: memberLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => memberService.getById(memberId),
  });
  const { data: catsData, isLoading: catsLoading } = useQuery({
    queryKey: ['ldp-categories', 'active'],
    queryFn: () => ldpCategoryService.list(),
  });

  const member = memberData?.data;
  const categories = catsData?.data || [];

  // Build a map of categoryId → current saved value from the member.
  const savedMap = {};
  (member?.ldp || []).forEach((entry) => {
    const catId = entry.category?._id || entry.category;
    if (catId) savedMap[String(catId)] = entry.value;
  });

  // Lookup updatedAt/updatedBy for the small subtext.
  const metaMap = {};
  (member?.ldp || []).forEach((entry) => {
    const catId = entry.category?._id || entry.category;
    if (catId) metaMap[String(catId)] = { updatedAt: entry.updatedAt, updatedBy: entry.updatedBy };
  });

  // Initialize/refresh draft when data lands.
  useEffect(() => {
    if (member && categories.length > 0) {
      const next = {};
      categories.forEach((c) => {
        next[String(c._id)] = savedMap[String(c._id)] || '';
      });
      setDraft(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?._id, categories.length]);

  const dirty = categories.some(
    (c) => (draft[String(c._id)] || '') !== (savedMap[String(c._id)] || ''),
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      // Skip auto-managed categories — backend rejects them anyway.
      const statuses = categories
        .filter((c) => c.autoMode !== 'attendance')
        .map((c) => ({ category: c._id, value: draft[String(c._id)] || '' }))
        .filter((s) => s.value);
      return memberService.updateLdp(memberId, statuses);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      setServerError(null);
    },
    onError: (err) => setServerError(err.message),
  });

  const recomputeMutation = useMutation({
    mutationFn: () => memberService.recomputeLdp(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      setServerError(null);
    },
    onError: (err) => setServerError(err.message),
  });

  const hasAuto = categories.some((c) => c.autoMode === 'attendance');

  if (memberLoading || catsLoading) {
    return <div className="text-center text-gray-500 py-8">Loading...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-gray-600 mb-3">No LDP categories defined yet.</p>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowManage(true)}>
            ⚙️ Manage Categories
          </button>
        )}
        {showManage && <ManageLdpCategoriesModal onClose={() => setShowManage(false)} />}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Life Development Progress</h3>
          <p className="text-xs text-gray-500">
            {canEdit
              ? 'Pick a status for each dimension and save.'
              : 'Read-only — only admins can update LDP.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && hasAuto && (
            <button
              className="text-xs font-medium text-primary-700 border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
              onClick={() => recomputeMutation.mutate()}
              disabled={recomputeMutation.isPending}
              title="Recompute auto categories from this member's attendance"
            >
              {recomputeMutation.isPending ? 'Recomputing…' : '↻ Recompute Auto'}
            </button>
          )}
          {canEdit && (
            <button
              className="text-xs font-medium text-primary-700 border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-lg"
              onClick={() => setShowManage(true)}
            >
              ⚙️ Manage Categories
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {categories.map((c) => {
          const cid = String(c._id);
          const saved = savedMap[cid] || '';
          const meta = metaMap[cid];
          return (
            <div
              key={cid}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 items-center"
            >
              <div className="sm:col-span-1">
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  {c.name}
                  {c.autoMode === 'attendance' && (
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wide bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded"
                      title={`Auto-computed from attendance over the last ${c.windowDays || 56} days`}
                    >
                      Auto
                    </span>
                  )}
                </p>
                {c.description && (
                  <p className="text-xs text-gray-500">{c.description}</p>
                )}
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1">
                {c.type === 'text' ? (
                  <textarea
                    rows={3}
                    className="input-field"
                    placeholder="(empty)"
                    value={draft[cid] || ''}
                    onChange={(e) => setDraft({ ...draft, [cid]: e.target.value })}
                    disabled={!canEdit || c.autoMode === 'attendance'}
                  />
                ) : (
                  <select
                    className="input-field bg-white"
                    value={draft[cid] || ''}
                    onChange={(e) => setDraft({ ...draft, [cid]: e.target.value })}
                    disabled={!canEdit || c.autoMode === 'attendance'}
                    title={c.autoMode === 'attendance'
                      ? 'Auto-managed — switch to manual in Manage Categories to override'
                      : ''}
                  >
                    <option value="">— not set —</option>
                    {(c.options || [])
                      .slice()
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((o) => (
                        <option key={o.label} value={o.label}>{o.label}</option>
                      ))}
                  </select>
                )}
                {meta?.updatedAt && (
                  <p className="text-[10px] text-gray-400">
                    Updated {formatDate(meta.updatedAt)}
                    {meta.updatedBy
                      ? ` by ${meta.updatedBy.firstName} ${meta.updatedBy.lastName}`
                      : ''}
                    {saved && draft[cid] !== saved && (
                      <span className="ml-1 text-amber-600">· unsaved change</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {serverError && (
        <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100 mt-3">
          {serverError}
        </p>
      )}

      {canEdit && (
        <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
          <button
            className="btn-primary text-sm"
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {showManage && <ManageLdpCategoriesModal onClose={() => setShowManage(false)} />}
    </div>
  );
};

/* ─── Manage LDP Categories modal (admin-only) ─────────────────────────── */

const blankCategory = () => ({
  name: '',
  description: '',
  order: 0,
  isActive: true,
  type: 'select',
  options: [{ label: '', order: 10 }],
  autoMode: 'manual',
  linkedMeetingTypes: [],
  linkedEventTypes: [],
  windowDays: 56,
  thresholds: [],
});

const ManageLdpCategoriesModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // category being edited, or null for "new"
  const [form, setForm] = useState(blankCategory());
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ldp-categories', 'all'],
    queryFn: () => ldpCategoryService.list({ includeInactive: true }),
  });
  const categories = data?.data || [];

  const { data: meetingTypesData } = useQuery({
    queryKey: ['meeting-types', 'all'],
    queryFn: () => meetingTypeService.list({ includeInactive: 'true' }),
  });
  const { data: eventTypesData } = useQuery({
    queryKey: ['event-types', 'all'],
    queryFn: () => eventTypeService.list({ includeInactive: 'true' }),
  });
  const meetingTypes = meetingTypesData?.data || [];
  const eventTypes = eventTypesData?.data || [];

  const recomputeAllMutation = useMutation({
    mutationFn: () => memberService.recomputeLdpAll(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['member'] });
      const r = res?.data || {};
      window.alert(`Recomputed ${r.membersProcessed} members. ${r.totalChanged} value(s) changed, ${r.totalUnchanged} unchanged${r.errors?.length ? `, ${r.errors.length} error(s)` : ''}.`);
    },
    onError: (e) => window.alert(`Recompute failed: ${e.message}`),
  });

  // Use refetchQueries (not invalidateQueries) so the network call fires
  // synchronously — staleTime: 5min in main.jsx was preventing the refetch.
  const refresh = () => Promise.all([
    queryClient.refetchQueries({ queryKey: ['ldp-categories'] }),
    queryClient.refetchQueries({ queryKey: ['member'] }),
  ]);

  const createMutation = useMutation({
    mutationFn: ldpCategoryService.create,
    onSuccess: async () => { await refresh(); resetForm(); },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => ldpCategoryService.update(id, payload),
    onSuccess: async () => { await refresh(); resetForm(); },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: ldpCategoryService.remove,
    onSuccess: async () => { await refresh(); },
    onError: (e) => setError(e.message),
  });
  const renameMutation = useMutation({
    mutationFn: ({ id, from, to }) => ldpCategoryService.renameOption(id, { from, to }),
    onSuccess: async (res) => {
      await refresh();
      const migrated = res?.data?.migratedMembers ?? 0;
      window.alert(`Renamed. Updated ${migrated} member record${migrated === 1 ? '' : 's'}.`);
    },
    onError: (e) => window.alert(e.message),
  });

  const resetForm = () => {
    setEditing(null);
    setForm(blankCategory());
    setError(null);
  };

  const startEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || '',
      order: c.order || 0,
      isActive: c.isActive,
      type: c.type || 'select',
      options: (c.options || []).map((o) => ({ label: o.label, order: o.order || 0 })),
      autoMode: c.autoMode || 'manual',
      linkedMeetingTypes: (c.linkedMeetingTypes || []).map((x) => x._id || x),
      linkedEventTypes:   (c.linkedEventTypes   || []).map((x) => x._id || x),
      windowDays: c.windowDays || 56,
      thresholds: (c.thresholds || []).map((t) => ({ optionLabel: t.optionLabel, minCount: t.minCount })),
    });
    setError(null);
  };

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    const cleaned = {
      ...form,
      options: form.options
        .map((o) => ({ label: (o.label || '').trim(), order: Number(o.order) || 0 }))
        .filter((o) => o.label),
    };
    if (cleaned.type === 'select' && cleaned.options.length === 0) {
      setError('At least one option is required for a dropdown category');
      return;
    }
    if (cleaned.type === 'text') cleaned.options = [];

    // Auto-mode validation + scrub
    if (cleaned.autoMode === 'attendance') {
      if (cleaned.type === 'text') {
        setError('Free-text categories cannot be auto-managed.');
        return;
      }
      cleaned.thresholds = (cleaned.thresholds || [])
        .filter((t) => t.optionLabel && t.optionLabel !== '__none__')
        .map((t) => ({ optionLabel: t.optionLabel, minCount: Number(t.minCount) || 0 }));
      if (cleaned.thresholds.length === 0) {
        setError('Auto categories need at least one threshold row.');
        return;
      }
      const validLabels = new Set(cleaned.options.map((o) => o.label));
      const bad = cleaned.thresholds.find((t) => !validLabels.has(t.optionLabel));
      if (bad) {
        setError(`Threshold "${bad.optionLabel}" doesn't match any option on this category.`);
        return;
      }
      if ((cleaned.linkedMeetingTypes || []).length === 0 && (cleaned.linkedEventTypes || []).length === 0) {
        setError('Pick at least one Meeting Type or Event Type to link.');
        return;
      }
      cleaned.windowDays = Number(cleaned.windowDays) || 56;
    } else {
      // Manual mode — clear the auto fields so we don't store stale config.
      cleaned.linkedMeetingTypes = [];
      cleaned.linkedEventTypes = [];
      cleaned.thresholds = [];
    }
    if (editing) updateMutation.mutate({ id: editing._id, payload: cleaned });
    else createMutation.mutate(cleaned);
  };

  const updateOption = (idx, patch) => {
    const next = form.options.slice();
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, options: next });
  };
  const addOption = () => setForm({ ...form, options: [...form.options, { label: '', order: (form.options.length + 1) * 10 }] });
  const removeOption = (idx) => setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });

  const handleDelete = (c) => {
    if (window.confirm(`Delete category "${c.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(c._id);
    }
  };

  // Inline rename: when editing, an option that already exists on the saved
  // record can be "renamed and migrated" via the dedicated endpoint.
  const renameSavedOption = (originalLabel) => {
    const to = window.prompt(`Rename option "${originalLabel}" to:`, originalLabel);
    if (!to || to.trim() === originalLabel) return;
    renameMutation.mutate({ id: editing._id, from: originalLabel, to: to.trim() });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const savedOptionLabels = new Set((editing?.options || []).map((o) => o.label));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-primary-700">Manage LDP Categories</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Recompute auto LDP categories for ALL members? This may take a moment.')) {
                  recomputeAllMutation.mutate();
                }
              }}
              disabled={recomputeAllMutation.isPending}
              className="text-xs font-medium text-primary-700 border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
              title="Recompute auto LDP for every member"
            >
              {recomputeAllMutation.isPending ? 'Recomputing…' : '↻ Recompute All Members'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* LEFT: existing list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Existing categories</p>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories yet — add one on the right.</p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {categories.map((c) => (
                  <li key={c._id} className="flex items-start justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {c.name}{' '}
                        {!c.isActive && (
                          <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-1">
                            inactive
                          </span>
                        )}
                      </p>
                      {c.description && (
                        <p className="text-xs text-gray-600 truncate" title={c.description}>
                          {c.description}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {c.options?.length || 0} option{c.options?.length === 1 ? '' : 's'} · order {c.order || 0}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(c)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(c)} className="text-xs text-accent-red hover:underline">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* RIGHT: add/edit form */}
          <form onSubmit={submit} className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {editing ? `Editing: ${editing.name}` : 'Add new category'}
            </p>

            <input
              className="input-field"
              placeholder="Category name (e.g. Worship Service)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="input-field"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="number"
                className="input-field w-24"
                placeholder="Order"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
              />
              <select
                className="input-field bg-white w-32"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                title="Field type — dropdown picker or freeform text"
              >
                <option value="select">Dropdown</option>
                <option value="text">Free text</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 rounded"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>

            {form.type === 'text' && (
              <p className="text-[11px] text-gray-500">
                Free-text fields don't use options — members can type any note (max 1000 chars).
              </p>
            )}

            <div className={`mt-1 ${form.type === 'text' ? 'opacity-40 pointer-events-none' : ''}`}>
              <p className="text-xs font-semibold text-gray-600 mb-1">Options</p>
              <div className="flex flex-col gap-1.5">
                {form.options.map((o, idx) => {
                  const wasSaved = editing && savedOptionLabels.has(o.label);
                  return (
                    <div key={idx} className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        className="input-field w-16 text-xs"
                        placeholder="ord"
                        value={o.order}
                        onChange={(e) => updateOption(idx, { order: e.target.value })}
                      />
                      <input
                        className="input-field flex-1 text-xs"
                        placeholder="Option label"
                        value={o.label}
                        onChange={(e) => updateOption(idx, { label: e.target.value })}
                      />
                      {wasSaved && (
                        <button
                          type="button"
                          onClick={() => renameSavedOption(o.label)}
                          title="Rename this option AND migrate every member's saved value"
                          className="text-[10px] text-primary-600 border border-primary-200 px-1.5 py-1 rounded hover:bg-primary-50"
                        >
                          ⟳
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="text-accent-red text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-primary-600 hover:underline mt-1.5"
              >
                + Add option
              </button>
              {editing && (
                <p className="text-[10px] text-gray-500 mt-1.5">
                  Tip: ⟳ next to a saved option lets you rename it AND migrate every member's stored value at once.
                  Editing the label inline only changes the dropdown — old member values will become stale.
                </p>
              )}
            </div>

            {/* --- Auto-recompute rule (only relevant for select-type categories) --- */}
            {form.type === 'select' && (
              <div className="border-t border-gray-200 pt-2 mt-1">
                <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                  <span>How is this set?</span>
                  <select
                    className="input-field bg-white text-xs w-44"
                    value={form.autoMode}
                    onChange={(e) => setForm({ ...form, autoMode: e.target.value })}
                  >
                    <option value="manual">Manual (staff picks)</option>
                    <option value="attendance">Auto from attendance</option>
                  </select>
                </label>

                {form.autoMode === 'attendance' && (
                  <div className="mt-2 flex flex-col gap-2 bg-white border border-primary-100 rounded-lg p-3">
                    {/* Linked Meeting Types */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-600 mb-1">Linked Meeting Types</p>
                      <div className="flex flex-wrap gap-1.5">
                        {meetingTypes.length === 0 && (
                          <p className="text-[11px] text-gray-400">No meeting types defined yet.</p>
                        )}
                        {meetingTypes.map((mt) => {
                          const checked = (form.linkedMeetingTypes || []).includes(mt._id);
                          return (
                            <label
                              key={mt._id}
                              className={`text-[11px] px-2 py-1 rounded border cursor-pointer ${
                                checked
                                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...(form.linkedMeetingTypes || []), mt._id]
                                    : (form.linkedMeetingTypes || []).filter((id) => id !== mt._id);
                                  setForm({ ...form, linkedMeetingTypes: next });
                                }}
                              />
                              {mt.name}{!mt.isActive && ' (inactive)'}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Linked Event Types */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-600 mb-1">Linked Event Types</p>
                      <div className="flex flex-wrap gap-1.5">
                        {eventTypes.length === 0 && (
                          <p className="text-[11px] text-gray-400">No event types defined yet.</p>
                        )}
                        {eventTypes.map((et) => {
                          const checked = (form.linkedEventTypes || []).includes(et._id);
                          return (
                            <label
                              key={et._id}
                              className={`text-[11px] px-2 py-1 rounded border cursor-pointer ${
                                checked
                                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...(form.linkedEventTypes || []), et._id]
                                    : (form.linkedEventTypes || []).filter((id) => id !== et._id);
                                  setForm({ ...form, linkedEventTypes: next });
                                }}
                              />
                              {et.name}{!et.isActive && ' (inactive)'}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Window */}
                    <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-2">
                      Look back over the last
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        className="input-field w-20 text-xs"
                        value={form.windowDays}
                        onChange={(e) => setForm({ ...form, windowDays: e.target.value })}
                      />
                      days
                    </label>

                    {/* Thresholds */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-600 mb-1">
                        Threshold rules (the highest matching minCount wins)
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {(form.thresholds || []).map((t, idx) => (
                          <div key={idx} className="flex gap-1.5 items-center">
                            <span className="text-[10px] text-gray-500 w-12">if ≥</span>
                            <input
                              type="number"
                              min="0"
                              className="input-field w-20 text-xs"
                              value={t.minCount}
                              onChange={(e) => {
                                const next = form.thresholds.slice();
                                next[idx] = { ...next[idx], minCount: Number(e.target.value) || 0 };
                                setForm({ ...form, thresholds: next });
                              }}
                            />
                            <span className="text-[10px] text-gray-500">→ set to</span>
                            <select
                              className="input-field bg-white text-xs flex-1"
                              value={t.optionLabel}
                              onChange={(e) => {
                                const next = form.thresholds.slice();
                                next[idx] = { ...next[idx], optionLabel: e.target.value };
                                setForm({ ...form, thresholds: next });
                              }}
                            >
                              <option value="">— pick an option —</option>
                              {form.options
                                .filter((o) => o.label)
                                .map((o) => (
                                  <option key={o.label} value={o.label}>{o.label}</option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setForm({
                                ...form,
                                thresholds: form.thresholds.filter((_, i) => i !== idx),
                              })}
                              className="text-accent-red text-lg leading-none px-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({
                          ...form,
                          thresholds: [...(form.thresholds || []), { optionLabel: '', minCount: 0 }],
                        })}
                        className="text-xs text-primary-600 hover:underline mt-1.5"
                      >
                        + Add threshold rule
                      </button>
                      <p className="text-[10px] text-gray-500 mt-1.5">
                        Tip: include a row with <strong>minCount = 0</strong> as a catch-all (e.g.
                        "Not Yet Attending"). Otherwise zero attendances leaves the value unset.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-xs text-accent-red bg-red-50 px-2 py-1 rounded">{error}</p>}

            <div className="flex gap-2 justify-end mt-1">
              {editing && (
                <button type="button" className="btn-secondary text-xs" onClick={resetForm} disabled={isPending}>
                  Cancel edit
                </button>
              )}
              <button type="submit" className="btn-primary text-xs" disabled={isPending}>
                {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MemberProfilePage;
