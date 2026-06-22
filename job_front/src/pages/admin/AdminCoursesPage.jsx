import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { useForm } from '../../hooks/useForm';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { DynamicListInput } from '../../components/forms/DynamicListInput';
import { extractPagination } from '../../utils/formatters';

const LEVEL_OPTIONS = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
];

const LEVEL_BADGE_STATUS = {
  beginner:     'success',
  intermediate: 'info',
  advanced:     'warning',
};

const EMPTY_FORM = {
  title:             '',
  category:          '',
  provider:          '',
  language:          'English',
  price:             '',
  link:              '',
  description:       '',
  duration:          '',
  teacher:           '',
  course_image_url:  '',
  level:             '',
  learning_material: [],
};

function validate(values) {
  const errs = {};
  if (!values.title?.trim())    errs.title    = 'Title is required';
  if (!values.category?.trim()) errs.category = 'Category is required';
  if (!values.language?.trim()) errs.language = 'Language is required';
  if (!values.duration?.trim()) errs.duration = 'Duration is required';
  if (!values.level)            errs.level    = 'Level is required';
  if (values.price !== '' && values.price !== null && isNaN(Number(values.price))) {
    errs.price = 'Price must be a number';
  }
  return errs;
}

export function AdminCoursesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const [modal,        setModal]        = useState(null); // null | 'create' | 'edit'
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  const fetchFn = useCallback(
    () => adminApi.getCourses({ search: debouncedSearch, page }),
    [debouncedSearch, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, page] });
  const { data: courses, pagination } = extractPagination(data);

  const form = useForm(EMPTY_FORM, validate);

  const openCreate = () => {
    form.reset();
    setEditTarget(null);
    setModal('create');
  };

  const openEdit = (course) => {
    form.setValues({
      title:             course.title             ?? '',
      category:          course.category          ?? '',
      provider:          course.provider          ?? '',
      language:          course.language          ?? 'English',
      price:             course.price != null ? String(course.price) : '',
      link:              course.link              ?? '',
      description:       course.description       ?? '',
      duration:          course.duration          ?? '',
      teacher:           course.teacher           ?? '',
      course_image_url:  course.course_image_url  ?? '',
      level:             course.level             ?? '',
      learning_material: Array.isArray(course.learning_material) ? course.learning_material : [],
    });
    setEditTarget(course);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleSubmit = async () => {
    if (!form.isValid()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form.values,
        price:             form.values.price === '' ? null : Number(form.values.price),
        course_image_url:  form.values.course_image_url || null,
        learning_material: form.values.learning_material.filter((s) => s.trim() !== ''),
      };
      if (modal === 'create') {
        await adminApi.createCourse(payload);
        toast.success(t('adminCourses.createdToast'));
      } else {
        await adminApi.updateCourse(editTarget.id, payload);
        toast.success(t('adminCourses.updatedToast'));
      }
      closeModal();
      refetch();
    } catch (e) {
      if (e?.errors) form.setServerErrors(e.errors);
      else toast.error(e?.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteCourse(deleteTarget.id);
      toast.success(t('adminCourses.deletedToast'));
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error(e?.message || 'An error occurred.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'title', label: t('adminCourses.colTitle'),
      render: (v, row) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{v}</p>
          {row.teacher && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{row.teacher}</p>
          )}
        </div>
      ),
    },
    { key: 'category', label: t('adminCourses.colCategory'), render: (v) => v || '—' },
    { key: 'language', label: t('adminCourses.colLanguage'), render: (v) => v || '—' },
    {
      key: 'level', label: 'Level',
      render: (v) => v
        ? <Badge status={LEVEL_BADGE_STATUS[v] ?? 'info'}>{v}</Badge>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'price', label: t('adminCourses.colPrice'),
      render: (v) => v != null
        ? `$${Number(v).toFixed(2)}`
        : <span className="text-xs font-medium" style={{ color: 'var(--clr-success-a10)' }}>{t('adminCourses.free')}</span>,
    },
    { key: 'duration', label: t('adminCourses.colDuration'), render: (v) => v || '—' },
    {
      key: 'link', label: '', width: 40,
      render: (v) => v
        ? <a href={v} target="_blank" rel="noreferrer" title="Open course" style={{ color: 'var(--primary)' }}>
            <ExternalLink size={14} />
          </a>
        : null,
    },
    {
      key: 'actions', label: t('adminCourses.colActions'), width: 90, align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
            <Pencil size={14} style={{ color: 'var(--text-secondary)' }} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(row)} title="Delete">
            <Trash2 size={14} style={{ color: 'var(--clr-danger-a10)' }} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminCourses.title')}
        subtitle={t('adminCourses.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminCourses.breadCourses') }]}
        actions={
          <Button onClick={openCreate} leftIcon={<Plus size={16} />}>
            {t('adminCourses.addButton')}
          </Button>
        }
      />

      <div className="card">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder={t('adminCourses.searchPlaceholder')}
          />
        </div>
        <DataTable
          columns={columns}
          data={courses}
          loading={loading}
          error={error}
          onRetry={refetch}
          pagination={pagination}
          onPageChange={setPage}
          emptyTitle={t('adminCourses.emptyTitle')}
          emptyDescription={t('adminCourses.emptyDesc')}
          emptyIcon={BookOpen}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? t('adminCourses.createTitle') : t('adminCourses.editTitle')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={submitting}>
              {t('confirmDialog.cancel')}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {t('adminCourses.saveButton')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('adminCourses.fieldTitle')}
            name="title"
            value={form.values.title}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.title}
            required
          />
          <Input
            label={t('adminCourses.fieldCategory')}
            name="category"
            value={form.values.category}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.category}
            required
          />
          <Input
            label={t('adminCourses.fieldProvider')}
            name="provider"
            value={form.values.provider}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.provider}
          />
          <Input
            label={t('adminCourses.fieldLanguage')}
            name="language"
            value={form.values.language}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.language}
            required
          />
          <Input
            label={t('adminCourses.fieldDuration')}
            name="duration"
            value={form.values.duration}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.duration}
            placeholder="e.g. 4 weeks, 10 hours"
            required
          />
          <Select
            label="Level"
            name="level"
            value={form.values.level}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.level}
            options={LEVEL_OPTIONS}
            placeholder="Select level…"
            required
          />
          <Input
            label={t('adminCourses.fieldPrice')}
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.values.price}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.price}
          />
          <Input
            label={t('adminCourses.fieldTeacher')}
            name="teacher"
            value={form.values.teacher}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.teacher}
          />
          <div className="sm:col-span-2">
            <Input
              label="Course Image URL"
              name="course_image_url"
              type="url"
              value={form.values.course_image_url}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.course_image_url}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label={t('adminCourses.fieldLink')}
              name="link"
              type="url"
              value={form.values.link}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.link}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label={t('adminCourses.fieldDescription')}
              name="description"
              rows={3}
              value={form.values.description}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={form.errors.description}
            />
          </div>
          <div className="sm:col-span-2">
            <DynamicListInput
              label="Learning Materials"
              name="learning_material"
              value={form.values.learning_material}
              onChange={form.handleChange}
              placeholder="e.g. Introduction to variables"
              error={form.errors.learning_material}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t('adminCourses.deleteTitle')}
        message={t('adminCourses.deleteMessage', { title: deleteTarget?.title ?? '' })}
        confirmLabel={t('adminCourses.deleteButton')}
      />
    </div>
  );
}
