import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Loader2, MessageCircle } from 'lucide-react';
import { AddFriendModal } from './components/AddFriendModal';
import { AuthScreen } from './components/AuthScreen';
import { ChatWindow } from './components/ChatWindow';
import { ContactInfoDrawer } from './components/ContactInfoDrawer';
import { ProfileModal } from './components/ProfileModal';
import { Sidebar } from './components/Sidebar';
import { WallpaperModal } from './components/WallpaperModal';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  ensureFriendConversation,
  ensureSelfConversation,
  ensureUserAccountInitialized,
  markConversationRead,
  removeFriend,
  sendMessage,
  sendTypingHeartbeat,
  softDeleteMessage,
  toggleMessageReaction,
  updatePresence,
} from './lib/chatService';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { timestampToMillis } from './lib/formatters';
import {
  ChatMessage,
  Conversation,
  DEFAULT_WALLPAPER_SETTINGS,
  FriendEntry,
  FriendRequest,
  UserProfile,
  WALLPAPER_OPTIONS,
  WallpaperSettings,
} from './types/chat';

const WALLPAPER_STORAGE_KEY = 'my_chat_wallpaper_settings';
const LEGACY_WALLPAPER_KEY = 'my_chat_wallpaper';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfile>>({});

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');

  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>(() => {
    try {
      const saved = localStorage.getItem(WALLPAPER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WallpaperSettings>;
        if (parsed && typeof parsed === 'object') {
          return {
            id: parsed.id ?? DEFAULT_WALLPAPER_SETTINGS.id,
            customImageUrl: typeof parsed.customImageUrl === 'string' ? parsed.customImageUrl : '',
            showDoodles:
              typeof parsed.showDoodles === 'boolean'
                ? parsed.showDoodles
                : DEFAULT_WALLPAPER_SETTINGS.showDoodles,
            dimming:
              typeof parsed.dimming === 'number'
                ? parsed.dimming
                : DEFAULT_WALLPAPER_SETTINGS.dimming,
          };
        }
      }
      const legacyId = localStorage.getItem(LEGACY_WALLPAPER_KEY);
      if (legacyId && WALLPAPER_OPTIONS.some((w) => w.id === legacyId)) {
        return { ...DEFAULT_WALLPAPER_SETTINGS, id: legacyId as WallpaperSettings['id'] };
      }
    } catch {
      // ignore
    }
    return DEFAULT_WALLPAPER_SETTINGS;
  });

  const lastTypingSentRef = useRef<number>(0);

  // Check ?add=username URL parameter for invite links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addParam = params.get('add')?.trim().toLowerCase().replace(/^@+/, '');
    if (addParam) {
      setInviteUsername(addParam);
    }
  }, []);

  // Periodic clock tick so online/typing relative indicators stay fresh
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateWallpaperSettings = (next: WallpaperSettings) => {
    setWallpaperSettings(next);
    try {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const initializeSignedInUser = useCallback(async (user: User) => {
    setInitError(null);
    try {
      const profile = await ensureUserAccountInitialized(user);
      setCurrentUserProfile(profile);
    } catch (err) {
      setInitError(
        err instanceof Error ? err.message : 'Unable to initialize your profile in Firestore.'
      );
    }
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        await initializeSignedInUser(user);
      } else {
        setCurrentUserProfile(null);
        setConversations([]);
        setFriends([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setMessages([]);
        setActiveConversationId(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [initializeSignedInUser]);

  // Open invite modal automatically if ?add=username was provided and user is ready
  useEffect(() => {
    if (currentUserProfile && inviteUsername) {
      setShowAddFriendModal(true);
    }
  }, [currentUserProfile, inviteUsername]);

  // Presence heartbeat & unload status
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !currentUserProfile) return;
    const uid = firebaseUser.uid;

    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void updatePresence(uid, true);
      }
    }, 45_000);

    const handleVisibility = () => {
      void updatePresence(uid, document.visibilityState === 'visible');
    };

    const handleBeforeUnload = () => {
      void updatePresence(uid, false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [firebaseUser, currentUserProfile?.uid]);

  // Real-time listener: own profile
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    const uid = firebaseUser.uid;
    const path = `profiles/${uid}`;
    const unsub = onSnapshot(
      doc(db, 'profiles', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setCurrentUserProfile(data);
          setProfilesMap((prev) => ({ ...prev, [uid]: data }));
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, path)
    );
    return () => unsub();
  }, [firebaseUser]);

  // Real-time listener: user's conversations
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !currentUserProfile) return;
    const uid = firebaseUser.uid;
    const path = 'conversations';
    const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Conversation[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Conversation, 'id'>),
        }));
        setConversations(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
    return () => unsub();
  }, [firebaseUser, currentUserProfile?.uid]);

  // Real-time listener: friends subcollection
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !currentUserProfile) return;
    const uid = firebaseUser.uid;
    const path = `users/${uid}/friends`;
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'friends'),
      (snapshot) => {
        const list: FriendEntry[] = snapshot.docs.map((d) => d.data() as FriendEntry);
        setFriends(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
    return () => unsub();
  }, [firebaseUser, currentUserProfile?.uid]);

  // Real-time listeners: incoming and outgoing friend requests
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !currentUserProfile) return;
    const uid = firebaseUser.uid;

    const inQuery = query(collection(db, 'friendRequests'), where('toUid', '==', uid));
    const outQuery = query(collection(db, 'friendRequests'), where('fromUid', '==', uid));

    const unsubIn = onSnapshot(
      inQuery,
      (snapshot) => {
        setIncomingRequests(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FriendRequest, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'friendRequests')
    );

    const unsubOut = onSnapshot(
      outQuery,
      (snapshot) => {
        setOutgoingRequests(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FriendRequest, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'friendRequests')
    );

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [firebaseUser, currentUserProfile?.uid]);

  // Real-time listeners: friend & contact profiles for live online status & avatars
  const trackedContactUids = useMemo(() => {
    if (!firebaseUser) return [];
    const uids = new Set<string>();
    friends.forEach((f) => uids.add(f.friendUid));
    conversations.forEach((c) => {
      if (c.participantA !== firebaseUser.uid) uids.add(c.participantA);
      if (c.participantB !== firebaseUser.uid) uids.add(c.participantB);
    });
    incomingRequests.forEach((r) => uids.add(r.fromUid));
    outgoingRequests.forEach((r) => uids.add(r.toUid));
    uids.delete(firebaseUser.uid);
    return Array.from(uids).sort();
  }, [conversations, firebaseUser, friends, incomingRequests, outgoingRequests]);

  const trackedUidsKey = trackedContactUids.join(',');

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || trackedContactUids.length === 0) return;

    const unsubscribers = trackedContactUids.map((contactUid) =>
      onSnapshot(
        doc(db, 'profiles', contactUid),
        (snap) => {
          if (snap.exists()) {
            setProfilesMap((prev) => ({
              ...prev,
              [contactUid]: snap.data() as UserProfile,
            }));
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, `profiles/${contactUid}`)
      )
    );

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [firebaseUser, trackedUidsKey]);

  // Active conversation object
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  // Active friend profile
  const activeFriendProfile = useMemo(() => {
    if (!activeConversation || !currentUserProfile) return null;
    if (activeConversation.participantA === activeConversation.participantB) {
      return currentUserProfile;
    }
    const otherUid =
      activeConversation.participantA === currentUserProfile.uid
        ? activeConversation.participantB
        : activeConversation.participantA;
    return profilesMap[otherUid] ?? null;
  }, [activeConversation, currentUserProfile, profilesMap]);

  // Real-time listener: messages in active conversation
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !activeConversationId) {
      setMessages([]);
      return;
    }
    const uid = firebaseUser.uid;
    const path = `conversations/${activeConversationId}/messages`;
    const q = query(
      collection(db, 'conversations', activeConversationId, 'messages'),
      where('participantIds', 'array-contains', uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ChatMessage, 'id'>),
          }))
          .sort((a, b) => {
            const diff = timestampToMillis(a.createdAt) - timestampToMillis(b.createdAt);
            if (diff !== 0) return diff;
            return a.id.localeCompare(b.id);
          });
        setMessages(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );

    return () => unsub();
  }, [activeConversationId, firebaseUser]);

  // Mark active conversation read when opened or when new unread messages arrive
  useEffect(() => {
    if (!activeConversation || !currentUserProfile) return;
    const isSelf = activeConversation.participantA === activeConversation.participantB;
    if (isSelf) return;

    const myUnread =
      currentUserProfile.uid === activeConversation.participantA
        ? activeConversation.unreadA
        : activeConversation.unreadB;

    if (myUnread > 0) {
      void markConversationRead(activeConversation.id, currentUserProfile.uid, activeConversation);
    }
  }, [
    activeConversation?.id,
    activeConversation?.unreadA,
    activeConversation?.unreadB,
    currentUserProfile?.uid,
  ]);

  const friendUidsSet = useMemo(() => new Set(friends.map((f) => f.friendUid)), [friends]);

  const handleStartChatWithFriend = async (friendUid: string) => {
    if (!currentUserProfile) return;
    const convId = await ensureFriendConversation(currentUserProfile.uid, friendUid);
    setActiveConversationId(convId);
    setShowContactInfo(false);
  };

  const handleOpenSelfChat = async () => {
    if (!currentUserProfile) return;
    const convId = await ensureSelfConversation(currentUserProfile.uid);
    setActiveConversationId(convId);
    setShowContactInfo(false);
  };

  const handleSendMessage = async (
    text: string,
    replyTo?: { text: string; senderName: string }
  ) => {
    if (!activeConversation || !currentUserProfile) return;
    const receiverId =
      activeConversation.participantA === activeConversation.participantB
        ? currentUserProfile.uid
        : activeConversation.participantA === currentUserProfile.uid
          ? activeConversation.participantB
          : activeConversation.participantA;

    await sendMessage({
      conversationId: activeConversation.id,
      senderId: currentUserProfile.uid,
      receiverId,
      text,
      replyToText: replyTo?.text,
      replyToSenderName: replyTo?.senderName,
      existingConversation: activeConversation,
    });
  };

  const handleTyping = () => {
    if (!activeConversation || !currentUserProfile) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2500) return;
    lastTypingSentRef.current = now;
    void sendTypingHeartbeat(activeConversation.id, currentUserProfile.uid, activeConversation);
  };

  const handleSignOut = async () => {
    if (firebaseUser) {
      await updatePresence(firebaseUser.uid, false);
    }
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="h-screen w-full bg-[#F0F2F5] flex flex-col items-center justify-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-[#008069] text-white flex items-center justify-center shadow-md">
          <MessageCircle className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-[#00A884]" />
          <span>Loading My Chat...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated or unverified Email/Password user
  if (!firebaseUser || !firebaseUser.emailVerified) {
    return (
      <AuthScreen
        pendingVerificationUser={firebaseUser && !firebaseUser.emailVerified ? firebaseUser : null}
        onVerified={async () => {
          if (auth.currentUser) {
            setFirebaseUser(auth.currentUser);
            await initializeSignedInUser(auth.currentUser);
          }
        }}
      />
    );
  }

  if (initError) {
    return (
      <div className="h-screen w-full bg-[#F0F2F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-4 text-center">
          <h1 className="font-display text-lg font-bold text-[#111B21]">
            Could not load your account
          </h1>
          <p className="text-sm text-red-600 break-words">{initError}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => void initializeSignedInUser(firebaseUser)}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#00A884] text-white text-sm font-semibold"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUserProfile) {
    return (
      <div className="h-screen w-full bg-[#F0F2F5] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#00A884]" />
        <p className="text-sm font-medium text-slate-600">Setting up your My Chat profile...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#DFE5E2] md:p-3 lg:p-4 flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-[1480px] bg-white md:rounded-2xl md:shadow-xl md:border md:border-slate-200/80 flex overflow-hidden">
        {/* Sidebar: hidden on mobile when a conversation is open */}
        <div
          className={`${
            activeConversationId ? 'hidden md:flex' : 'flex'
          } w-full md:w-auto h-full`}
        >
          <Sidebar
            currentUser={currentUserProfile}
            conversations={conversations}
            friends={friends}
            profilesMap={profilesMap}
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            activeConversationId={activeConversationId}
            nowMs={nowMs}
            onSelectConversation={(convId) => {
              setActiveConversationId(convId);
              setShowContactInfo(false);
            }}
            onStartChatWithFriend={(uid) => void handleStartChatWithFriend(uid)}
            onOpenSelfChat={() => void handleOpenSelfChat()}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenWallpaper={() => setShowWallpaperModal(true)}
            onOpenAddFriend={() => {
              setInviteUsername('');
              setShowAddFriendModal(true);
            }}
            onAcceptRequest={async (req) => {
              const convId = await acceptFriendRequest(req, currentUserProfile.uid);
              setActiveConversationId(convId);
            }}
            onDeclineRequest={declineFriendRequest}
            onCancelRequest={cancelFriendRequest}
            onSignOut={handleSignOut}
          />
        </div>

        {/* Main Chat Pane: hidden on mobile when no conversation is selected */}
        <div
          className={`${
            activeConversationId ? 'flex' : 'hidden md:flex'
          } flex-1 h-full min-w-0`}
        >
          <ChatWindow
            currentUser={currentUserProfile}
            conversation={activeConversation}
            friendProfile={activeFriendProfile}
            messages={messages}
            wallpaperSettings={wallpaperSettings}
            nowMs={nowMs}
            onBackMobile={() => setActiveConversationId(null)}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            onToggleReaction={async (messageId, currentReaction, emoji) => {
              if (!activeConversation) return;
              await toggleMessageReaction(activeConversation.id, messageId, currentReaction, emoji);
            }}
            onDeleteMessage={async (messageId) => {
              if (!activeConversation) return;
              await softDeleteMessage(activeConversation.id, messageId);
            }}
            onOpenContactInfo={() => setShowContactInfo(true)}
            onOpenWallpaper={() => setShowWallpaperModal(true)}
            onOpenAddFriend={() => {
              setInviteUsername('');
              setShowAddFriendModal(true);
            }}
            onOpenSelfChat={() => void handleOpenSelfChat()}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      {showProfileModal && (
        <ProfileModal
          profile={currentUserProfile}
          wallpaperSettings={wallpaperSettings}
          onOpenWallpaper={() => setShowWallpaperModal(true)}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showWallpaperModal && (
        <WallpaperModal
          settings={wallpaperSettings}
          onUpdateSettings={handleUpdateWallpaperSettings}
          onClose={() => setShowWallpaperModal(false)}
        />
      )}

      {showAddFriendModal && (
        <AddFriendModal
          currentUser={currentUserProfile}
          friendUids={friendUidsSet}
          outgoingRequests={outgoingRequests}
          initialSearchUsername={inviteUsername}
          onClose={() => {
            setShowAddFriendModal(false);
            setInviteUsername('');
            if (window.location.search.includes('add=')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          }}
          onStartChatWithFriend={(uid) => void handleStartChatWithFriend(uid)}
        />
      )}

      {showContactInfo && activeConversation && activeFriendProfile && (
        <ContactInfoDrawer
          contact={activeFriendProfile}
          isSelfChat={activeConversation.participantA === activeConversation.participantB}
          messageCount={messages.length}
          onClose={() => setShowContactInfo(false)}
          onRemoveFriend={async (friendUid) => {
            await removeFriend(currentUserProfile.uid, friendUid);
            setActiveConversationId(null);
          }}
        />
      )}
    </div>
  );
}
