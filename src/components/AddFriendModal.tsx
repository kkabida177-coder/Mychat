import { FormEvent, useEffect, useState } from 'react';
import { Check, Copy, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { lookupUserByUsername, sendFriendRequest } from '../lib/chatService';
import { isUserActuallyOnline } from '../lib/formatters';
import { FriendRequest, UserProfile } from '../types/chat';
import { Avatar } from './Avatar';

interface AddFriendModalProps {
  currentUser: UserProfile;
  friendUids: Set<string>;
  outgoingRequests: FriendRequest[];
  initialSearchUsername?: string;
  onClose: () => void;
  onStartChatWithFriend: (friendUid: string) => void;
}

export function AddFriendModal({
  currentUser,
  friendUids,
  outgoingRequests,
  initialSearchUsername = '',
  onClose,
  onStartChatWithFriend,
}: AddFriendModalProps) {
  const [queryText, setQueryText] = useState(initialSearchUsername);
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const inviteUrl = `${window.location.origin}/?add=${currentUser.username}`;

  const runSearch = async (usernameToSearch: string) => {
    const cleaned = usernameToSearch.trim().toLowerCase().replace(/^@+/, '');
    if (!cleaned) return;
    setSearching(true);
    setNotFound(false);
    setFoundUser(null);
    setFeedback(null);
    try {
      const result = await lookupUserByUsername(cleaned);
      if (result) {
        setFoundUser(result);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to search for username.',
      });
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (initialSearchUsername) {
      void runSearch(initialSearchUsername);
    }
  }, [initialSearchUsername]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(queryText);
  };

  const handleSendRequest = async (targetUid: string) => {
    setSending(true);
    setFeedback(null);
    try {
      await sendFriendRequest(currentUser.uid, targetUid);
      setFeedback({ type: 'success', text: 'Friend request sent!' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send friend request.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      setFeedback({ type: 'error', text: 'Could not copy invite link.' });
    }
  };

  const isSelf = foundUser?.uid === currentUser.uid;
  const isAlreadyFriend = foundUser ? friendUids.has(foundUser.uid) : false;
  const hasPendingOutgoing = foundUser
    ? outgoingRequests.some((r) => r.toUid === foundUser.uid && r.status === 'pending')
    : false;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add Friend"
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-[#008069] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5" />
            <h2 className="font-display text-lg font-semibold">Add a Friend</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add friend dialog"
            className="min-h-[44px] min-w-[44px] -mr-2 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="friend-username-input" className="block text-xs font-medium text-slate-600">
              Search by exact @username
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="friend-username-input"
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="e.g. alex_94"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !queryText.trim()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-sm font-semibold shrink-0 transition-colors disabled:opacity-50"
              >
                {searching ? 'Finding...' : 'Find'}
              </button>
            </div>
          </form>

          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-sm border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {notFound && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center space-y-1">
              <p className="text-sm font-medium text-slate-700">No user found for @{queryText.replace(/^@+/, '')}</p>
              <p className="text-xs text-slate-500">
                Ask your friend for their exact @username or share your invite link below.
              </p>
            </div>
          )}

          {foundUser && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={foundUser.photoURL}
                  name={foundUser.displayName}
                  size="md"
                  isOnline={isUserActuallyOnline(foundUser)}
                  showOnlineDot
                />
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm text-[#111B21] truncate">
                    {foundUser.displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">@{foundUser.username}</p>
                </div>
              </div>

              {isSelf ? (
                <span className="text-xs font-medium text-slate-500 shrink-0">That&apos;s you</span>
              ) : isAlreadyFriend ? (
                <button
                  type="button"
                  onClick={() => {
                    onStartChatWithFriend(foundUser.uid);
                    onClose();
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#008069] hover:bg-[#006B57] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Message</span>
                </button>
              ) : hasPendingOutgoing ? (
                <span className="text-xs font-medium text-[#008069] shrink-0">Request Sent</span>
              ) : (
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => handleSendRequest(foundUser.uid)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{sending ? 'Sending...' : 'Add Friend'}</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <p className="text-xs text-slate-500">
              Your username is <strong className="text-[#111B21]">@{currentUser.username}</strong>.
              Share your invite link so friends can connect with you instantly:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                aria-label="Shareable invite link"
                className="flex-1 min-h-[40px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 truncate"
              />
              <button
                type="button"
                onClick={handleCopyInvite}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedInvite ? (
                  <Check className="w-3.5 h-3.5 text-[#00A884]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedInvite ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
