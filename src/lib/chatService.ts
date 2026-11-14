import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { AVATAR_PRESETS, Conversation, FriendRequest, UserProfile, UsernameLookup } from '../types/chat';
import { db, handleFirestoreError, OperationType } from './firebase';

export function getSortedParticipants(uid1: string, uid2: string): [string, string] {
  return uid1 <= uid2 ? [uid1, uid2] : [uid2, uid1];
}

export function getConversationId(uid1: string, uid2: string): string {
  const [a, b] = getSortedParticipants(uid1, uid2);
  return `${a}__${b}`;
}

export function sanitizeUsername(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (cleaned.length >= 3) return cleaned.slice(0, 24);
  return `${cleaned || 'user'}_${Math.floor(100 + Math.random() * 899)}`.slice(0, 24);
}

export function isValidUsernameFormat(username: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

async function findAvailableUsername(baseInput: string, uid: string): Promise<string> {
  const base = sanitizeUsername(baseInput);
  const candidates = [
    base,
    `${base.slice(0, 18)}_${uid.slice(0, 5).toLowerCase()}`,
    `${base.slice(0, 16)}_${Math.floor(1000 + Math.random() * 8999)}`,
    `chat_${uid.slice(0, 10).toLowerCase()}`,
  ];

  for (const candidate of candidates) {
    if (!isValidUsernameFormat(candidate)) continue;
    const snap = await getDoc(doc(db, 'usernames', candidate));
    if (!snap.exists()) return candidate;
  }
  return `user_${uid.slice(0, 12).toLowerCase()}`;
}

export async function ensureUserAccountInitialized(
  user: User,
  overrides?: { displayName?: string; photoURL?: string; username?: string }
): Promise<UserProfile> {
  const profilePath = `profiles/${user.uid}`;
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    const existingProfileSnap = await getDoc(profileRef);

    if (existingProfileSnap.exists()) {
      await updateDoc(profileRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await ensureSelfConversation(user.uid);
      const updatedSnap = await getDoc(profileRef);
      return updatedSnap.data() as UserProfile;
    }

    const rawName =
      overrides?.displayName?.trim() ||
      user.displayName?.trim() ||
      user.email?.split('@')[0] ||
      'My Chat User';
    const displayName = rawName.slice(0, 60);
    const defaultAvatar = AVATAR_PRESETS[user.uid.charCodeAt(0) % AVATAR_PRESETS.length].url;
    const photoURL = (overrides?.photoURL ?? user.photoURL ?? defaultAvatar).slice(0, 65536);

    const baseHandle = overrides?.username || user.email?.split('@')[0] || rawName;
    const username = await findAvailableUsername(baseHandle, user.uid);

    const batch = writeBatch(db);

    const userPrivateRef = doc(db, 'users', user.uid);
    batch.set(userPrivateRef, {
      uid: user.uid,
      email: (user.email || 'unknown@mychat.app').slice(0, 254),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(profileRef, {
      uid: user.uid,
      username,
      displayName,
      photoURL,
      bio: 'Hey there! I am using My Chat.',
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const usernameRef = doc(db, 'usernames', username);
    batch.set(usernameRef, {
      uid: user.uid,
      username,
      displayName,
      photoURL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    // Ensure Saved Messages (self-chat) exists once profile exists
    await ensureSelfConversation(user.uid);

    const createdSnap = await getDoc(profileRef);
    return createdSnap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }
}

export async function ensureSelfConversation(uid: string): Promise<string> {
  const convId = getConversationId(uid, uid);
  const convPath = `conversations/${convId}`;
  try {
    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        participantA: uid,
        participantB: uid,
        participantIds: [uid, uid],
        lastMessageText: '',
        lastMessageSenderId: uid,
        lastMessageAt: serverTimestamp(),
        unreadA: 0,
        unreadB: 0,
        lastReadAtA: serverTimestamp(),
        lastReadAtB: serverTimestamp(),
        typingAtA: Timestamp.fromMillis(0),
        typingAtB: Timestamp.fromMillis(0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, convPath);
  }
}

export async function updatePresence(uid: string, isOnline: boolean): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    await updateDoc(doc(db, 'profiles', uid), {
      isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Presence updates may fail silently during sign-out or tab teardown
  }
}

export async function updateUserProfile(
  uid: string,
  currentUsername: string,
  updates: {
    displayName: string;
    username: string;
    photoURL: string;
    bio: string;
  }
): Promise<void> {
  const cleanName = updates.displayName.trim().slice(0, 60);
  if (!cleanName) throw new Error('Display name is required.');
  const cleanUsername = updates.username.trim().toLowerCase();
  if (!isValidUsernameFormat(cleanUsername)) {
    throw new Error('Username must be 3-24 characters using lowercase letters, numbers, or underscores.');
  }
  const cleanPhoto = updates.photoURL.trim().slice(0, 65536);
  const cleanBio = updates.bio.trim().slice(0, 160);

  const path = `profiles/${uid}`;
  try {
    const batch = writeBatch(db);
    const profileRef = doc(db, 'profiles', uid);

    if (cleanUsername !== currentUsername) {
      const targetUsernameRef = doc(db, 'usernames', cleanUsername);
      const existingHandle = await getDoc(targetUsernameRef);
      if (existingHandle.exists() && existingHandle.data().uid !== uid) {
        throw new Error(`Username @${cleanUsername} is already taken.`);
      }
      batch.delete(doc(db, 'usernames', currentUsername));
      batch.set(targetUsernameRef, {
        uid,
        username: cleanUsername,
        displayName: cleanName,
        photoURL: cleanPhoto,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(doc(db, 'usernames', currentUsername), {
        displayName: cleanName,
        photoURL: cleanPhoto,
        updatedAt: serverTimestamp(),
      });
    }

    batch.update(profileRef, {
      displayName: cleanName,
      username: cleanUsername,
      photoURL: cleanPhoto,
      bio: cleanBio,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    if (error instanceof Error && (error.message.includes('already taken') || error.message.includes('Username must'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function lookupUserByUsername(rawUsername: string): Promise<UserProfile | null> {
  const normalized = rawUsername.trim().toLowerCase().replace(/^@+/, '');
  if (!isValidUsernameFormat(normalized)) return null;
  const path = `usernames/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', normalized));
    if (!snap.exists()) return null;
    const lookup = snap.data() as UsernameLookup;
    const profileSnap = await getDoc(doc(db, 'profiles', lookup.uid));
    if (!profileSnap.exists()) return null;
    return profileSnap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function sendFriendRequest(fromUid: string, toUid: string): Promise<void> {
  if (fromUid === toUid) {
    throw new Error('You cannot send a friend request to yourself.');
  }
  const requestId = `${fromUid}__${toUid}`;
  const path = `friendRequests/${requestId}`;
  try {
    const existingFriend = await getDoc(doc(db, 'users', fromUid, 'friends', toUid));
    if (existingFriend.exists()) {
      throw new Error('You are already friends with this user.');
    }

    // Check if the other user already sent us a pending request
    const reverseRef = doc(db, 'friendRequests', `${toUid}__${fromUid}`);
    const reverseSnap = await getDoc(reverseRef);
    if (reverseSnap.exists() && reverseSnap.data().status === 'pending') {
      await acceptFriendRequest(
        { id: reverseSnap.id, ...(reverseSnap.data() as Omit<FriendRequest, 'id'>) },
        fromUid
      );
      return;
    }

    const reqRef = doc(db, 'friendRequests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
      const status = reqSnap.data().status;
      if (status === 'pending') {
        throw new Error('Friend request already sent.');
      }
      if (status === 'declined') {
        await updateDoc(reqRef, {
          status: 'pending',
          updatedAt: serverTimestamp(),
        });
        return;
      }
    }

    await setDoc(reqRef, {
      fromUid,
      toUid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already') || error.message.includes('yourself'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function acceptFriendRequest(request: FriendRequest, currentUid: string): Promise<string> {
  const path = `friendRequests/${request.id}`;
  try {
    const batch = writeBatch(db);
    const reqRef = doc(db, 'friendRequests', request.id);
    batch.update(reqRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });

    const myFriendRef = doc(db, 'users', currentUid, 'friends', request.fromUid);
    batch.set(myFriendRef, {
      friendUid: request.fromUid,
      nickname: '',
      addedAt: serverTimestamp(),
    });

    const theirFriendRef = doc(db, 'users', request.fromUid, 'friends', currentUid);
    batch.set(theirFriendRef, {
      friendUid: currentUid,
      nickname: '',
      addedAt: serverTimestamp(),
    });

    const convId = getConversationId(currentUid, request.fromUid);
    const [participantA, participantB] = getSortedParticipants(currentUid, request.fromUid);
    const convRef = doc(db, 'conversations', convId);
    const existingConv = await getDoc(convRef);
    if (!existingConv.exists()) {
      batch.set(convRef, {
        participantA,
        participantB,
        participantIds: [participantA, participantB],
        lastMessageText: '',
        lastMessageSenderId: currentUid,
        lastMessageAt: serverTimestamp(),
        unreadA: 0,
        unreadB: 0,
        lastReadAtA: serverTimestamp(),
        lastReadAtB: serverTimestamp(),
        typingAtA: Timestamp.fromMillis(0),
        typingAtB: Timestamp.fromMillis(0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const path = `friendRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const path = `friendRequests/${requestId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'friendRequests', requestId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function removeFriend(currentUid: string, friendUid: string): Promise<void> {
  const path = `users/${currentUid}/friends/${friendUid}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', currentUid, 'friends', friendUid));
    batch.delete(doc(db, 'users', friendUid, 'friends', currentUid));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function ensureFriendConversation(currentUid: string, friendUid: string): Promise<string> {
  const convId = getConversationId(currentUid, friendUid);
  const path = `conversations/${convId}`;
  try {
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      const [participantA, participantB] = getSortedParticipants(currentUid, friendUid);
      await setDoc(convRef, {
        participantA,
        participantB,
        participantIds: [participantA, participantB],
        lastMessageText: '',
        lastMessageSenderId: currentUid,
        lastMessageAt: serverTimestamp(),
        unreadA: 0,
        unreadB: 0,
        lastReadAtA: serverTimestamp(),
        lastReadAtB: serverTimestamp(),
        typingAtA: Timestamp.fromMillis(0),
        typingAtB: Timestamp.fromMillis(0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  replyToText?: string;
  replyToSenderName?: string;
  existingConversation?: Conversation | null;
}): Promise<void> {
  const { conversationId, senderId, receiverId, text, replyToText = '', replyToSenderName = '', existingConversation } = params;
  const cleanText = text.trim().slice(0, 2000);
  if (!cleanText) return;

  const [participantA, participantB] = getSortedParticipants(senderId, receiverId);
  const preview = cleanText.replace(/\s+/g, ' ').slice(0, 1000);
  const safeReplyText = replyToText.trim().slice(0, 200);
  const safeReplySender = replyToSenderName.trim().slice(0, 60);

  const path = `conversations/${conversationId}/messages`;
  try {
    const batch = writeBatch(db);
    const convRef = doc(db, 'conversations', conversationId);
    const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));

    let convExists = Boolean(existingConversation);
    if (!existingConversation) {
      const snap = await getDoc(convRef);
      convExists = snap.exists();
    }

    if (convExists) {
      if (participantA === participantB) {
        batch.update(convRef, {
          lastMessageText: preview,
          lastMessageSenderId: senderId,
          lastMessageAt: serverTimestamp(),
          unreadA: 0,
          unreadB: 0,
          typingAtA: Timestamp.fromMillis(0),
          typingAtB: Timestamp.fromMillis(0),
          updatedAt: serverTimestamp(),
        });
      } else if (senderId === participantA) {
        batch.update(convRef, {
          lastMessageText: preview,
          lastMessageSenderId: senderId,
          lastMessageAt: serverTimestamp(),
          unreadB: increment(1),
          typingAtA: Timestamp.fromMillis(0),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(convRef, {
          lastMessageText: preview,
          lastMessageSenderId: senderId,
          lastMessageAt: serverTimestamp(),
          unreadA: increment(1),
          typingAtB: Timestamp.fromMillis(0),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      batch.set(convRef, {
        participantA,
        participantB,
        participantIds: [participantA, participantB],
        lastMessageText: preview,
        lastMessageSenderId: senderId,
        lastMessageAt: serverTimestamp(),
        unreadA: participantA !== participantB && senderId === participantB ? 1 : 0,
        unreadB: participantA !== participantB && senderId === participantA ? 1 : 0,
        lastReadAtA: serverTimestamp(),
        lastReadAtB: serverTimestamp(),
        typingAtA: Timestamp.fromMillis(0),
        typingAtB: Timestamp.fromMillis(0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(msgRef, {
      senderId,
      receiverId,
      participantIds: [participantA, participantB],
      text: cleanText,
      replyToText: safeReplyText,
      replyToSenderName: safeReplySender,
      reaction: '',
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markConversationRead(
  conversationId: string,
  currentUid: string,
  conv: Conversation
): Promise<void> {
  const path = `conversations/${conversationId}`;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    if (currentUid === conv.participantA) {
      await updateDoc(convRef, {
        unreadA: 0,
        lastReadAtA: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (currentUid === conv.participantB) {
      await updateDoc(convRef, {
        unreadB: 0,
        lastReadAtB: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function sendTypingHeartbeat(
  conversationId: string,
  currentUid: string,
  conv: Conversation
): Promise<void> {
  if (conv.participantA === conv.participantB) return;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    if (currentUid === conv.participantA) {
      await updateDoc(convRef, {
        typingAtA: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (currentUid === conv.participantB) {
      await updateDoc(convRef, {
        typingAtB: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-critical typing indicator errors can fail silently
  }
}

export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  currentReaction: string,
  nextEmoji: string
): Promise<void> {
  const path = `conversations/${conversationId}/messages/${messageId}`;
  try {
    const nextValue = currentReaction === nextEmoji ? '' : nextEmoji.slice(0, 16);
    await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
      reaction: nextValue,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function softDeleteMessage(conversationId: string, messageId: string): Promise<void> {
  const path = `conversations/${conversationId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
      deleted: true,
      text: 'This message was deleted',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
