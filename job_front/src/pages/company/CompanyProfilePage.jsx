import { useCallback, useRef, useState } from 'react';
import { Building2, Globe, MapPin, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/feedback/ErrorState';
import toast from 'react-hot-toast';

export function CompanyProfilePage() {
  const { t } = useTranslation();

  const SIZE_OPTIONS = [
    { value: '1-10',    label: t('companyProfile.size1_10')   },
    { value: '11-50',   label: t('companyProfile.size11_50')  },
    { value: '51-200',  label: t('companyProfile.size51_200') },
    { value: '201-500', label: t('companyProfile.size201_500')},
    { value: '500+',    label: t('companyProfile.size500plus')},
  ];

  const validate = (v) => {
    const e = {};
    if (!v.name) e.name = t('companyProfile.validNameRequired');
    return e;
  };

  const fetchFn = useCallback(() => companyApi.getProfile(), []);
  const { data, loading, error, refetch } = useFetch(fetchFn);
  const company = data?.data ?? data;

  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef(null);

  const { values, errors, handleChange, isValid, setServerErrors, setValues } = useForm(
    { name: '', industry: '', website: '', location: '', size: '', description: '' },
    validate,
  );

  const initialized = useRef(false);
  if (company && !initialized.current) {
    initialized.current = true;
    setValues({
      name:        company.name        || '',
      industry:    company.industry    || '',
      website:     company.website     || '',
      location:    company.location    || '',
      size:        company.size        || '',
      description: company.description || '',
    });
  }

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    try {
      await companyApi.updateProfile(values);
      toast.success(t('companyProfile.updatedToast'));
      refetch();
    } catch (err) {
      if (err?.errors) setServerErrors(err.errors);
      else toast.error(err?.message || t('errors.generic.title'));
    } finally { setSubmitting(false); }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    setLogoUploading(true);
    try {
      await companyApi.uploadLogo(formData);
      toast.success(t('companyProfile.logoUpdatedToast'));
      refetch();
    } catch (err) {
      const detail = err?.errors?.logo?.[0] || err?.message || t('companyProfile.logoFailedToast');
      toast.error(detail);
    } finally { setLogoUploading(false); }
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyProfile.title')}
        subtitle={t('companyProfile.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyProfile.breadProfile') }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--primary-light)' }}
          >
            {loading
              ? <div className="skeleton w-full h-full" />
              : company?.logo_url
              ? <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover" />
              : <Building2 size={36} style={{ color: 'var(--primary)' }} />
            }
          </div>
          <div className="text-center">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {loading ? '—' : company?.name}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {loading ? '' : company?.industry || t('companyProfile.noIndustry')}
            </p>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload size={14} />}
            loading={logoUploading}
            onClick={() => logoRef.current?.click()}
          >
            {t('companyProfile.changeLogo')}
          </Button>
        </div>

        <form onSubmit={handleSave} className="card p-6 lg:col-span-2 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('companyProfile.companyInfo')}</h3>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded" />)
            : (
              <>
                <Input label={t('companyProfile.labelName')}     name="name"     value={values.name}     onChange={handleChange} error={errors.name}  required leftElement={<Building2 size={16} />} />
                <Input label={t('companyProfile.labelIndustry')} name="industry" value={values.industry} onChange={handleChange} placeholder={t('companyProfile.industryPlaceholder')} />
                <Input label={t('companyProfile.labelWebsite')}  name="website"  value={values.website}  onChange={handleChange} type="url" placeholder={t('companyProfile.websitePlaceholder')} leftElement={<Globe size={16} />} />
                <Input label={t('companyProfile.labelLocation')} name="location" value={values.location} onChange={handleChange} placeholder={t('companyProfile.locationPlaceholder')} leftElement={<MapPin size={16} />} />
                <Select label={t('companyProfile.labelSize')} name="size" value={values.size} onChange={handleChange} options={SIZE_OPTIONS} placeholder={t('companyProfile.sizePlaceholder')} />
                <Textarea label={t('companyProfile.labelDescription')} name="description" value={values.description} onChange={handleChange} rows={4} placeholder={t('companyProfile.descriptionPlaceholder')} />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={submitting}>{t('common.saveChanges')}</Button>
                </div>
              </>
            )
          }
        </form>
      </div>
    </div>
  );
}
