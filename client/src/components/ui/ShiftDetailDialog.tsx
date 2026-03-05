import { useState } from 'react';
import { X, MapPin, Clock, Calendar, Users, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Shift, Request, ShiftStatus, RequestType } from '@/types';
import { StatusBadge } from './StatusBadge';
import { GlassButton } from './GlassButton';

interface ShiftDetailDialogProps {
  shift?: Shift | null;
  request?: Request | null;
  onClose: () => void;
  onDeleteRequest?: (id: string) => void;
  isDeleting?: boolean;
  groupName?: string;
  /** Map of userId → display name for showing assigned users */
  userNames?: Record<string, string>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function ShiftDetailDialog({ shift, request, onClose, onDeleteRequest, isDeleting, groupName, userNames }: ShiftDetailDialogProps) {
  const [showUsers, setShowUsers] = useState(false);
  if (!shift && !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg glass-card border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {shift && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-white">{shift.displayName}</h2>
              <StatusBadge type="shift-status" value={shift.status} />
            </div>

            <div className="space-y-3">
              {groupName && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{groupName}</span>
                </div>
              )}
              {shift.groupName && !groupName && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{shift.groupName}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{formatDate(shift.startDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{formatTime(shift.startDate)} - {formatTime(shift.endDate)}</span>
              </div>
              {shift.location && (
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{shift.location}</span>
                </div>
              )}
              {shift.pointsPerHour > 0 && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-400">{shift.pointsPerHour} נקודות לשעה</p>
                </div>
              )}
              {shift.details && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400">{shift.details}</p>
                </div>
              )}
              {shift.users && shift.users.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowUsers(!showUsers)}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>{shift.users.length} משובצים</span>
                    {showUsers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showUsers && (
                    <div className="mt-2 space-y-1.5">
                      {shift.users.map((uid) => (
                        <div key={uid} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User className="w-3 h-3 text-blue-400" />
                          </div>
                          <span className="text-sm text-gray-300">{userNames?.[uid] ?? uid}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {request && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-white">
                {request.type === RequestType.Exclude ? 'בקשת אי זמינות' : 'בקשת העדפה'}
              </h2>
              <StatusBadge type="request-type" value={request.type} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </span>
              </div>
              {request.description && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-300">{request.description}</p>
                </div>
              )}
            </div>

            {onDeleteRequest && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <GlassButton
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => onDeleteRequest(request.id)}
                  disabled={isDeleting}
                  className="w-full"
                >
                  {isDeleting ? 'מוחק...' : 'מחק בקשה'}
                </GlassButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
