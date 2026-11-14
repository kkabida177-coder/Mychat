import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  CheckCheck,
  Copy,
  Info,
  Lock,
  MessageCircle,
  Palette,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  formatDayDivider,
  formatLastSeen,
  formatMessageTime,
  isFriendTyping,
  isUserActuallyOnline,
  timestampToMillis,
} from '../lib/formatters';
import {
  ChatMessage,
  Conversation,
  QUICK_REACTIONS,
  UserProfile,
  WallpaperSettings,
} from '../types/chat';
import { Avatar } from './Avatar';
import { EmojiPicker } from './EmojiPicker';
import { getWallpaperSurfaceProps } from './WallpaperModal';

interface ChatWindowProps {
  currentUser: UserProfile;
  conversation: Conversation | null;
  friendProfile: UserProfile | null;
  messages: ChatMessage[];
  wallpaperSettings: WallpaperSettings;
  nowMs: number;
  onBackMobile: () => void;
  onSendMessage: (
    text: string,
    replyTo?: { text: string; senderName: string }
  ) => Promise<void>;
  onTyping: () => void;
  onToggleReaction: (messageId: string, currentReaction: string, emoji: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onOpenContactInfo: () => void;
  onOpenWallpaper: () => void;
  onOpenAddFriend: () => void;
  onOpenSelfChat: () => void;
}

const QUICK_STARTERS = ['👋 Hey there!', '☕ Up for a quick chat?', '🎉 Good news!'];

export function ChatWindow({
  currentUser,
  conversation,
  friendProfile,
  messages,
  wallpaperSettings,
  nowMs,
  onBackMobile,
  onSendMessage,
  onTyping,
  onToggleReaction,
  onDeleteMessage,
  onOpenContactInfo,
  onOpenWallpaper,
  onOpenAddFriend,
  onOpenSelfChat,
}: ChatWindowProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ text: string; senderName: string } | null>(null);
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);

  const wallpaperSurface = getWallpaperSurfaceProps(wallpaperSettings);

  const isSelfChat = Boolean(
    conversation && conversation.participantA === conversation.participantB
  );

  // Close emoji picker on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        emojiContainerRef.current &&
        !emojiContainerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showEmojiPicker]);

  // Reset search & reply when switching conversations
  useEffect(() => {
    setReplyTarget(null);
    setActiveActionMsgId(null);
    setShowMessageSearch(false);
    setMessageSearchQuery('');
    setShowEmojiPicker(false);
  }, [conversation?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, conversation?.id]);

  const filteredMessages = useMemo(() => {
    const q = messageSearchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => m.text.toLowerCase().includes(q));
  }, [messageSearchQuery, messages]);

  const otherLastReadMs = useMemo(() => {
    if (!conversation) return 0;
    if (isSelfChat) return Number.MAX_SAFE_INTEGER;
    const otherReadTs =
      currentUser.uid === conversation.participantA
        ? conversation.lastReadAtB
        : conversation.lastReadAtA;
    return timestampToMillis(otherReadTs);
  }, [conversation, currentUser.uid, isSelfChat]);

  const handleCopyOwnInvite = async () => {
    const url = `${window.location.origin}/?add=${currentUser.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText ?? draft).trim();
    if (!textToSend || sending || !conversation) return;
    if (!customText) setDraft('');
    const currentReply = replyTarget;
    setReplyTarget(null);
    setShowEmojiPicker(false);
    setSending(true);
    try {
      await onSendMessage(textToSend, currentReply ?? undefined);
      if (composerRef.current) {
        composerRef.current.style.height = 'auto';
      }
    } catch {
      if (!customText) setDraft(textToSend);
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setDraft((prev) => `${prev}${emoji}`);
    composerRef.current?.focus();
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 1500);
    } catch {
      // ignore
    }
    setActiveActionMsgId(null);
  };

  // Desktop empty state when no conversation is selected
  if (!conversation) {
    return (
      <section className="hidden md:flex flex-1 h-full bg-[#F8FAFC] flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-6">
          <div className="h-20 w-20 rounded-3xl bg-[#E7F8F0] text-[#008069] flex items-center justify-center mx-auto shadow-xs border border-emerald-900/10">
            <MessageCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-[#111B21]">
              Welcome to My Chat
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Select a conversation from the sidebar, add a friend using their{' '}
              <strong className="text-[#111B21]">@username</strong>, or open Saved Messages to
              start messaging in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAddFriend}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Friend</span>
            </button>
            <button
              type="button"
              onClick={onOpenSelfChat}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#111B21] text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Bookmark className="w-4 h-4 text-[#008069]" />
              <span>Saved Messages</span>
            </button>
            <button
              type="button"
              onClick={onOpenWallpaper}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#111B21] text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Palette className="w-4 h-4 text-[#008069]" />
              <span>Chat Wallpaper</span>
            </button>
            <button
              type="button"
              onClick={handleCopyOwnInvite}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {copiedInvite ? (
                <Check className="w-4 h-4 text-[#00A884]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedInvite ? 'Invite Link Copied' : 'Copy Invite Link'}</span>
            </button>
          </div>

          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Authenticated real-time conversations via Firebase</span>
          </div>
        </div>
      </section>
    );
  }

  const headerName = isSelfChat
    ? 'Saved Messages (You)'
    : friendProfile?.displayName || 'My Chat User';
  const friendOnline = isSelfChat ? true : isUserActuallyOnline(friendProfile, nowMs);
  const friendTyping = isFriendTyping(conversation, currentUser.uid, nowMs);
  const headerSubtitle = isSelfChat
    ? 'Personal notes & reminders'
    : friendTyping
      ? 'typing...'
      : formatLastSeen(friendProfile, nowMs);

  return (
    <section className="flex-1 h-full flex flex-col bg-white min-w-0 relative">
      {/* Chat Header */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-5 h-16 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackMobile}
            aria-label="Back to chats"
            className="md:hidden min-h-[44px] min-w-[44px] -ml-1 rounded-full hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenContactInfo}
            className="flex items-center gap-3 min-w-0 text-left rounded-xl py-1 pr-2 hover:bg-slate-50 transition-colors"
          >
            {isSelfChat ? (
              <div className="h-10 w-10 rounded-full bg-[#008069] text-white flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
            ) : (
              <Avatar
                src={friendProfile?.photoURL}
                name={headerName}
                size="sm"
                isOnline={friendOnline}
                showOnlineDot
              />
            )}
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-[15px] text-[#111B21] truncate leading-tight">
                {headerName}
              </h2>
              <p
                className={`text-xs truncate mt-0.5 ${
                  friendTyping
                    ? 'text-[#00A884] font-semibold'
                    : friendOnline && !isSelfChat
                      ? 'text-[#008069] font-medium'
                      : 'text-slate-500'
                }`}
              >
                {headerSubtitle}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenWallpaper}
            title="Chat Wallpaper"
            aria-label="Chat Wallpaper"
            className="min-h-[44px] min-w-[44px] rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Palette className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMessageSearch((v) => !v);
              setMessageSearchQuery('');
            }}
            title="Search in conversation"
            aria-label="Search in conversation"
            className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-colors ${
              showMessageSearch
                ? 'bg-[#E7F8F0] text-[#008069]'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenContactInfo}
            title="Contact Info"
            aria-label="Contact Info"
            className="min-h-[44px] min-w-[44px] rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Collapsible In-Chat Search */}
      {showMessageSearch && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={messageSearchQuery}
            onChange={(e) => setMessageSearchQuery(e.target.value)}
            placeholder="Search messages in this chat..."
            className="flex-1 text-sm bg-transparent py-1 focus:outline-none text-[#111B21]"
          />
          {messageSearchQuery && (
            <span className="text-xs text-slate-500 tabular-nums shrink-0">
              {filteredMessages.length} found
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setShowMessageSearch(false);
              setMessageSearchQuery('');
            }}
            aria-label="Close message search"
            className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Canvas */}
      <div className={`flex-1 relative overflow-hidden ${wallpaperSurface.bgClass}`}>
        {wallpaperSurface.activeImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url("${wallpaperSurface.activeImageUrl}")` }}
          />
        )}
        {wallpaperSurface.showDoodles && (
          <div className="absolute inset-0 chat-wallpaper-pattern pointer-events-none" />
        )}
        {wallpaperSurface.dimming > 0 && (
          <div
            className="absolute inset-0 bg-white pointer-events-none"
            style={{ opacity: wallpaperSurface.dimming / 100 }}
          />
        )}

        <div className="relative z-10 h-full overflow-y-auto px-3 sm:px-6 lg:px-10 py-4 space-y-2 custom-scrollbar">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-sm bg-white/90 backdrop-blur-xs rounded-2xl p-5 text-center shadow-xs border border-black/5 space-y-3">
              <p className="font-display font-semibold text-sm text-[#111B21]">
                {messageSearchQuery
                  ? `No messages matching "${messageSearchQuery}"`
                  : isSelfChat
                    ? 'Your personal space in My Chat'
                    : `Start chatting with ${headerName}`}
              </p>
              {!messageSearchQuery && (
                <>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isSelfChat
                      ? 'Save links, reminders, or quick ideas here anytime.'
                      : 'Send a message or pick a quick greeting below.'}
                  </p>
                  {!isSelfChat && (
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      {QUICK_STARTERS.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => void handleSend(starter)}
                          className="px-3 py-1.5 rounded-xl bg-[#E7F8F0] hover:bg-[#D4F3E4] text-[#008069] text-xs font-medium transition-colors"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const isOwn = msg.senderId === currentUser.uid;
            const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
            const currentDay = formatDayDivider(msg.createdAt);
            const prevDay = prevMsg ? formatDayDivider(prevMsg.createdAt) : null;
            const showDayDivider = idx === 0 || currentDay !== prevDay;

            const msgCreatedMs = timestampToMillis(msg.createdAt);
            const isDelivered = msgCreatedMs > 0;
            const isRead = isDelivered && otherLastReadMs >= msgCreatedMs;
            const actionsOpen = activeActionMsgId === msg.id;

            return (
              <div key={msg.id} className="space-y-2">
                {showDayDivider && (
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 rounded-lg bg-white/90 text-[11px] font-medium text-slate-600 shadow-2xs border border-black/5">
                      {currentDay}
                    </span>
                  </div>
                )}

                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}>
                  <div
                    className={`relative max-w-[84%] sm:max-w-[70%] lg:max-w-[60%] ${
                      msg.reaction ? 'mb-3' : ''
                    }`}
                  >
                    {/* Bubble */}
                    <div
                      onClick={() => {
                        if (!msg.deleted) {
                          setActiveActionMsgId(actionsOpen ? null : msg.id);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-2xl shadow-2xs cursor-pointer transition-colors ${
                        isOwn
                          ? 'bg-[#D9FDD3] text-[#111B21] rounded-tr-sm'
                          : 'bg-white text-[#111B21] rounded-tl-sm'
                      }`}
                    >
                      {/* Quoted Reply */}
                      {msg.replyToText && !msg.deleted && (
                        <div className="mb-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 text-xs space-y-0.5">
                          <p className="font-semibold text-[#008069] truncate">
                            {msg.replyToSenderName}
                          </p>
                          <p className="text-slate-600 line-clamp-2">{msg.replyToText}</p>
                        </div>
                      )}

                      {/* Message Body & Inline Timestamp */}
                      <div className="flex flex-wrap items-end gap-x-2.5 gap-y-0.5">
                        <p
                          className={`text-[14.5px] leading-[1.45] whitespace-pre-wrap break-words ${
                            msg.deleted ? 'italic text-slate-500' : 'text-[#111B21]'
                          }`}
                        >
                          {msg.text}
                        </p>
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 tabular-nums select-none shrink-0 translate-y-0.5">
                          <span>{formatMessageTime(msg.createdAt) || 'Sending'}</span>
                          {isOwn && !msg.deleted && (
                            isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#0284C7]" aria-label="Read" />
                            ) : isDelivered ? (
                              <CheckCheck
                                className="w-3.5 h-3.5 text-slate-400"
                                aria-label="Delivered"
                              />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400" aria-label="Sending" />
                            )
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Reaction Badge */}
                    {msg.reaction && !msg.deleted && (
                      <button
                        type="button"
                        onClick={() => void onToggleReaction(msg.id, msg.reaction, msg.reaction)}
                        title="Remove reaction"
                        className={`absolute -bottom-3 ${
                          isOwn ? 'right-2' : 'left-2'
                        } h-6 px-2 rounded-full bg-white border border-slate-200 shadow-xs text-xs flex items-center justify-center hover:scale-110 transition-transform`}
                      >
                        {msg.reaction}
                      </button>
                    )}

                    {/* Floating Action Menu on Tap/Click */}
                    {actionsOpen && !msg.deleted && (
                      <div
                        className={`mt-1.5 flex items-center gap-1 bg-white rounded-2xl shadow-lg border border-slate-200 p-1.5 z-30 ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              void onToggleReaction(msg.id, msg.reaction, emoji);
                              setActiveActionMsgId(null);
                            }}
                            className={`h-8 w-8 rounded-xl text-base hover:bg-emerald-50 flex items-center justify-center transition-colors ${
                              msg.reaction === emoji ? 'bg-[#E7F8F0]' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className="w-px h-5 bg-slate-200 mx-0.5" />
                        <button
                          type="button"
                          title="Reply"
                          aria-label="Reply to message"
                          onClick={() => {
                            setReplyTarget({
                              text: msg.text,
                              senderName: isOwn ? 'You' : headerName,
                            });
                            setActiveActionMsgId(null);
                            composerRef.current?.focus();
                          }}
                          className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Copy"
                          aria-label="Copy message"
                          onClick={() => void handleCopyMessage(msg)}
                          className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="w-4 h-4 text-[#00A884]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        {isOwn && (
                          <button
                            type="button"
                            title="Delete"
                            aria-label="Delete message"
                            onClick={() => {
                              void onDeleteMessage(msg.id);
                              setActiveActionMsgId(null);
                            }}
                            className="h-8 w-8 rounded-xl hover:bg-red-50 text-red-600 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Reply Banner */}
      {replyTarget && (
        <div className="px-4 py-2 bg-[#F4FBF7] border-t border-emerald-900/10 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#008069] truncate">
              Replying to {replyTarget.senderName}
            </p>
            <p className="text-xs text-slate-600 truncate">{replyTarget.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            aria-label="Cancel reply"
            className="min-h-[36px] min-w-[36px] rounded-full hover:bg-emerald-900/10 text-slate-500 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Composer Bar */}
      <footer className="bg-[#F0F2F5] border-t border-slate-200 px-2.5 sm:px-4 py-2.5 flex items-end gap-2 shrink-0 relative">
        {/* Emoji Picker Popover */}
        <div ref={emojiContainerRef} className="relative">
          {showEmojiPicker && (
            <div className="absolute bottom-14 left-0 z-40">
              <EmojiPicker onSelect={handleInsertEmoji} />
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            aria-label="Toggle emoji picker"
            className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-colors ${
              showEmojiPicker
                ? 'bg-[#00A884]/15 text-[#008069]'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Smile className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 px-3.5 py-2 flex items-center shadow-2xs">
          <textarea
            ref={composerRef}
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              onTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            aria-label="Message input"
            className="w-full max-h-[120px] resize-none bg-transparent text-[15px] text-[#111B21] placeholder:text-slate-400 focus:outline-none leading-relaxed"
          />
        </div>

        <button
          type="button"
          disabled={!draft.trim() || sending}
          onClick={() => void handleSend()}
          aria-label="Send message"
          className="min-h-[44px] min-w-[44px] rounded-full bg-[#00A884] hover:bg-[#008069] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all disabled:opacity-45 disabled:hover:bg-[#00A884] shrink-0"
        >
          <Send className="w-5 h-5 translate-x-[1px]" />
        </button>
      </footer>
    </section>
  );
}
