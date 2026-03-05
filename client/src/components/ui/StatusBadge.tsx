import { ShiftStatus, RequestType } from '@/types';

type BadgeType = 'shift-status' | 'request-type';

interface StatusBadgeProps {
  type: BadgeType;
  value: ShiftStatus | RequestType;
}

const shiftStatusConfig: Record<ShiftStatus, { label: string; className: string }> = {
  [ShiftStatus.Active]: {
    label: 'פעיל',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  [ShiftStatus.Finished]: {
    label: 'הסתיים',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
  [ShiftStatus.Cancelled]: {
    label: 'בוטל',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

const requestTypeConfig: Record<RequestType, { label: string; className: string }> = {
  [RequestType.Exclude]: {
    label: 'אי זמינות',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  [RequestType.Prefer]: {
    label: 'העדפה',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
};

export function StatusBadge({ type, value }: StatusBadgeProps) {
  const config = type === 'shift-status'
    ? shiftStatusConfig[value as ShiftStatus]
    : requestTypeConfig[value as RequestType];

  if (!config) return null;

  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
