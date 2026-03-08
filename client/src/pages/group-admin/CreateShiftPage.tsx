/**
 * CreateShiftPage — multi-step wizard with glass theme.
 *
 * Four steps: Basic Info -> Requirements -> Assignment -> Review & Submit.
 * Features: category conflict prevention, max user selection, shift splitting,
 *           end time sync, per-slot categories, download as image, template pre-fill.
 */
import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Clock, Users, Target, CheckCircle, ChevronRight, ChevronLeft, MapPin, Zap, Shield, Ban, User, Split, Download } from 'lucide-react';
import { useCreateShift } from '@/hooks/groupAdmin/useGroupShifts';
import { useGroupCategories } from '@/hooks/groupAdmin/useGroupUsers';
import { useAssignmentCandidates, useAutoAssignment } from '@/hooks/groupAdmin/useAssignment';
import { ShiftStatus, AssignmentShiftData, UserFitness } from '@/types';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassDatePicker } from '@/components/ui/GlassDatePicker';
import { NumberStepper } from '@/components/ui/NumberStepper';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShiftSplit {
  slotIndex: number;
  splitTime: string; // HH:mm
  firstHalfUser?: string;
  secondHalfUser?: string;
}

interface SlotRequirement {
  slotIndex: number;
  requiredCategories: string[];
}

interface ShiftDraft {
  displayName: string;
  location: string;
  startDate: string;
  startHour: string;
  endTime: string;
  duration: number;
  pointsPerHour: number;
  numUsers: number;
  details: string;
  requiredUserCategories: string[];
  forbiddenUserCategories: string[];
  slotRequirements: SlotRequirement[];
  selectedUsers: string[];
  assignmentType: 'manual' | 'automatic';
  splits: ShiftSplit[];
}

function computeEndTime(startHour: string, duration: number): string {
  const [h, m] = startHour.split(':').map(Number);
  const total = h * 60 + m + duration * 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function computeDuration(startHour: string, endTime: string): number {
  const [sh, sm] = startHour.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60; // overnight
  return Math.max(1, diff / 60);
}

const createInitialDraft = (): ShiftDraft => ({
  displayName: '',
  location: '',
  startDate: '',
  startHour: '08:00',
  endTime: '16:00',
  duration: 8,
  pointsPerHour: 1,
  numUsers: 2,
  details: '',
  requiredUserCategories: [],
  forbiddenUserCategories: [],
  slotRequirements: [],
  selectedUsers: [],
  assignmentType: 'automatic',
  splits: [],
});

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
function BasicInfoStep({
  draft,
  onChange,
  onNext,
}: {
  draft: ShiftDraft;
  onChange: (p: Partial<ShiftDraft>) => void;
  onNext: () => void;
}) {
  const canAdvance =
    draft.displayName.trim() && draft.startDate && draft.location.trim() && draft.duration > 0;

  const handleStartHourChange = (startHour: string) => {
    onChange({ startHour, endTime: computeEndTime(startHour, draft.duration) });
  };

  const handleEndTimeChange = (endTime: string) => {
    const duration = computeDuration(draft.startHour, endTime);
    onChange({ endTime, duration });
  };

  const handleDurationChange = (duration: number) => {
    onChange({ duration, endTime: computeEndTime(draft.startHour, duration) });
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">שם המשמרת *</label>
          <input
            value={draft.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="שם המשמרת"
            className="glass-input"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">מיקום *</label>
          <input
            value={draft.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="מיקום המשמרת"
            className="glass-input"
          />
        </div>
        <GlassDatePicker
          value={draft.startDate}
          onChange={(d) => onChange({ startDate: d })}
          label="תאריך *"
          placeholder="בחר תאריך"
        />
        <div>
          <label className="block text-sm text-gray-300 mb-1">שעת התחלה</label>
          <input
            type="time"
            value={draft.startHour}
            onChange={(e) => handleStartHourChange(e.target.value)}
            className="glass-input"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">שעת סיום</label>
          <input
            type="time"
            value={draft.endTime}
            onChange={(e) => handleEndTimeChange(e.target.value)}
            className="glass-input"
          />
        </div>
        <NumberStepper
          value={draft.duration}
          onChange={handleDurationChange}
          min={1}
          max={48}
          label="משך (שעות)"
        />
        <NumberStepper
          value={draft.pointsPerHour}
          onChange={(n) => onChange({ pointsPerHour: n })}
          min={0}
          max={100}
          label="נקודות לשעה"
        />
        <NumberStepper
          value={draft.numUsers}
          onChange={(n) => onChange({ numUsers: n })}
          min={1}
          max={50}
          label="מספר משתמשים נדרש"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1">פרטים נוספים</label>
        <textarea
          value={draft.details}
          onChange={(e) => onChange({ details: e.target.value })}
          rows={3}
          className="glass-input resize-none"
          placeholder="הערות, הוראות..."
        />
      </div>
      <div className="flex justify-start">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="glass-button-primary flex items-center gap-2"
        >
          הבא
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Requirements ─────────────────────────────────────────────────────
function RequirementsStep({
  draft,
  onChange,
  onNext,
  onBack,
  groupId,
}: {
  draft: ShiftDraft;
  onChange: (p: Partial<ShiftDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  groupId: string;
}) {
  const { data: categories = [] } = useGroupCategories(groupId);

  const toggle = (catId: string, field: 'requiredUserCategories' | 'forbiddenUserCategories') => {
    const current = draft[field];
    const oppositeField = field === 'requiredUserCategories' ? 'forbiddenUserCategories' : 'requiredUserCategories';

    if (current.includes(catId)) {
      onChange({ [field]: current.filter((id) => id !== catId) });
    } else {
      const updates: Partial<ShiftDraft> = {
        [field]: [...current, catId],
        [oppositeField]: draft[oppositeField].filter((id) => id !== catId),
      };
      // When forbidding a category, also remove it from all per-slot requirements
      if (field === 'forbiddenUserCategories') {
        updates.slotRequirements = draft.slotRequirements
          .map(sr => ({ ...sr, requiredCategories: sr.requiredCategories.filter(id => id !== catId) }))
          .filter(sr => sr.requiredCategories.length > 0);
      }
      onChange(updates);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          קטגוריות נדרשות
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isRequired = draft.requiredUserCategories.includes(cat.id);
            const isForbidden = draft.forbiddenUserCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggle(cat.id, 'requiredUserCategories')}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  isRequired
                    ? 'bg-green-500/20 text-green-300 border border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                    : isForbidden
                      ? 'bg-white/5 text-gray-500 border border-white/10 line-through opacity-50 cursor-not-allowed'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:border-green-500/40'
                }`}
              >
                {cat.displayName}
              </button>
            );
          })}
          {categories.length === 0 && (
            <p className="text-gray-500 text-sm">אין קטגוריות מוגדרות</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400" />
          קטגוריות אסורות
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isForbidden = draft.forbiddenUserCategories.includes(cat.id);
            const isRequired = draft.requiredUserCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggle(cat.id, 'forbiddenUserCategories')}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  isForbidden
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    : isRequired
                      ? 'bg-white/5 text-gray-500 border border-white/10 line-through opacity-50 cursor-not-allowed'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:border-red-500/40'
                }`}
              >
                {cat.displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-slot category requirements */}
      {categories.length > 0 && draft.numUsers > 1 && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            דרישות לפי עמדה
            <span className="text-xs text-gray-500">(אופציונלי)</span>
          </h3>
          <p className="text-xs text-gray-500 mb-3">בחר קטגוריה נדרשת עבור כל עמדה. קטגוריות אסורות ונדרשות גלובליות חלות תמיד.</p>
          <div className="space-y-2">
            {Array.from({ length: draft.numUsers }, (_, i) => {
              const slotReq = draft.slotRequirements.find(s => s.slotIndex === i);
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-xs text-gray-400 min-w-[50px]">עמדה {i + 1}</span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {categories.map((cat) => {
                      const isSelected = slotReq?.requiredCategories.includes(cat.id) ?? false;
                      const isForbidden = draft.forbiddenUserCategories.includes(cat.id);
                      const isGlobalRequired = draft.requiredUserCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={isForbidden}
                          onClick={() => {
                            if (isForbidden) return;
                            const current = slotReq?.requiredCategories ?? [];
                            const newCats = isSelected
                              ? current.filter(id => id !== cat.id)
                              : [...current, cat.id];
                            const newSlotReqs = draft.slotRequirements.filter(s => s.slotIndex !== i);
                            if (newCats.length > 0) {
                              newSlotReqs.push({ slotIndex: i, requiredCategories: newCats });
                            }
                            onChange({ slotRequirements: newSlotReqs });
                          }}
                          className={`px-2 py-1 rounded-full text-xs transition-all ${
                            isForbidden
                              ? 'bg-red-500/10 text-red-400/40 border border-red-500/20 line-through cursor-not-allowed'
                              : isSelected
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : isGlobalRequired
                                  ? 'bg-green-500/10 text-green-400/60 border border-green-500/20'
                                  : 'bg-white/5 border border-white/10 text-gray-400 hover:border-blue-500/30'
                          }`}
                          title={
                            isForbidden ? 'קטגוריה אסורה גלובלית' :
                            isGlobalRequired ? 'נדרשת גלובלית — חלה על כל העמדות' : undefined
                          }
                        >
                          {cat.displayName}
                          {isGlobalRequired && !isSelected && ' ✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          חזרה
        </button>
        <button
          onClick={onNext}
          className="glass-button-primary flex items-center gap-2"
        >
          הבא
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Assignment ───────────────────────────────────────────────────────

/** Candidate row used inside each slot's list */
function CandidateRow({ u, isSelected, disabled, onClick }: {
  u: UserFitness;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={disabled && !isSelected ? undefined : onClick}
      className={`flex items-center justify-between p-2.5 rounded-lg transition-all border ${
        isSelected
          ? 'bg-blue-500/10 border-blue-500/30 cursor-pointer'
          : disabled
            ? 'bg-white/[0.02] border-white/5 opacity-30 cursor-not-allowed'
            : u.isFit
              ? 'bg-white/5 border-white/10 hover:bg-white/[0.08] cursor-pointer'
              : 'bg-white/[0.02] border-white/5 opacity-50 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-500/20' : 'bg-white/10'}`}>
          <User className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{u.user.name}</p>
          <p className="text-[11px] text-gray-400">{u.currentPoints} נק' · {Math.round(u.weeklyHours)}ש' השבוע</p>
          {u.unfitReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {u.unfitReasons.map((reason, idx) => (
                <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          u.fitnessScore >= 70 ? 'bg-green-500/20 text-green-300' :
          u.fitnessScore >= 40 ? 'bg-amber-500/20 text-amber-300' :
          'bg-red-500/20 text-red-300'
        }`}>
          {u.fitnessScore}
        </span>
        {isSelected && <CheckCircle className="w-4 h-4 text-blue-400" />}
      </div>
    </div>
  );
}

function AssignmentStep({
  draft,
  onChange,
  onNext,
  onBack,
  groupId,
}: {
  draft: ShiftDraft;
  onChange: (p: Partial<ShiftDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  groupId: string;
}) {
  const [showSplit, setShowSplit] = useState(draft.splits.length > 0);

  const shiftData: AssignmentShiftData = {
    numUsers: draft.numUsers,
    requiredUserCategories: draft.requiredUserCategories,
    forbiddenUserCategories: draft.forbiddenUserCategories,
    startDate: draft.startDate,
    startHour: draft.startHour,
    duration: draft.duration,
  };

  const { data: candidatesData, isLoading } = useAssignmentCandidates(groupId, shiftData);
  const { data: categories = [] } = useGroupCategories(groupId);
  const autoAssign = useAutoAssignment(groupId);

  const allCandidates = candidatesData?.users ?? [];
  const sortedCandidates = [...allCandidates].sort((a, b) => {
    if (a.isFit !== b.isFit) return a.isFit ? -1 : 1;
    return b.fitnessScore - a.fitnessScore;
  });

  // Determine if we need per-slot view: only when slots have DIFFERENT categories
  const slotsWithCats = draft.slotRequirements.filter(sr => sr.requiredCategories.length > 0);
  const uniqueCatSets = new Set(slotsWithCats.map(sr => JSON.stringify([...sr.requiredCategories].sort())));
  const needsPerSlotView = uniqueCatSets.size > 1 || (slotsWithCats.length > 0 && slotsWithCats.length < draft.numUsers);

  // ── Normal mode helpers ──
  const toggleUser = (userId: string) => {
    const current = draft.selectedUsers;
    if (current.includes(userId)) {
      const updatedSplits = draft.splits.map(s => ({
        ...s,
        firstHalfUser: s.firstHalfUser === userId ? undefined : s.firstHalfUser,
        secondHalfUser: s.secondHalfUser === userId ? undefined : s.secondHalfUser,
      }));
      onChange({ selectedUsers: current.filter(id => id !== userId), assignmentType: 'manual', splits: updatedSplits });
    } else {
      onChange({ selectedUsers: [...current, userId], assignmentType: 'manual' });
    }
  };

  const handleAutoAssign = async () => {
    const result = await autoAssign.mutateAsync(shiftData);
    onChange({ selectedUsers: result.userIds, assignmentType: 'automatic' });
  };

  // ── Per-slot mode helpers ──
  const slotAssignments: string[] = Array.from({ length: draft.numUsers }, (_, i) => draft.selectedUsers[i] ?? '');

  const assignToSlot = (slotIndex: number, userId: string) => {
    const newSelected = [...draft.selectedUsers];
    const oldUser = slotAssignments[slotIndex];
    if (oldUser) {
      const oldIdx = newSelected.indexOf(oldUser);
      if (oldIdx >= 0) newSelected.splice(oldIdx, 1);
    }
    if (userId === oldUser) {
      const updatedSplits = draft.splits.map(s => ({
        ...s,
        firstHalfUser: s.firstHalfUser === oldUser ? undefined : s.firstHalfUser,
        secondHalfUser: s.secondHalfUser === oldUser ? undefined : s.secondHalfUser,
      }));
      onChange({ selectedUsers: newSelected, assignmentType: 'manual', splits: updatedSplits });
      return;
    }
    const existingIdx = newSelected.indexOf(userId);
    if (existingIdx >= 0) newSelected.splice(existingIdx, 1);
    newSelected.splice(slotIndex, 0, userId);
    onChange({ selectedUsers: newSelected.slice(0, draft.numUsers), assignmentType: 'manual' });
  };

  const getCandidatesForSlot = (slotIndex: number) => {
    const slotReq = draft.slotRequirements.find(sr => sr.slotIndex === slotIndex);
    const slotCats = slotReq?.requiredCategories ?? [];
    return [...allCandidates]
      .map(u => {
        if (slotCats.length > 0) {
          const userCats = u.user.userCategories ?? [];
          const hasSlotCat = slotCats.some(c => userCats.includes(c));
          if (!hasSlotCat) {
            return { ...u, slotFit: false, slotScore: Math.max(0, u.fitnessScore - 40) };
          }
        }
        return { ...u, slotFit: u.isFit, slotScore: u.fitnessScore };
      })
      .sort((a, b) => {
        if (a.slotFit !== b.slotFit) return a.slotFit ? -1 : 1;
        return b.slotScore - a.slotScore;
      });
  };

  // ── Shared helpers ──
  const toggleSplit = (slotIndex: number) => {
    const existing = draft.splits.find(s => s.slotIndex === slotIndex);
    if (existing) {
      onChange({ splits: draft.splits.filter(s => s.slotIndex !== slotIndex) });
    } else {
      const [h, m] = draft.startHour.split(':').map(Number);
      const halfDuration = draft.duration / 2;
      const splitH = h + Math.floor(halfDuration);
      const splitM = m + (halfDuration % 1) * 60;
      const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
      onChange({ splits: [...draft.splits, { slotIndex, splitTime: `${pad(splitH)}:${pad(splitM)}` }] });
    }
  };

  const updateSplitTime = (slotIndex: number, time: string) => {
    onChange({ splits: draft.splits.map(s => s.slotIndex === slotIndex ? { ...s, splitTime: time } : s) });
  };

  const updateSplitUser = (slotIndex: number, half: 'firstHalfUser' | 'secondHalfUser', userId: string) => {
    onChange({ splits: draft.splits.map(s => s.slotIndex === slotIndex ? { ...s, [half]: userId || undefined } : s) });
  };

  const totalNeeded = draft.numUsers + draft.splits.length;
  const isFull = draft.selectedUsers.length >= totalNeeded;
  const getCatNames = (ids: string[]) => ids.map(id => categories.find(c => c.id === id)?.displayName ?? id).join(', ');

  return (
    <div className="space-y-4">
      {/* Header with stats + auto assign */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-gray-400">
            {candidatesData?.fitUsers ?? 0} מתאימים מתוך {candidatesData?.totalUsers ?? 0} חברים
          </p>
          <p className={`text-sm font-medium ${isFull ? 'text-green-400' : 'text-gray-400'}`}>
            נבחרו {draft.selectedUsers.length}/{totalNeeded}
            {draft.splits.length > 0 && <span className="text-xs text-gray-500 mr-1">({draft.numUsers} + {draft.splits.length} פיצולים)</span>}
          </p>
        </div>
        {!needsPerSlotView && (
          <button
            onClick={handleAutoAssign}
            disabled={autoAssign.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg text-sm font-medium disabled:opacity-60 shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all"
          >
            <Target className="w-4 h-4" />
            {autoAssign.isPending ? 'מחשב...' : 'הקצאה אוטומטית'}
          </button>
        )}
      </div>

      {/* Split controls (normal mode only — per-slot mode has splits inline) */}
      {!needsPerSlotView && (
        <div>
          <button
            type="button"
            onClick={() => setShowSplit(!showSplit)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors mb-2"
          >
            <Split className="w-4 h-4 text-purple-400" />
            פיצול משמרות
            <ChevronLeft className={`w-3 h-3 transition-transform ${showSplit ? 'rotate-[-90deg]' : ''}`} />
          </button>
          {showSplit && (
            <GlassCard className="p-4">
              <div className="space-y-3">
                {Array.from({ length: draft.numUsers }, (_, i) => {
                  const split = draft.splits.find(s => s.slotIndex === i);
                  return (
                    <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-gray-400 w-16">עמדה {i + 1}</span>
                        <button type="button" onClick={() => toggleSplit(i)} className={`text-xs px-3 py-1 rounded-full transition-all ${split ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-purple-500/30'}`}>
                          {split ? 'מפוצל' : 'פצל'}
                        </button>
                        {split && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">זמן פיצול:</span>
                            <input type="time" value={split.splitTime} onChange={(e) => updateSplitTime(i, e.target.value)} className="glass-input py-1 px-2 text-xs w-28" />
                          </div>
                        )}
                      </div>
                      {split && draft.selectedUsers.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">חלק א׳ ({draft.startHour} - {split.splitTime})</label>
                            <select value={split.firstHalfUser ?? ''} onChange={(e) => updateSplitUser(i, 'firstHalfUser', e.target.value)} className="glass-input py-1.5 px-2 text-xs w-full">
                              <option value="">בחר משתמש</option>
                              {draft.selectedUsers.map(uid => { const u = sortedCandidates.find(c => c.user.id === uid); return <option key={uid} value={uid}>{u?.user.name ?? uid}</option>; })}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">חלק ב׳ ({split.splitTime} - {computeEndTime(draft.startHour, draft.duration)})</label>
                            <select value={split.secondHalfUser ?? ''} onChange={(e) => updateSplitUser(i, 'secondHalfUser', e.target.value)} className="glass-input py-1.5 px-2 text-xs w-full">
                              <option value="">בחר משתמש</option>
                              {draft.selectedUsers.map(uid => { const u = sortedCandidates.find(c => c.user.id === uid); return <option key={uid} value={uid}>{u?.user.name ?? uid}</option>; })}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-500 py-8">טוען מועמדים...</div>
      ) : needsPerSlotView ? (
        /* ── Per-slot view: different categories per slot ── */
        <div className="space-y-4">
          {Array.from({ length: draft.numUsers }, (_, slotIdx) => {
            const slotReq = draft.slotRequirements.find(sr => sr.slotIndex === slotIdx);
            const slotCatNames = slotReq ? getCatNames(slotReq.requiredCategories) : '';
            const currentUser = slotAssignments[slotIdx];
            const split = draft.splits.find(s => s.slotIndex === slotIdx);
            const candidates = getCandidatesForSlot(slotIdx);

            return (
              <GlassCard key={slotIdx} className="overflow-hidden">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">עמדה {slotIdx + 1}</span>
                    {slotCatNames && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">{slotCatNames}</span>
                    )}
                    {currentUser && <span className="text-xs text-green-400">✓</span>}
                  </div>
                  <button type="button" onClick={() => toggleSplit(slotIdx)} className={`text-xs px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${split ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-purple-500/30'}`}>
                    <Split className="w-3 h-3" />
                    {split ? 'מפוצל' : 'פצל'}
                  </button>
                </div>
                {split && (
                  <div className="px-3 py-2 bg-purple-500/5 border-b border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">זמן פיצול:</span>
                      <input type="time" value={split.splitTime} onChange={(e) => updateSplitTime(slotIdx, e.target.value)} className="glass-input py-1 px-2 text-xs w-28" />
                    </div>
                    {currentUser && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">חלק א׳ ({draft.startHour} - {split.splitTime})</label>
                          <select value={split.firstHalfUser ?? ''} onChange={(e) => updateSplitUser(slotIdx, 'firstHalfUser', e.target.value)} className="glass-input py-1.5 px-2 text-xs w-full">
                            <option value="">בחר משתמש</option>
                            {draft.selectedUsers.map(uid => { const u = allCandidates.find(c => c.user.id === uid); return <option key={uid} value={uid}>{u?.user.name ?? uid}</option>; })}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">חלק ב׳ ({split.splitTime} - {computeEndTime(draft.startHour, draft.duration)})</label>
                          <select value={split.secondHalfUser ?? ''} onChange={(e) => updateSplitUser(slotIdx, 'secondHalfUser', e.target.value)} className="glass-input py-1.5 px-2 text-xs w-full">
                            <option value="">בחר משתמש</option>
                            {draft.selectedUsers.map(uid => { const u = allCandidates.find(c => c.user.id === uid); return <option key={uid} value={uid}>{u?.user.name ?? uid}</option>; })}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                  {candidates.map((u) => {
                    const isSelectedHere = currentUser === u.user.id;
                    const isSelectedElsewhere = !isSelectedHere && slotAssignments.includes(u.user.id);
                    return (
                      <CandidateRow
                        key={u.user.id}
                        u={{ ...u, isFit: u.slotFit, fitnessScore: u.slotScore }}
                        isSelected={isSelectedHere}
                        disabled={isSelectedElsewhere}
                        onClick={() => assignToSlot(slotIdx, u.user.id)}
                      />
                    );
                  })}
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        /* ── Normal view: single candidate list ── */
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {sortedCandidates.map((u: UserFitness) => {
            const isSelected = draft.selectedUsers.includes(u.user.id);
            return (
              <CandidateRow
                key={u.user.id}
                u={u}
                isSelected={isSelected}
                disabled={false}
                onClick={() => toggleUser(u.user.id)}
              />
            );
          })}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          חזרה
        </button>
        <button
          onClick={onNext}
          className="glass-button-primary flex items-center gap-2"
        >
          סיכום
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────
function ReviewStep({
  draft,
  onBack,
  onSubmit,
  isSubmitting,
  groupId,
}: {
  draft: ShiftDraft;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  groupId: string;
}) {
  const reviewRef = useRef<HTMLDivElement>(null);
  const { data: categories = [] } = useGroupCategories(groupId);
  const { data: candidatesData } = useAssignmentCandidates(groupId, {
    numUsers: draft.numUsers,
    requiredUserCategories: draft.requiredUserCategories,
    forbiddenUserCategories: draft.forbiddenUserCategories,
    startDate: draft.startDate,
    startHour: draft.startHour,
    duration: draft.duration,
  });

  const getCatName = (id: string) => categories.find((c) => c.id === id)?.displayName ?? id;
  const getUser = (id: string) => candidatesData?.users.find((u: UserFitness) => u.user.id === id);
  const getUserName = (id: string) => getUser(id)?.user.name ?? id;

  const totalPoints = draft.pointsPerHour * draft.duration;
  const hebrewDate = draft.startDate
    ? new Date(draft.startDate + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const endTime = computeEndTime(draft.startHour, draft.duration);

  const handleDownloadImage = async () => {
    if (!reviewRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = reviewRef.current;
      // Temporarily set fixed width for consistent capture
      const origWidth = el.style.width;
      el.style.width = '560px';
      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#0b1120',
        width: 560,
        scrollX: 0,
        scrollY: -window.scrollY,
      });
      el.style.width = origWidth;
      const link = document.createElement('a');
      link.download = `${draft.displayName || 'shift'}-review.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('התמונה הורדה');
    } catch {
      toast.error('שגיאה בהורדת התמונה');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleDownloadImage}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          הורד כתמונה
        </button>
      </div>

      <div ref={reviewRef} dir="rtl" className="space-y-4" style={{ width: '100%', maxWidth: 560, padding: '16px', textAlign: 'right' }}>
        {/* Shift info card */}
        <GlassCard className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">{draft.displayName || 'משמרת חדשה'}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-300">
              <MapPin className="w-3.5 h-3.5" />
              {draft.location}
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-300">{hebrewDate}</p>
          </div>
        </GlassCard>

        {/* Time card */}
        <GlassCard className="p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            זמנים
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gradient-to-r from-blue-500/20 to-blue-500/5 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-300">{draft.startHour}</p>
              <p className="text-xs text-gray-500">התחלה</p>
            </div>
            <div className="text-gray-600">&rarr;</div>
            <div className="flex-1 bg-gradient-to-r from-blue-500/5 to-blue-500/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-300">{endTime}</p>
              <p className="text-xs text-gray-500">סיום</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-blue-400">{draft.duration}ש'</p>
              <p className="text-xs text-gray-500">משך</p>
            </div>
          </div>
        </GlassCard>

        {/* Categories */}
        {(draft.requiredUserCategories.length > 0 || draft.forbiddenUserCategories.length > 0) && (
          <GlassCard className="p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-3">קטגוריות</h4>
            <div className="flex flex-wrap gap-2">
              {draft.requiredUserCategories.map(id => (
                <span key={id} className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30">
                  {getCatName(id)}
                </span>
              ))}
              {draft.forbiddenUserCategories.map(id => (
                <span key={id} className="px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/30">
                  {getCatName(id)}
                </span>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Per-slot categories */}
        {draft.slotRequirements.length > 0 && (
          <GlassCard className="p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              דרישות לפי עמדה
            </h4>
            <div className="space-y-2">
              {draft.slotRequirements.map((sr) => (
                <div key={sr.slotIndex} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                  <span className="text-xs text-gray-400">עמדה {sr.slotIndex + 1}:</span>
                  <div className="flex flex-wrap gap-1">
                    {sr.requiredCategories.map(id => (
                      <span key={id} className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {getCatName(id)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Assignment card */}
        <GlassCard className="p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            שיבוץ ({draft.selectedUsers.length}/{draft.numUsers})
          </h4>
          {draft.selectedUsers.length === 0 ? (
            <p className="text-sm text-gray-500">לא נבחרו משתמשים</p>
          ) : (
            <div className="space-y-2">
              {draft.selectedUsers.map((id) => {
                const u = getUser(id);
                return (
                  <div key={id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="text-sm text-white">{getUserName(id)}</span>
                    </div>
                    {u && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.fitnessScore >= 70 ? 'bg-green-500/20 text-green-300' :
                        u.fitnessScore >= 40 ? 'bg-amber-500/20 text-amber-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {u.fitnessScore}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {draft.splits.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-purple-300">פיצולים:</p>
              {draft.splits.map((split) => (
                <div key={split.slotIndex} className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-300 mb-1">עמדה {split.slotIndex + 1} — פיצול ב-{split.splitTime}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 rounded p-1.5">
                      <span className="text-gray-500">חלק א׳ ({draft.startHour}-{split.splitTime}):</span>
                      <span className="text-white mr-1">{split.firstHalfUser ? getUserName(split.firstHalfUser) : 'לא שובץ'}</span>
                    </div>
                    <div className="bg-white/5 rounded p-1.5">
                      <span className="text-gray-500">חלק ב׳ ({split.splitTime}-{endTime}):</span>
                      <span className="text-white mr-1">{split.secondHalfUser ? getUserName(split.secondHalfUser) : 'לא שובץ'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Points card */}
        <GlassCard className="p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            נקודות
          </h4>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-300">{draft.pointsPerHour} נק'/שעה</span>
            <span className="text-gray-600">&times;</span>
            <span className="text-gray-300">{draft.duration} שעות</span>
            <span className="text-gray-600">=</span>
            <span className="text-lg font-bold text-amber-400">{totalPoints} נק'</span>
          </div>
        </GlassCard>

        {draft.details && (
          <GlassCard className="p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">פרטים נוספים</h4>
            <p className="text-sm text-gray-300">{draft.details}</p>
          </GlassCard>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          חזרה
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg text-sm font-medium shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all disabled:opacity-60"
        >
          <CheckCircle className="w-4 h-4" />
          {isSubmitting ? 'יוצר...' : 'צור משמרת'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'basic', label: 'מידע בסיסי', icon: Clock },
  { key: 'requirements', label: 'דרישות', icon: Users },
  { key: 'assignment', label: 'הקצאה', icon: Target },
  { key: 'review', label: 'סיכום', icon: CheckCircle },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export function CreateShiftPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<StepKey>('basic');

  // Pre-fill from template if navigated with state
  const getInitialDraft = useCallback((): ShiftDraft => {
    const template = (location.state as any)?.template ?? location.state;
    const draft = createInitialDraft();
    if (template) {
      if (template.templateName || template.displayName) draft.displayName = template.templateName || template.displayName;
      if (template.includedCategories || template.includedUserCategories) draft.requiredUserCategories = template.includedCategories || template.includedUserCategories || [];
      if (template.excludedCategories || template.excludedUserCategories) draft.forbiddenUserCategories = template.excludedCategories || template.excludedUserCategories || [];
      if (template.pointsPerHour || template.points) draft.pointsPerHour = template.pointsPerHour || template.points;
      if (template.numUsers) draft.numUsers = template.numUsers;
      if (template.location) draft.location = template.location;
      if (template.details) draft.details = template.details;
    }
    return draft;
  }, [location.state]);

  const [draft, setDraft] = useState<ShiftDraft>(getInitialDraft);
  const createShift = useCreateShift(groupId!);

  const update = (partial: Partial<ShiftDraft>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const handleSubmit = async () => {
    const [hours, minutes] = draft.startHour.split(':').map(Number);
    const startDate = new Date(draft.startDate);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + draft.duration);

    await createShift.mutateAsync({
      displayName: draft.displayName,
      location: draft.location,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration: draft.duration,
      pointsPerHour: draft.pointsPerHour,
      numUsers: draft.numUsers,
      details: draft.splits.length > 0
        ? JSON.stringify({ text: draft.details, splits: draft.splits })
        : draft.details,
      requiredUserCategories: draft.requiredUserCategories,
      forbiddenUserCategories: draft.forbiddenUserCategories,
      users: draft.selectedUsers,
      status: ShiftStatus.Active,
    });

    navigate(`/group-admin/${groupId}/dashboard`);
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<Clock className="w-5 h-5 text-white" />}
        title="יצירת משמרת"
        subtitle="מילוי פרטי המשמרת צעד אחר צעד"
      />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Step tabs */}
        <GlassCard className="p-1 mb-8">
          <div className="grid grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = s.key === step;
              const isDone = i < stepIndex;
              return (
                <button
                  key={s.key}
                  onClick={() => i <= stepIndex && setStep(s.key)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs transition-all ${
                    isActive ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
                    isDone ? 'text-green-400 hover:bg-white/5' :
                    'text-gray-500'
                  }`}
                >
                  {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Step content */}
        <GlassCard className="p-6">
          {step === 'basic' && (
            <BasicInfoStep draft={draft} onChange={update} onNext={() => setStep('requirements')} />
          )}
          {step === 'requirements' && (
            <RequirementsStep
              draft={draft}
              onChange={update}
              onNext={() => setStep('assignment')}
              onBack={() => setStep('basic')}
              groupId={groupId!}
            />
          )}
          {step === 'assignment' && (
            <AssignmentStep
              draft={draft}
              onChange={update}
              onNext={() => setStep('review')}
              onBack={() => setStep('requirements')}
              groupId={groupId!}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              draft={draft}
              onBack={() => setStep('assignment')}
              onSubmit={handleSubmit}
              isSubmitting={createShift.isPending}
              groupId={groupId!}
            />
          )}
        </GlassCard>
      </div>
    </div>
  );
}
