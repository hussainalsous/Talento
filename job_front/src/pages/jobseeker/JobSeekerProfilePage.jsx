import { useState, useCallback } from 'react';
import { User, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { jobSeekerApi } from '../../api/jobSeekerApi';
import { useFetch } from '../../hooks/useFetch';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/feedback/ErrorState';

const JOB_TYPE_OPTIONS = [
  { value: '',           label: 'Not specified' },
  { value: 'full_time',  label: 'Full Time' },
  { value: 'part_time',  label: 'Part Time' },
  { value: 'remote',     label: 'Remote' },
  { value: 'contract',   label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance',  label: 'Freelance' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public',  label: 'Public' },
  { value: 'limited', label: 'Limited (companies only)' },
  { value: 'private', label: 'Private' },
];

export function JobSeekerProfilePage() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const fetchFn = useCallback(() => jobSeekerApi.getProfile(), []);
  const { data: res, loading, error, refetch } = useFetch(fetchFn);

  const profile = res?.data?.data ?? res?.data ?? null;

  const form = useForm({
    first_name:          profile?.first_name         ?? '',
    last_name:           profile?.last_name          ?? '',
    professional_title:  profile?.professional_title ?? '',
    open_to_work:        profile?.open_to_work       ?? true,
    current_job:         profile?.current_job        ?? '',
    location:            profile?.location           ?? '',
    preferred_job_type:  profile?.preferred_job_type ?? '',
    desired_salary:      profile?.desired_salary     != null ? String(profile.desired_salary) : '',
    profile_visibility:  profile?.profile_visibility ?? 'public',
  });

  // Sync form when profile loads
  const [synced, setSynced] = useState(false);
  if (profile && !synced) {
    form.setValues({
      first_name:          profile.first_name         ?? '',
      last_name:           profile.last_name          ?? '',
      professional_title:  profile.professional_title ?? '',
      open_to_work:        profile.open_to_work       ?? true,
      current_job:         profile.current_job        ?? '',
      location:            profile.location           ?? '',
      preferred_job_type:  profile.preferred_job_type ?? '',
      desired_salary:      profile.desired_salary     != null ? String(profile.desired_salary) : '',
      profile_visibility:  profile.profile_visibility ?? 'public',
    });
    setSynced(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form.values,
        desired_salary: form.values.desired_salary === '' ? null : Number(form.values.desired_salary),
      };
      await jobSeekerApi.updateProfile(payload);
      toast.success('Profile updated successfully.');
      refetch();
    } catch (e) {
      if (e?.errors) form.setServerErrors(e.errors);
      else toast.error(e?.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Profile"
        subtitle="Manage your job seeker profile"
        breadcrumbs={[{ label: 'Job Seeker' }, { label: 'Profile' }]}
      />

      <div className="card p-6 space-y-6">
        {/* Open to Work toggle */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{ background: form.values.open_to_work ? 'var(--status-info-bg)' : 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
        >
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Open to Work
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {form.values.open_to_work ? 'Your profile is visible to recruiters as actively seeking.' : 'Not currently seeking new opportunities.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => form.setValue('open_to_work', !form.values.open_to_work)}
            className="p-1 rounded transition-colors"
            style={{ color: form.values.open_to_work ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {form.values.open_to_work
              ? <ToggleRight size={36} />
              : <ToggleLeft  size={36} />}
          </button>
        </div>

        {/* Name & title */}
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="first_name"
              value={form.values.first_name}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.first_name}
              disabled={loading}
            />
            <Input
              label="Last Name"
              name="last_name"
              value={form.values.last_name}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.last_name}
              disabled={loading}
            />
            <div className="sm:col-span-2">
              <Input
                label="Professional Title"
                name="professional_title"
                placeholder="e.g. Senior React Developer"
                value={form.values.professional_title}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                error={form.errors.professional_title}
                disabled={loading}
                leftElement={<User size={14} />}
              />
            </div>
          </div>
        </div>

        {/* Job preferences */}
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Job Preferences
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Current Job / Title"
              name="current_job"
              value={form.values.current_job}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.current_job}
              disabled={loading}
            />
            <Input
              label="Location"
              name="location"
              value={form.values.location}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.location}
              disabled={loading}
            />
            <Select
              label="Preferred Job Type"
              name="preferred_job_type"
              value={form.values.preferred_job_type}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.preferred_job_type}
              options={JOB_TYPE_OPTIONS}
              disabled={loading}
            />
            <Input
              label="Desired Salary (USD/year)"
              name="desired_salary"
              type="number"
              min="0"
              step="100"
              value={form.values.desired_salary}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.desired_salary}
              disabled={loading}
            />
          </div>
        </div>

        {/* Privacy */}
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Privacy
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Profile Visibility"
              name="profile_visibility"
              value={form.values.profile_visibility}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.profile_visibility}
              options={VISIBILITY_OPTIONS}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving} leftIcon={<Save size={15} />}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
