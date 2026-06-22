import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { JobPostForm } from '../../components/forms/JobPostForm';
import toast from 'react-hot-toast';

const DEFAULTS = {
  title:            '',
  employment_type:  '',
  location:         '',
  status:           'draft',
  salary_min:       '',
  salary_max:       '',
  description:      '',
  responsibilities: [],
  requirements:     [],
  experience_years: '',
  level:            '',
  job_type:         '',
};

export function CompanyJobPostNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const validate = (v) => {
    const e = {};
    if (!v.title)           e.title           = t('jobPostForm.validTitle');
    if (!v.description)     e.description     = t('jobPostForm.validDescription');
    if (!v.employment_type) e.employment_type = t('jobPostForm.validEmploymentType');
    const min = v.salary_min !== '' ? Number(v.salary_min) : null;
    const max = v.salary_max !== '' ? Number(v.salary_max) : null;
    if (min !== null && isNaN(min))              e.salary_min = t('jobPostForm.validSalaryNumber');
    if (max !== null && isNaN(max))              e.salary_max = t('jobPostForm.validSalaryNumber');
    if (min !== null && max !== null && max < min) e.salary_max = t('jobPostForm.validSalaryMax');
    if (!Array.isArray(v.responsibilities) || v.responsibilities.length === 0)
      e.responsibilities = 'At least one responsibility is required';
    if (!Array.isArray(v.requirements) || v.requirements.length === 0)
      e.requirements = 'At least one requirement is required';
    return e;
  };

  const { values, errors, handleChange, isValid, setServerErrors } = useForm(DEFAULTS, validate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...Object.fromEntries(
          Object.entries(values).filter(([, v]) => v !== '' && v !== null),
        ),
        responsibilities: values.responsibilities.filter((s) => s.trim() !== ''),
        requirements:     values.requirements.filter((s) => s.trim() !== ''),
        experience_years: values.experience_years !== '' ? Number(values.experience_years) : undefined,
      };
      await companyApi.createJobPost(payload);
      toast.success(t('companyJobPostNew.createdToast'));
      navigate('/company/job-posts');
    } catch (err) {
      if (err?.errors) setServerErrors(err.errors);
      else toast.error(err?.message || t('companyJobPostNew.failedToast'));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyJobPostNew.title')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyJobPosts.breadJobPosts'), href: '/company/job-posts' }, { label: t('companyJobPostNew.breadNew') }]}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/company/job-posts')}>
            {t('common.back')}
          </Button>
        }
      />
      <div className="card p-6 max-w-3xl">
        <JobPostForm
          values={values}
          errors={errors}
          handleChange={handleChange}
          onSubmit={handleSubmit}
          loading={submitting}
          submitLabel={t('companyJobPostNew.submitLabel')}
        />
      </div>
    </div>
  );
}
