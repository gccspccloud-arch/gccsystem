import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { outreachAttendeeService } from '@/services/outreachService';
import { attendanceService } from '@/services/attendanceService';
import { useAuth } from '@/context/AuthContext';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const OutreachAttendeeProfilePage = () => {
  const { id, attendeeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canPromote = hasRole('super_admin', 'admin');

  const [showPromote, setShowPromote] = useState(false);
  const [promoteError, setPromoteError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['outreach-attendee', attendeeId],
    queryFn: () => outreachAttendeeService.get(attendeeId),
  });
  const attendee = data?.data;

  // Pull attendance history once we know the linked member (if promoted) — otherwise none.
  const memberId = attendee?.promotedToMember?._id;
  const { data: historyData } = useQuery({
    queryKey: ['attendance-by-member', memberId],
    queryFn: () => attendanceService.byMember(memberId),
    enabled: Boolean(memberId),
  });
  const history = historyData?.data || [];

  const promoteMutation = useMutation({
    mutationFn: (overrides) => outreachAttendeeService.promote(attendeeId, overrides),
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['outreach-attendee', attendeeId] });
      queryClient.invalidateQueries({ queryKey: ['outreach-attendees', id] });
      setShowPromote(false);
      const migrated = resp?.data?.migratedRecords ?? 0;
      const memberName = `${resp?.data?.member?.firstName} ${resp?.data?.member?.lastName}`;
      alert(`Promoted to Member: ${memberName}\nBack-filled ${migrated} past attendance record(s).`);
    },
    onError: (e) => setPromoteError(e.message),
  });

  if (isLoading) return <p className="text-center text-gray-500 py-8">Loading attendee...</p>;
  if (!attendee) return <p className="text-center text-accent-red py-8">Attendee not found.</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={`/outreach/${id}`} className="text-sm text-primary-600 hover:underline">
        ← Back to Outreach Roster
      </Link>

      <div className="card my-3">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-700">
              {attendee.firstName} {attendee.middleName} {attendee.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              Outreach attendee at <strong>{attendee.outreach?.name}</strong>
            </p>
          </div>
          <div>
            {attendee.promotedToMember ? (
              <Link
                to={`/members/${attendee.promotedToMember._id}`}
                className="text-sm font-medium bg-primary-100 text-primary-700 px-3 py-1.5 rounded hover:bg-primary-200"
              >
                ✓ Promoted to Member →
              </Link>
            ) : canPromote ? (
              <button
                className="btn-primary"
                onClick={() => { setPromoteError(null); setShowPromote(true); }}
              >
                ⬆️ Promote to Member
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Gender" value={attendee.gender} />
          <Field label="Birthdate" value={attendee.birthdate ? formatDate(attendee.birthdate) : '—'} />
          <Field label="Age" value={attendee.age ?? '—'} />
          <Field label="Age class" value={attendee.ageClass || '—'} />
          <Field label="Contact number" value={attendee.contactNumber} />
          <Field label="Address" value={attendee.address} />
          <Field label="Notes" value={attendee.notes} full />
        </div>
      </div>

      {memberId && (
        <div className="card">
          <h2 className="text-lg font-semibold text-primary-700 mb-2">Attendance History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No attendance records yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {history.map((r) => (
                <li key={r._id} className="py-2 flex items-center justify-between">
                  <span className="text-gray-700">
                    <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-2">
                      {r.target?.kind}
                    </span>
                    {r.target?.ref?.title || '—'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {r.target?.ref?.scheduledAt ? formatDate(r.target.ref.scheduledAt) : formatDate(r.markedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showPromote && (
        <PromoteModal
          attendee={attendee}
          error={promoteError}
          isPending={promoteMutation.isPending}
          onClose={() => setShowPromote(false)}
          onSubmit={(overrides) => { setPromoteError(null); promoteMutation.mutate(overrides); }}
        />
      )}
    </div>
  );
};

const Field = ({ label, value, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-gray-800 whitespace-pre-wrap">{value || '—'}</p>
  </div>
);

const PromoteModal = ({ attendee, error, isPending, onClose, onSubmit }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      civilStatus: 'Single',
      contactNumber: attendee.contactNumber || '',
      permanentAddress: attendee.address || '',
      presentAddress: '',
      memberStatus: 'New Attendee',
      notes: attendee.notes || '',
    },
  });

  const missingGender = !attendee.gender;
  const missingBirthdate = !attendee.birthdate;
  const blocked = missingGender || missingBirthdate;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-primary-700">Promote to Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 flex flex-col gap-3">
          <p className="text-sm text-gray-700">
            Creates a new <strong>Member</strong> record for{' '}
            <strong>{attendee.firstName} {attendee.lastName}</strong> and back-fills past
            attendance with matching name {attendee.contactNumber ? '+ contact' : ''}.
          </p>

          {blocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium">Missing required info:</p>
              <ul className="list-disc list-inside mt-1">
                {missingGender && <li>Gender</li>}
                {missingBirthdate && <li>Birthdate</li>}
              </ul>
              <p className="mt-1">Edit the attendee first, then promote.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Civil Status</label>
              <select className="input-field" {...register('civilStatus')}>
                <option>Single</option>
                <option>Married</option>
                <option>Widowed</option>
                <option>Separated</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Member Status</label>
              <select className="input-field" {...register('memberStatus')}>
                <option>New Attendee</option>
                <option>Regular Attendee</option>
                <option>Member</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Contact Number</label>
              <input className="input-field" {...register('contactNumber')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Present Address</label>
              <input className="input-field" {...register('presentAddress')} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Permanent Address</label>
              <input className="input-field" {...register('permanentAddress')} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea rows={2} className="input-field" {...register('notes')} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending || blocked}>
              {isPending ? 'Promoting...' : 'Promote to Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutreachAttendeeProfilePage;
