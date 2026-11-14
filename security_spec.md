# My Chat — Firestore Security Specification

## 1. Data Invariants
1. **PII Isolation**: Email addresses are stored exclusively in `/users/{userId}` and are readable/writable ONLY by `request.auth.uid == userId`. Public/friend-facing `/profiles/{userId}` and `/usernames/{username}` contain zero PII and never permit `list` queries.
2. **Verified Authenticated Access**: Every write operation requires `request.auth != null && request.auth.token.email_verified == true`. Unauthenticated users have zero read or write access to any collection.
3. **Conversation Isolation**: Only the two participants (`participantA` and `participantB`) of `/conversations/{conversationId}` can read, list, or write to that conversation and its `/messages` subcollection.
4. **Atomic Message-Conversation Sync**: Creating a message in `/conversations/{conversationId}/messages/{messageId}` requires atomically creating or updating the parent `/conversations/{conversationId}` document in the same batch (`existsAfter` + `getAfter` with `lastMessageAt == request.time`).
5. **Friend Consent Gate**: Creating a 1-to-1 conversation with another user requires an existing or atomically accepted friendship entry in `/users/{uid}/friends/{otherUid}`.
6. **Strict Timestamp & Field Immutability**: `createdAt`, `updatedAt`, `lastMessageAt`, `lastSeen`, and `lastReadAt*` must equal `request.time`. Immutable identifiers (`uid`, `senderId`, `participantIds`, `createdAt`) cannot be altered on update.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Conversation Read**: Anonymous client attempts `get` or `list` on `/conversations` or `/conversations/{id}/messages`. Expected: `PERMISSION_DENIED`.
2. **Cross-User Conversation Eavesdrop**: Authenticated User C (`uidC`) attempts to `get` or `list` `/conversations/{uidA}__{uidB}/messages`. Expected: `PERMISSION_DENIED`.
3. **PII Scrape on `/users`**: Authenticated User B attempts `get` or `list` on `/users/{uidA}` to read User A's email. Expected: `PERMISSION_DENIED`.
4. **Profile Directory Scrape**: Authenticated User B attempts `list` on `/profiles` or `/usernames`. Expected: `PERMISSION_DENIED`.
5. **Sender Spoofing in Message**: User A attempts to create a message in `/conversations/{uidA}__{uidB}/messages/{msgId}` with `senderId: uidB`. Expected: `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection**: User A attempts to create or update `/profiles/{uidA}` with an extra field `isAdmin: true` or `isVerified: true`. Expected: `PERMISSION_DENIED`.
7. **ID Poisoning**: User A attempts to create a document with a 300-character invalid document ID containing `$` or `/` characters. Expected: `PERMISSION_DENIED`.
8. **Backdated Timestamp Spoofing**: User A attempts to create a message with `createdAt` set to a client-chosen past timestamp instead of `serverTimestamp()`. Expected: `PERMISSION_DENIED`.
9. **Orphan Message Without Conversation Sync**: User A attempts to write a message directly to `/conversations/{uidA}__{uidB}/messages/{msgId}` without updating the parent conversation's `lastMessageAt`. Expected: `PERMISSION_DENIED`.
10. **Self-Accepted Friend Request Spoof**: User A creates `/friendRequests/{uidA}__{uidB}` directly with `status: 'accepted'` instead of `'pending'`. Expected: `PERMISSION_DENIED`.
11. **Recipient Impersonation on Friend Request Accept**: User A (the sender) attempts to update `/friendRequests/{uidA}__{uidB}` from `'pending'` to `'accepted'`. Expected: `PERMISSION_DENIED`.
12. **Message Content Value Poisoning / Oversized Payload**: User A attempts to send a message with `text` length > 2000 characters or `text: 12345` (non-string). Expected: `PERMISSION_DENIED`.
