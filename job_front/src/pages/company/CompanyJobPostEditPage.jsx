import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { JobPostForm } from '../../components/forms/JobPostForm';
import { ErrorState } from '../../components/feedback/ErrorState';
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

/** Normalise responsibilities/requirements — old API may return a string. */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function CompanyJobPostEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
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
    return e;
  };

  const fetchFn = useCallback(() => companyApi.getJobPost(id), [id]);
  const { data, loading, error } = useFetch(fetchFn);
  const post = data?.data ?? data;

  const { values, errors, handleChange, isValid, setServerErrors, setValues } = useForm(DEFAULTS, validate);

  const initialized = useRef(false);
  if (post && !initialized.current) {
    initialized.current = true;
    setValues({
      title:            post.title            || '',
      employment_type:  post.employment_type  || '',
      location:         post.location         || '',
      status:           post.status           || 'draft',
      salary_min:       post.salary_min       || '',
      salary_max:       post.salary_max       || '',
      description:      post.description      || '',
      responsibilities: toArray(post.responsibilities),
      requirements:     toArray(post.requirements),
      experience_years: post.experience_years != null ? String(post.experience_years) : '',
      level:            post.level            || '',
      job_type:         post.job_type         || '',
    });
  }

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
      await companyApi.updateJobPost(id, payload);
      toast.success(t('companyJobPostEdit.updatedToast'));
      navigate('/company/job-posts');
    } catch (err) {
      if (err?.errors) setServerErrors(err.errors);
      else toast.error(err?.message || t('companyJobPostEdit.failedToast'));
    } finally { setSubmitting(false); }
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyJobPostEdit.title')}
        breadcrumbs={[
          { label: t('companyDashboard.breadCompany') },
          { label: t('companyJobPosts.breadJobPosts'), href: '/company/job-posts' },
          { label: post?.title },
          { label: t('companyJobPostEdit.breadEdit') },
        ]}
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
          submitLabel={t('companyJobPostEdit.submitLabel')}
        />
      </div>
    </div>
  );
}
