import { useState } from 'react';
import { AtSign, Calendar, Shield, Trash2, X } from 'lucide-react';
import { formatLastSeen, isUserActuallyOnline } from '../lib/formatters';
import { UserProfile } from '../types/chat';
import { Avatar } from './Avatar';

interface ContactInfoDrawerProps {
  contact: UserProfile;
  isSelfChat: boolean;
  messageCount: number;
  onClose: () => void;
  onRemoveFriend: (friendUid: string) => Promise<void>;
}

export function ContactInfoDrawer({
  contact,
  isSelfChat,
  messageCount,
  onClose,
  onRemoveFriend,
}: ContactInfoDrawerProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const online = isSelfChat ? true : isUserActuallyOnline(contact);
  const statusText = isSelfChat ? 'Personal notes & saved messages' : formatLastSeen(contact);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemoveFriend(contact.uid);
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Contact info"
    >
      <div className="w-full max-w-sm bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="bg-[#008069] text-white px-5 py-4 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact info"
            className="min-h-[44px] min-w-[44px] -ml-2 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-display text-base font-semibold">
            {isSelfChat ? 'Saved Messages Info' : 'Contact Info'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F0F2F5] space-y-3 custom-scrollbar">
          {/* Profile Card */}
          <div className="bg-white px-6 py-8 flex flex-col items-center text-center shadow-2xs">
            <Avatar
              src={contact.photoURL}
              name={isSelfChat ? `${contact.displayName} (You)` : contact.displayName}
              size="xl"
              isOnline={online}
              showOnlineDot={!isSelfChat}
            />
            <h3 className="font-display text-xl font-bold text-[#111B21] mt-4">
              {isSelfChat ? 'Saved Messages (You)' : contact.displayName}
            </h3>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <AtSign className="w-3.5 h-3.5" />
              <span>{contact.username}</span>
            </p>
            <p className={`text-xs font-medium mt-2 ${online ? 'text-[#00A884]' : 'text-slate-500'}`}>
              {statusText}
            </p>
          </div>

          {/* About / Bio */}
          <div className="bg-white px-6 py-4 shadow-2xs space-y-1.5">
            <span className="text-xs font-medium text-slate-500">About</span>
            <p className="text-sm text-[#111B21] leading-relaxed">
              {contact.bio || 'Hey there! I am using My Chat.'}
            </p>
          </div>

          {/* Conversation Summary */}
          <div className="bg-white px-6 py-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Messages in this chat</span>
              <span className="font-semibold text-[#111B21] tabular-nums">{messageCount}</span>
            </div>
            {contact.createdAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Joined My Chat</span>
                </span>
                <span className="text-slate-700 tabular-nums">
                  {contact.createdAt.toDate().toLocaleDateString([], {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
              <Shield className="w-4 h-4 text-[#008069] shrink-0 mt-0.5" />
              <span>
                Only authenticated participants in this conversation can view or send messages.
              </span>
            </div>
          </div>

          {!isSelfChat && (
            <div className="bg-white px-6 py-4 shadow-2xs">
              {!confirmingRemove ? (
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(true)}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Friend</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 text-center">
                    Remove <strong>{contact.displayName}</strong> from your friends list?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={removing}
                      onClick={() => setConfirmingRemove(false)}
                      className="min-h-[42px] rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={removing}
                      onClick={handleRemove}
                      className="min-h-[42px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                    >
                      {removing ? 'Removing...' : 'Confirm Remove'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
