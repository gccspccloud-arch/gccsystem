import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { memberService } from '@/services/memberService';
import { userService } from '@/services/userService';
import { attendanceService } from '@/services/attendanceService';
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

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
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

      {!editing ? (
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

export default MemberProfilePage;
