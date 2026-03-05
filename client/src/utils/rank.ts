/**
 * Military rank derivation from recruitment date and user categories.
 */

interface RankInfo {
  rank: string;
  emoji: string;
  isKeva: boolean;
}

export function getRank(recruitmentDate?: string, userCategories: string[] = []): RankInfo {
  if (!recruitmentDate) {
    return { rank: 'טוראי', emoji: '', isKeva: false };
  }

  const now = new Date();
  const recruited = new Date(recruitmentDate);
  const months = (now.getFullYear() - recruited.getFullYear()) * 12 + (now.getMonth() - recruited.getMonth());

  const isOfficer = userCategories.some(c => c === 'קצין');
  const isKeva = userCategories.some(c => c === 'קבע') || months > 36;

  if (isKeva) {
    return { rank: 'קבע', emoji: '\u{1F396}\u{FE0F}', isKeva: true };
  }

  if (isOfficer) {
    if (months >= 18) return { rank: 'סרן', emoji: '\u{2B50}', isKeva: false };
    return { rank: 'סגן', emoji: '\u{2B50}', isKeva: false };
  }

  if (months >= 23) return { rank: 'סמ"ר', emoji: '\u{1F3C5}', isKeva: false };
  if (months >= 15) return { rank: 'סמל', emoji: '\u{1F530}', isKeva: false };
  if (months >= 7) return { rank: 'רב"ט', emoji: '\u{1F4A0}', isKeva: false };
  return { rank: 'טוראי', emoji: '', isKeva: false };
}
