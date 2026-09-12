'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import type {
  ReferralStatus,
  FollowUpStatus,
  ConsultationStatus,
  TriageSeverity,
  PriorityLevel,
} from '@/lib/constants';

type StatusType =
  | { kind: 'referral'; value: ReferralStatus }
  | { kind: 'followUp'; value: FollowUpStatus }
  | { kind: 'consultation'; value: ConsultationStatus }
  | { kind: 'triage'; value: TriageSeverity }
  | { kind: 'priority'; value: PriorityLevel };

const statusColors: Record<string, string> = {
  // Referral statuses
  created: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  acknowledged: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
  arrived: 'bg-teal-100 text-teal-800 border-teal-200',
  in_treatment: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-orange-100 text-orange-800 border-orange-200',

  // Follow-up statuses
  upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
  due: 'bg-amber-100 text-amber-800 border-amber-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  missed: 'bg-red-200 text-red-900 border-red-300',

  // Consultation statuses
  requested: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  queued: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-emerald-100 text-emerald-800 border-emerald-200',

  // Triage severity
  mild: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  emergency: 'bg-red-100 text-red-800 border-red-200',

  // Priority
  routine: 'bg-gray-100 text-gray-700 border-gray-200',
  urgent: 'bg-orange-100 text-orange-800 border-orange-200',
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: 'sm' | 'default';
}

/**
 * Shared status badge component that renders consistent status indicators
 * across all role interfaces.
 */
export function StatusBadge({ status, className = '', size = 'default' }: StatusBadgeProps) {
  const { t } = useI18n();
  const colorClass = statusColors[status.value] ?? 'bg-gray-100 text-gray-600';

  const labelMap: Record<string, string> = {
    referral: `referral.status.${status.value}`,
    followUp: `followUp.status.${status.value}`,
    consultation: status.value, // direct display
    triage: `triage.result.${status.value}`,
    priority: status.value,
  };

  const labelKey = labelMap[status.kind] ?? status.value;
  const label = t(labelKey) !== labelKey ? t(labelKey) : status.value.replace(/_/g, ' ');

  return (
    <Badge
      variant="outline"
      className={`${colorClass} ${size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2.5 py-0.5'} font-medium capitalize border ${className}`}
    >
      {label}
    </Badge>
  );
}

/**
 * Simple connection status indicator
 */
export function ConnectionStatus({
  state,
}: {
  state: 'connected' | 'reconnecting' | 'offline';
}) {
  const { t } = useI18n();

  const config = {
    connected: {
      color: 'bg-emerald-500',
      label: t('common.online'),
    },
    reconnecting: {
      color: 'bg-amber-500 animate-pulse',
      label: t('common.connecting'),
    },
    offline: {
      color: 'bg-red-500',
      label: t('common.offline'),
    },
  };

  const { color, label } = config[state];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
