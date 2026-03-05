import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus, Edit2, Trash2, Play, MapPin, Users } from 'lucide-react';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/groupAdmin/useTemplates';
import { useGroupCategories } from '@/hooks/groupAdmin/useGroupUsers';
import { Template } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { toast } from 'sonner';

function TemplateForm({
  groupId,
  initial,
  onSave,
  onCancel,
}: {
  groupId: string;
  initial?: Template;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { data: categories = [] } = useGroupCategories(groupId);
  const createTemplate = useCreateTemplate(groupId);
  const updateTemplate = useUpdateTemplate(groupId);

  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [numUsers, setNumUsers] = useState(initial?.numUsers ?? 2);
  const [location, setLocation] = useState(initial?.location ?? '');
  const [details, setDetails] = useState(initial?.details ?? '');
  const [included, setIncluded] = useState<string[]>(initial?.includedUserCategories ?? []);
  const [excluded, setExcluded] = useState<string[]>(initial?.excludedUserCategories ?? []);

  const toggleCat = (catId: string, field: 'included' | 'excluded') => {
    const setter = field === 'included' ? setIncluded : setExcluded;
    const opposite = field === 'included' ? setExcluded : setIncluded;
    setter(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);
    opposite(prev => prev.filter(id => id !== catId));
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) { toast.error('שם התבנית נדרש'); return; }
    const data = {
      displayName,
      points,
      numUsers,
      location,
      details,
      includedUserCategories: included,
      excludedUserCategories: excluded,
    };
    if (initial) {
      await updateTemplate.mutateAsync({ templateId: initial.id, data });
      toast.success('התבנית עודכנה');
    } else {
      await createTemplate.mutateAsync(data);
      toast.success('התבנית נוצרה');
    }
    onSave();
  };

  return (
    <GlassCard className="p-6" glow="blue">
      <h3 className="text-lg font-semibold text-white mb-4">
        {initial ? 'עריכת תבנית' : 'תבנית חדשה'}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">שם התבנית</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="glass-input" placeholder="שם התבנית" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberStepper
            value={points}
            onChange={setPoints}
            min={0}
            max={100}
            label="נקודות לשעה"
          />
          <NumberStepper
            value={numUsers}
            onChange={setNumUsers}
            min={1}
            max={50}
            label="מספר משתמשים"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">מיקום</label>
          <input value={location} onChange={e => setLocation(e.target.value)} className="glass-input" placeholder="מיקום המשמרת" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">פרטים נוספים</label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={2}
            className="glass-input resize-none"
            placeholder="הערות, הוראות..."
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">קטגוריות נדרשות</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.id, 'included')}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  included.includes(cat.id)
                    ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-green-500/30'
                }`}
              >
                {cat.displayName}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">קטגוריות אסורות</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.id, 'excluded')}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  excluded.includes(cat.id)
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-red-500/30'
                }`}
              >
                {cat.displayName}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <GlassButton onClick={handleSubmit} disabled={createTemplate.isPending || updateTemplate.isPending}>
            {initial ? 'עדכן' : 'צור'}
          </GlassButton>
          <GlassButton variant="secondary" onClick={onCancel}>ביטול</GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}

export function TemplatesPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useTemplates(groupId!);
  const { data: categories = [] } = useGroupCategories(groupId!);
  const deleteTemplate = useDeleteTemplate(groupId!);

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>();
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);

  const getCatName = (id: string) => categories.find(c => c.id === id)?.displayName ?? id;

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync(id);
    toast.success('התבנית נמחקה');
  };

  const handleUseTemplate = (t: Template) => {
    navigate(`/group-admin/${groupId}/CreateShift`, {
      state: {
        displayName: t.displayName,
        includedUserCategories: t.includedUserCategories,
        excludedUserCategories: t.excludedUserCategories,
        points: t.points,
        numUsers: t.numUsers,
        location: t.location,
        details: t.details,
      },
    });
  };

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<FileText className="w-5 h-5 text-white" />}
        title="תבניות משמרת"
        subtitle="ניהול תבניות ליצירה מהירה"
        actions={
          <GlassButton variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingTemplate(undefined); setShowForm(true); }}>
            תבנית חדשה
          </GlassButton>
        }
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {showForm && (
          <TemplateForm
            groupId={groupId!}
            initial={editingTemplate}
            onSave={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center text-gray-500 py-16">אין תבניות - צור תבנית חדשה</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {templates.map(t => (
              <GlassCard key={t.id} className="p-5 cursor-pointer" hover onClick={() => setDetailTemplate(t)}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-white">{t.displayName}</h3>
                  <span className="text-sm font-bold text-amber-400">{t.points} נק'</span>
                </div>
                {/* Extra info */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                  {t.numUsers && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {t.numUsers} משתמשים
                    </span>
                  )}
                  {t.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {t.location}
                    </span>
                  )}
                </div>
                {t.details && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-1">{t.details}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.includedUserCategories?.map(id => (
                    <span key={id} className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300">
                      {getCatName(id)}
                    </span>
                  ))}
                  {t.excludedUserCategories?.map(id => (
                    <span key={id} className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300">
                      {getCatName(id)}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleUseTemplate(t)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-300 rounded-lg hover:bg-blue-500/20 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    השתמש
                  </button>
                  <button
                    onClick={() => { setEditingTemplate(t); setShowForm(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    ערוך
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/10 text-red-300 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    מחק
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Template Detail Dialog */}
      {detailTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailTemplate(null)}
        >
          <div
            className="w-full max-w-md mx-4 bg-[#0f1729] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{detailTemplate.displayName}</h2>
              <p className="text-sm text-amber-400 mt-1">{detailTemplate.points} נק' לשעה</p>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {detailTemplate.numUsers && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>{detailTemplate.numUsers} משתמשים</span>
                </div>
              )}
              {detailTemplate.location && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span>{detailTemplate.location}</span>
                </div>
              )}
              {detailTemplate.details && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">פרטים נוספים</p>
                  <p className="text-sm text-gray-300">{detailTemplate.details}</p>
                </div>
              )}

              {/* Categories */}
              {((detailTemplate.includedUserCategories?.length ?? 0) > 0 || (detailTemplate.excludedUserCategories?.length ?? 0) > 0) && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">קטגוריות</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailTemplate.includedUserCategories?.map(id => (
                      <span key={id} className="px-2.5 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30">
                        {getCatName(id)}
                      </span>
                    ))}
                    {detailTemplate.excludedUserCategories?.map(id => (
                      <span key={id} className="px-2.5 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/30">
                        {getCatName(id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/10 flex gap-2">
              <button
                onClick={() => { handleUseTemplate(detailTemplate); setDetailTemplate(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
              >
                <Play className="w-4 h-4" />
                השתמש
              </button>
              <button
                onClick={() => { setEditingTemplate(detailTemplate); setShowForm(true); setDetailTemplate(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                ערוך
              </button>
              <button
                onClick={() => { handleDelete(detailTemplate.id); setDetailTemplate(null); }}
                className="px-4 py-2 text-sm bg-red-500/10 text-red-300 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
