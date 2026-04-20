import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { memberService } from '@/services/memberService';
import {
  GENDERS,
  CIVIL_STATUSES,
  EDUCATIONAL_STATUSES,
  EMPLOYMENT_STATUSES,
  MEMBER_STATUSES,
} from '@/utils/constants';
import FormField from '@/components/forms/FormField';
import FormSection from '@/components/forms/FormSection';
import { calculateAge, getAgeClass, AGE_CLASS_STYLES } from '@/utils/age';

const RegisterMemberPage = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      civilStatus: 'Single',
      educationalStatus: 'N/A',
      employmentStatus: 'None',
      memberStatus: 'New Attendee',
      isBaptized: false,
    },
  });

  const civilStatus = watch('civilStatus');
  const isBaptized = watch('isBaptized');
  const birthdate = watch('birthdate');
  const age = calculateAge(birthdate);
  const ageClass = getAgeClass(age);

  const mutation = useMutation({
    mutationFn: memberService.create,
    onSuccess: () => {
      reset();
      navigate('/members', { state: { justRegistered: true } });
    },
    onError: (err) => setServerError(err.message),
  });

  const onSubmit = (data) => {
    setServerError(null);
    const payload = {
      ...data,
      isBaptized: Boolean(data.isBaptized),
      dateOfMarriage: civilStatus === 'Married' ? data.dateOfMarriage || null : null,
      spouse: civilStatus === 'Married' ? data.spouse || '' : '',
      churchBaptized: data.isBaptized ? data.churchBaptized || '' : '',
      dateBaptized: data.isBaptized ? data.dateBaptized || null : null,
      dateJoinedChurch: data.dateJoinedChurch || null,
    };
    mutation.mutate(payload);
  };

  const inputClass = 'input-field';
  const selectClass = 'input-field bg-white';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-700">Member Registration</h1>
        <p className="text-sm text-gray-500">
          Fill in the details below to register a new member of Gospel Coalition Church.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormSection
          title="Membership Status"
          description="Classify how this person is currently engaged with the church."
        >
          <div className="md:col-span-2">
            <FormField label="Status" required error={errors.memberStatus}>
              <select className={selectClass} {...register('memberStatus', { required: 'Required' })}>
                {MEMBER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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
              <option value="">Select...</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Birthdate"
            required
            error={errors.birthdate}
            hint={
              age != null && age >= 0
                ? `Age ${age} · ${ageClass}`
                : null
            }
          >
            <input type="date" className={inputClass} {...register('birthdate', { required: 'Required' })} />
          </FormField>

          <FormField label="Educational Status" error={errors.educationalStatus}>
            <select className={selectClass} {...register('educationalStatus')}>
              {EDUCATIONAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
        </FormSection>

        <FormSection title="Contact Information">
          <FormField
            label="Contact Number"
            error={errors.contactNumber}
            hint="PH mobile format: 9XXXXXXXXX (without leading 0)"
          >
            <input
              className={inputClass}
              placeholder="9171234567"
              {...register('contactNumber', {
                pattern: { value: /^9\d{9}$/, message: 'Must be 9XXXXXXXXX' },
              })}
            />
          </FormField>

          <FormField label="Email Address" error={errors.email}>
            <input
              type="email"
              className={inputClass}
              {...register('email', {
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
              })}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Permanent Address" required error={errors.permanentAddress}>
              <input
                className={inputClass}
                {...register('permanentAddress', { required: 'Required' })}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Present Address"
              error={errors.presentAddress}
              hint="Leave blank if same as permanent address"
            >
              <input className={inputClass} {...register('presentAddress')} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Civil & Family Status">
          <FormField label="Civil Status" required error={errors.civilStatus}>
            <select className={selectClass} {...register('civilStatus', { required: 'Required' })}>
              {CIVIL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Employment Status" error={errors.employmentStatus}>
            <select className={selectClass} {...register('employmentStatus')}>
              {EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
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
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                {...register('isBaptized')}
              />
              <span className="text-sm font-medium text-gray-700">Already Baptized?</span>
            </label>
          </div>

          <FormField label="Date Joined Church" error={errors.dateJoinedChurch} hint="When this person started attending GCC">
            <input type="date" className={inputClass} {...register('dateJoinedChurch')} />
          </FormField>
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

        <FormSection title="Notes & Remarks" description="Optional internal notes for ministry follow-up.">
          <div className="md:col-span-2">
            <FormField label="Notes" error={errors.notes}>
              <textarea
                rows={3}
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
            onClick={() => reset()}
            disabled={mutation.isPending}
          >
            Reset
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Registering...' : 'Register Member'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterMemberPage;
