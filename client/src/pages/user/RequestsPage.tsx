import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { Plus, ClipboardList, Sparkles } from 'lucide-react';
import { useRequests, useCreateRequest, useDeleteRequest } from '@/hooks/user/useRequests';
import { Request, RequestType } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { ShiftDetailDialog } from '@/components/ui/ShiftDetailDialog';
import { GlassDateRangePicker } from '@/components/ui/GlassDateRangePicker';

const schema = z.object({
  startDate: z.string().min(1, 'תאריך התחלה נדרש'),
  endDate: z.string().min(1, 'תאריך סיום נדרש'),
  type: z.nativeEnum(RequestType),
  description: z.string().min(1, 'תיאור נדרש'),
}).refine((d) => !d.startDate || !d.endDate || d.startDate <= d.endDate, {
  message: 'תאריך התחלה חייב להיות לפני תאריך סיום',
  path: ['endDate'],
});
type FormValues = z.infer<typeof schema>;

export function UserRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogRequest, setDialogRequest] = useState<Request | null>(null);

  const { data: requests = [], isLoading } = useRequests();
  const createMutation = useCreateRequest();
  const deleteMutation = useDeleteRequest();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: RequestType.Exclude },
  });

  // Auto-open form with dates from URL params (e.g. from calendar drag-to-select)
  useEffect(() => {
    const sd = searchParams.get('startDate');
    const ed = searchParams.get('endDate');
    if (sd) {
      setValue('startDate', sd);
      if (ed) setValue('endDate', ed);
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const onSubmit = async (data: FormValues) => {
    await createMutation.mutateAsync(data);
    reset();
    setShowForm(false);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterType !== 'all' && String(r.type) !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [requests, filterType, searchQuery]);

  const handleDeleteRequest = (id: string) => {
    deleteMutation.mutate(id);
    setDialogRequest(null);
  };

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<ClipboardList className="w-5 h-5 text-white" />}
        title="בקשות"
        subtitle="ניהול בקשות זמינות"
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* New Request CTA */}
        {!showForm && (
          <GlassCard
            className="p-8 border-dashed border-2 border-blue-500/20 hover:border-blue-500/40 cursor-pointer transition-all text-center"
            glow="blue"
            onClick={() => setShowForm(true)}
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">בקשה חדשה</h3>
            <p className="text-sm text-gray-400">הוסף בקשת אי זמינות או העדפה</p>
          </GlassCard>
        )}

        {/* Create form */}
        {showForm && (
          <GlassCard className="p-6" glow="blue">
            <h2 className="text-lg font-semibold text-white mb-4">בקשה חדשה</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <GlassDateRangePicker
                startDate={watch('startDate') || ''}
                endDate={watch('endDate') || ''}
                onChangeStart={(d) => setValue('startDate', d, { shouldValidate: true })}
                onChangeEnd={(d) => setValue('endDate', d, { shouldValidate: true })}
                label="טווח תאריכים"
                error={errors.startDate?.message || errors.endDate?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">סוג בקשה</label>
                <select
                  {...register('type', { valueAsNumber: true })}
                  className="glass-input"
                >
                  <option value={RequestType.Exclude}>אי זמינות</option>
                  <option value={RequestType.Prefer}>העדפה</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">תיאור</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="glass-input resize-none"
                  placeholder="הסבר קצר על הבקשה..."
                />
                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
              </div>

              <div className="flex gap-3">
                <GlassButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'שומר...' : 'שמור בקשה'}
                </GlassButton>
                <GlassButton variant="secondary" type="button" onClick={() => setShowForm(false)}>
                  ביטול
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Search + filter */}
        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="חיפוש לפי תיאור..."
          />
          <div className="flex gap-2">
            {(['all', String(RequestType.Exclude), String(RequestType.Prefer)] as const).map((val) => {
              const label = val === 'all' ? 'הכל' : val === String(RequestType.Exclude) ? 'אי זמינות' : 'העדפה';
              const isActive = filterType === val;
              return (
                <button
                  key={val}
                  onClick={() => setFilterType(val)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-blue-500/80 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Requests list */}
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">הבקשות שלי</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">טוען...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">אין בקשות</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filteredRequests.map((req) => (
                <li
                  key={req.id}
                  className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setDialogRequest(req)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge type="request-type" value={req.type} />
                      </div>
                      <p className="text-sm text-gray-300">{req.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(req.startDate).toLocaleDateString('he-IL')} -{' '}
                        {new Date(req.endDate).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Algorithm explanation */}
        <GlassCard className="p-6" glow="blue">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">איך האלגוריתם עובד?</h3>
          </div>
          <div className="space-y-3">
            {[
              { icon: '\u{1F6AB}', text: 'בקשות אי זמינות מונעות שיבוץ בתאריכים אלו' },
              { icon: '\u{2B50}', text: 'בקשות העדפה נותנות עדיפות לשיבוץ בתאריכים אלו' },
              { icon: '\u{2696}\u{FE0F}', text: 'משתמשים עם פחות נקודות מקבלים עדיפות גבוהה יותר' },
              { icon: '\u{1F3AF}', text: 'ציון התאמה (0-100) מתחשב במאזן נקודות, שעות שבועיות והתנגשויות' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <p className="text-sm text-gray-300">{item.text}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Request Detail Dialog */}
      <ShiftDetailDialog
        request={dialogRequest}
        onClose={() => setDialogRequest(null)}
        onDeleteRequest={handleDeleteRequest}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
