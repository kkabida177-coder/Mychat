import { useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  CheckCheck,
  LogOut,
  MessageCircle,
  Palette,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  formatChatListTime,
  formatLastSeen,
  isFriendTyping,
  isUserActuallyOnline,
  timestampToMillis,
} from '../lib/formatters';
import { Conversation, FriendEntry, FriendRequest, UserProfile } from '../types/chat';
import { Avatar } from './Avatar';

type SidebarTab = 'chats' | 'friends' | 'requests';

interface SidebarProps {
  currentUser: UserProfile;
  conversations: Conversation[];
  friends: FriendEntry[];
  profilesMap: Record<string, UserProfile>;
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  activeConversationId: string | null;
  nowMs: number;
  onSelectConversation: (conversationId: string) => void;
  onStartChatWithFriend: (friendUid: string) => void;
  onOpenSelfChat: () => void;
  onOpenProfile: () => void;
  onOpenWallpaper: () => void;
  onOpenAddFriend: () => void;
  onAcceptRequest: (request: FriendRequest) => Promise<void>;
  onDeclineRequest: (requestId: string) => Promise<void>;
  onCancelRequest: (requestId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function Sidebar({
  currentUser,
  conversations,
  friends,
  profilesMap,
  incomingRequests,
  outgoingRequests,
  activeConversationId,
  nowMs,
  onSelectConversation,
  onStartChatWithFriend,
  onOpenSelfChat,
  onOpenProfile,
  onOpenWallpaper,
  onOpenAddFriend,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  onSignOut,
}: SidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('chats');
  const [search, setSearch] = useState('');
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const pendingIncoming = useMemo(
    () => incomingRequests.filter((r) => r.status === 'pending'),
    [incomingRequests]
  );
  const pendingOutgoing = useMemo(
    () => outgoingRequests.filter((r) => r.status === 'pending'),
    [outgoingRequests]
  );

  const sortedConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...conversations]
      .sort((a, b) => timestampToMillis(b.lastMessageAt) - timestampToMillis(a.lastMessageAt))
      .filter((conv) => {
        if (!q) return true;
        const isSelf = conv.participantA === conv.participantB;
        if (isSelf) {
          return (
            'saved messages'.includes(q) ||
            'you'.includes(q) ||
            conv.lastMessageText.toLowerCase().includes(q)
          );
        }
        const otherUid =
          conv.participantA === currentUser.uid ? conv.participantB : conv.participantA;
        const other = profilesMap[otherUid];
        return (
          other?.displayName.toLowerCase().includes(q) ||
          other?.username.toLowerCase().includes(q) ||
          conv.lastMessageText.toLowerCase().includes(q)
        );
      });
  }, [conversations, currentUser.uid, profilesMap, search]);

  const sortedFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...friends]
      .map((f) => ({
        entry: f,
        profile: profilesMap[f.friendUid],
      }))
      .filter(({ profile }) => {
        if (!q) return true;
        if (!profile) return false;
        return (
          profile.displayName.toLowerCase().includes(q) ||
          profile.username.toLowerCase().includes(q) ||
          profile.bio.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const onlineA = isUserActuallyOnline(a.profile, nowMs) ? 1 : 0;
        const onlineB = isUserActuallyOnline(b.profile, nowMs) ? 1 : 0;
        if (onlineA !== onlineB) return onlineB - onlineA;
        return (a.profile?.displayName || '').localeCompare(b.profile?.displayName || '');
      });
  }, [friends, nowMs, profilesMap, search]);

  const handleAccept = async (req: FriendRequest) => {
    setBusyRequestId(req.id);
    try {
      await onAcceptRequest(req);
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDecline = async (reqId: string) => {
    setBusyRequestId(reqId);
    try {
      await onDeclineRequest(reqId);
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleCancel = async (reqId: string) => {
    setBusyRequestId(reqId);
    try {
      await onCancelRequest(reqId);
    } finally {
      setBusyRequestId(null);
    }
  };

  return (
    <aside className="w-full md:w-[370px] lg:w-[400px] h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Top Emerald Brand & Profile Bar */}
      <header className="bg-[#008069] text-white px-4 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Open your profile and settings"
            className="min-h-[44px] min-w-[44px] -ml-1.5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Avatar src={currentUser.photoURL} name={currentUser.displayName} size="sm" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight leading-none truncate">
              My Chat
            </h1>
            <p className="text-[11px] text-emerald-100/90 truncate mt-1">
              @{currentUser.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenWallpaper}
            title="Chat Wallpaper Settings"
            aria-label="Chat Wallpaper Settings"
            className="min-h-[44px] min-w-[44px] rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <Palette className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenAddFriend}
            title="Add Friend"
            aria-label="Add Friend"
            className="min-h-[44px] min-w-[44px] rounded-full hover:bg-white/15 flex items-center justify-center transition-colors relative"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out"
            aria-label="Sign Out"
            className="min-h-[44px] min-w-[44px] -mr-1.5 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Search & Segmented Tabs */}
      <div className="p-3 border-b border-slate-100 space-y-2.5 bg-white shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === 'chats'
                ? 'Search chats or messages...'
                : tab === 'friends'
                  ? 'Search friends...'
                  : 'Filter requests...'
            }
            aria-label="Search sidebar"
            className="w-full min-h-[40px] pl-10 pr-9 py-1.5 text-sm bg-[#F0F2F5] rounded-xl text-[#111B21] placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/35"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-[#F0F2F5] rounded-xl">
          <button
            type="button"
            onClick={() => setTab('chats')}
            className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              tab === 'chats'
                ? 'bg-white text-[#008069] shadow-2xs'
                : 'text-slate-600 hover:text-[#111B21]'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('friends')}
            className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              tab === 'friends'
                ? 'bg-white text-[#008069] shadow-2xs'
                : 'text-slate-600 hover:text-[#111B21]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends</span>
            {friends.length > 0 && (
              <span className="text-[11px] text-slate-400 tabular-nums">({friends.length})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              tab === 'requests'
                ? 'bg-white text-[#008069] shadow-2xs'
                : 'text-slate-600 hover:text-[#111B21]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Requests</span>
            {pendingIncoming.length > 0 && (
              <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#00A884] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                {pendingIncoming.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Content List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
        {tab === 'chats' && (
          <>
            {sortedConversations.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-[#E7F8F0] text-[#008069] flex items-center justify-center mx-auto">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-display font-semibold text-sm text-[#111B21]">
                    {search ? 'No matching chats' : 'Start a conversation'}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {search
                      ? 'Try a different friend name or message keyword.'
                      : 'Add a friend by their @username or open Saved Messages to jot notes.'}
                  </p>
                </div>
                {!search && (
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onOpenAddFriend}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-xs font-semibold transition-colors"
                    >
                      Add Friend
                    </button>
                    <button
                      type="button"
                      onClick={onOpenSelfChat}
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                    >
                      Open Saved Messages
                    </button>
                  </div>
                )}
              </div>
            ) : (
              sortedConversations.map((conv) => {
                const isSelf = conv.participantA === conv.participantB;
                const otherUid =
                  conv.participantA === currentUser.uid ? conv.participantB : conv.participantA;
                const otherProfile = isSelf ? currentUser : profilesMap[otherUid];
                const isSelected = conv.id === activeConversationId;
                const isOnline = isSelf ? false : isUserActuallyOnline(otherProfile, nowMs);
                const typing = isFriendTyping(conv, currentUser.uid, nowMs);

                const unreadCount = isSelf
                  ? 0
                  : currentUser.uid === conv.participantA
                    ? conv.unreadA
                    : conv.unreadB;

                const isOwnLastMsg = conv.lastMessageSenderId === currentUser.uid;
                const otherLastRead =
                  currentUser.uid === conv.participantA ? conv.lastReadAtB : conv.lastReadAtA;
                const isLastMsgRead =
                  isSelf ||
                  timestampToMillis(otherLastRead) >= timestampToMillis(conv.lastMessageAt);

                const displayName = isSelf
                  ? 'Saved Messages (You)'
                  : otherProfile?.displayName || 'My Chat User';

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full px-4 py-3.5 flex items-center gap-3.5 text-left transition-colors min-h-[72px] ${
                      isSelected ? 'bg-[#E9F7F1]' : 'hover:bg-slate-50/90'
                    }`}
                  >
                    {isSelf ? (
                      <div className="h-12 w-12 rounded-full bg-[#008069] text-white flex items-center justify-center shrink-0">
                        <Bookmark className="w-5 h-5" />
                      </div>
                    ) : (
                      <Avatar
                        src={otherProfile?.photoURL}
                        name={displayName}
                        size="md"
                        isOnline={isOnline}
                        showOnlineDot
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display font-semibold text-[15px] text-[#111B21] truncate">
                          {displayName}
                        </span>
                        <span
                          className={`text-[11px] shrink-0 tabular-nums ${
                            unreadCount > 0 ? 'text-[#00A884] font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {formatChatListTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-1 min-w-0 text-[13px] text-slate-500">
                          {typing ? (
                            <span className="text-[#00A884] font-medium truncate">typing...</span>
                          ) : conv.lastMessageText ? (
                            <>
                              {isOwnLastMsg && !isSelf && (
                                isLastMsgRead ? (
                                  <CheckCheck className="w-4 h-4 text-[#0284C7] shrink-0" />
                                ) : (
                                  <Check className="w-4 h-4 text-slate-400 shrink-0" />
                                )
                              )}
                              <span className="truncate">{conv.lastMessageText}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic truncate">
                              {isSelf ? 'Jot down notes or reminders' : 'Say hello!'}
                            </span>
                          )}
                        </div>

                        {unreadCount > 0 && (
                          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#00A884] text-white text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}

        {tab === 'friends' && (
          <div className="divide-y divide-slate-100">
            <div className="p-3 bg-slate-50/70">
              <button
                type="button"
                onClick={onOpenAddFriend}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Friend by @username</span>
              </button>
            </div>

            {/* Saved Messages quick entry */}
            <button
              type="button"
              onClick={onOpenSelfChat}
              className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="h-11 w-11 rounded-full bg-[#008069] text-white flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm text-[#111B21]">
                  Saved Messages (You)
                </p>
                <p className="text-xs text-slate-500 truncate">Personal notes &amp; quick drafts</p>
              </div>
            </button>

            {sortedFriends.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="font-display font-semibold text-sm text-slate-700">
                  {search ? 'No friends match your search' : 'No friends added yet'}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Share your username <strong>@{currentUser.username}</strong> or click &ldquo;Add
                  Friend&rdquo; above to connect.
                </p>
              </div>
            ) : (
              sortedFriends.map(({ entry, profile }) => {
                const online = isUserActuallyOnline(profile, nowMs);
                const name = profile?.displayName || 'Friend';
                return (
                  <button
                    key={entry.friendUid}
                    type="button"
                    onClick={() => onStartChatWithFriend(entry.friendUid)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar
                        src={profile?.photoURL}
                        name={name}
                        size="md"
                        isOnline={online}
                        showOnlineDot
                      />
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-sm text-[#111B21] truncate">
                          {name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          @{profile?.username || '...'} ·{' '}
                          <span className={online ? 'text-[#00A884] font-medium' : ''}>
                            {online ? 'Online' : formatLastSeen(profile, nowMs)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#008069] shrink-0">Chat</span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="p-4 space-y-6">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Incoming Requests ({pendingIncoming.length})
                </h2>
                <button
                  type="button"
                  onClick={onOpenAddFriend}
                  className="text-xs font-semibold text-[#008069] hover:underline"
                >
                  + Add Friend
                </button>
              </div>

              {pendingIncoming.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-center text-xs text-slate-500">
                  No pending incoming friend requests.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingIncoming.map((req) => {
                    const sender = profilesMap[req.fromUid];
                    const isBusy = busyRequestId === req.id;
                    return (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={sender?.photoURL}
                            name={sender?.displayName || 'User'}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-display font-semibold text-sm text-[#111B21] truncate">
                              {sender?.displayName || 'My Chat User'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              @{sender?.username || '...'} wants to connect
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDecline(req.id)}
                            className="min-h-[40px] rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAccept(req)}
                            className="min-h-[40px] rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-xs font-semibold disabled:opacity-60"
                          >
                            {isBusy ? 'Accepting...' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <h2 className="font-display text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sent Requests ({pendingOutgoing.length})
              </h2>

              {pendingOutgoing.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-center text-xs text-slate-500">
                  No outgoing friend requests waiting.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingOutgoing.map((req) => {
                    const recipient = profilesMap[req.toUid];
                    const isBusy = busyRequestId === req.id;
                    return (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={recipient?.photoURL}
                            name={recipient?.displayName || 'User'}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-display font-semibold text-sm text-[#111B21] truncate">
                              {recipient?.displayName || 'My Chat User'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              @{recipient?.username || '...'} · Pending
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleCancel(req.id)}
                          className="min-h-[38px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 shrink-0 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
