import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { DynamicListInput } from './DynamicListInput';

const EMPLOYMENT_OPTIONS = [
  { value: 'full_time',  label: 'Full Time'   },
  { value: 'part_time',  label: 'Part Time'   },
  { value: 'contract',   label: 'Contract'    },
  { value: 'internship', label: 'Internship'  },
  { value: 'remote',     label: 'Remote'      },
  { value: 'freelance',  label: 'Freelance'   },
];

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft'     },
  { value: 'published', label: 'Published' },
  { value: 'closed',    label: 'Closed'    },
  { value: 'archived',  label: 'Archived'  },
];

const LEVEL_OPTIONS = [
  { value: 'Fresh graduate', label: 'Fresh Graduate' },
  { value: 'Junior',         label: 'Junior'         },
  { value: 'Mid-level',      label: 'Mid-level'      },
  { value: 'Senior',         label: 'Senior'         },
];

const JOB_TYPE_OPTIONS = [
  { value: 'Full-time',  label: 'Full-time'  },
  { value: 'Part-time',  label: 'Part-time'  },
  { value: 'Contract',   label: 'Contract'   },
  { value: 'Remotely',   label: 'Remotely'   },
  { value: 'Internship', label: 'Internship' },
];

export function JobPostForm({ values, errors = {}, handleChange, onSubmit, loading, submitLabel }) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Input
        label={t('jobPostForm.labelTitle')}
        name="title"
        value={values.title}
        onChange={handleChange}
        error={errors.title}
        required
        placeholder={t('jobPostForm.titlePlaceholder')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t('jobPostForm.labelEmploymentType')}
          name="employment_type"
          value={values.employment_type}
          onChange={handleChange}
          error={errors.employment_type}
          options={EMPLOYMENT_OPTIONS}
          placeholder={t('jobPostForm.typePlaceholder')}
          required
        />
        <Select
          label={t('jobPostForm.labelStatus')}
          name="status"
          value={values.status}
          onChange={handleChange}
          error={errors.status}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Level"
          name="level"
          value={values.level}
          onChange={handleChange}
          error={errors.level}
          options={LEVEL_OPTIONS}
          placeholder="Select level…"
        />
        <Select
          label="Job Type"
          name="job_type"
          value={values.job_type}
          onChange={handleChange}
          error={errors.job_type}
          options={JOB_TYPE_OPTIONS}
          placeholder="Select job type…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('jobPostForm.labelLocation')}
          name="location"
          value={values.location}
          onChange={handleChange}
          placeholder={t('jobPostForm.locationPlaceholder')}
        />
        <Input
          label="Years of Experience"
          name="experience_years"
          type="number"
          min="0"
          value={values.experience_years}
          onChange={handleChange}
          error={errors.experience_years}
          placeholder="e.g. 2"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('jobPostForm.labelSalaryMin')} name="salary_min" type="number" value={values.salary_min} onChange={handleChange} placeholder={t('jobPostForm.salaryMinPlaceholder')} />
        <Input label={t('jobPostForm.labelSalaryMax')} name="salary_max" type="number" value={values.salary_max} onChange={handleChange} error={errors.salary_max} placeholder={t('jobPostForm.salaryMaxPlaceholder')} />
      </div>

      <Textarea
        label={t('jobPostForm.labelDescription')}
        name="description"
        value={values.description}
        onChange={handleChange}
        error={errors.description}
        required
        rows={6}
        placeholder={t('jobPostForm.descriptionPlaceholder')}
      />

      <DynamicListInput
        label={t('jobPostForm.labelResponsibilities')}
        name="responsibilities"
        value={values.responsibilities}
        onChange={handleChange}
        error={errors.responsibilities}
        placeholder="e.g. Lead sprint planning sessions"
        required
      />

      <DynamicListInput
        label={t('jobPostForm.labelRequirements')}
        name="requirements"
        value={values.requirements}
        onChange={handleChange}
        error={errors.requirements}
        placeholder="e.g. 3+ years of React experience"
        required
      />

      <div className="flex justify-end gap-3">
        <Button type="submit" variant="primary" loading={loading}>
          {submitLabel || t('common.save')}
        </Button>
      </div>
    </form>
  );
}
