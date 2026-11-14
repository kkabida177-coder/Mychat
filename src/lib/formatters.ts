import { Timestamp } from 'firebase/firestore';
import { Conversation, UserProfile } from '../types/chat';

export function timestampToMillis(ts?: Timestamp | null): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  return 0;
}

export function isUserActuallyOnline(profile?: UserProfile | null, nowMs = Date.now()): boolean {
  if (!profile || !profile.isOnline) return false;
  const lastSeenMs = timestampToMillis(profile.lastSeen);
  if (lastSeenMs === 0) return false;
  // Consider user online if active heartbeat was received within 2.5 minutes
  return nowMs - lastSeenMs <= 150_000;
}

export function isFriendTyping(
  conv: Conversation | null | undefined,
  currentUid: string,
  nowMs = Date.now()
): boolean {
  if (!conv) return false;
  if (conv.participantA === conv.participantB) return false;
  const typingTs = conv.participantA === currentUid ? conv.typingAtB : conv.typingAtA;
  const typingMs = timestampToMillis(typingTs);
  if (typingMs <= 0) return false;
  return nowMs - typingMs <= 5000;
}

export function formatMessageTime(ts?: Timestamp | null): string {
  if (!ts) return '';
  const date = ts.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatChatListTime(ts?: Timestamp | null): string {
  if (!ts) return '';
  const date = ts.toDate();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDayDivider(ts?: Timestamp | null): string {
  if (!ts) return 'Today';
  const date = ts.toDate();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatLastSeen(profile?: UserProfile | null, nowMs = Date.now()): string {
  if (!profile) return 'offline';
  if (isUserActuallyOnline(profile, nowMs)) return 'online';
  const lastSeenMs = timestampToMillis(profile.lastSeen);
  if (!lastSeenMs) return 'offline';

  const date = new Date(lastSeenMs);
  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86_400_000);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `last seen today at ${timeStr}`;
  if (diffDays === 1) return `last seen yesterday at ${timeStr}`;
  return `last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
