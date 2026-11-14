import { Timestamp } from 'firebase/firestore';
import avatarBotanical from '../assets/images/avatar_botanical_emblem_1794664257376.jpg';
import avatarEmerald from '../assets/images/avatar_emerald_portrait_1794664254998.jpg';
import avatarForest from '../assets/images/avatar_forest_portrait_1794664255423.jpg';
import avatarHorizon from '../assets/images/avatar_jade_horizon_1794664255788.jpg';
import wallpaperBotanical from '../assets/images/wallpaper_botanical_mist_1794664934743.jpg';
import wallpaperWaves from '../assets/images/wallpaper_emerald_waves_1794664934900.jpg';

export interface UserPrivate {
  uid: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UsernameLookup {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FriendEntry {
  friendUid: string;
  nickname: string;
  addedAt: Timestamp;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: FriendRequestStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Conversation {
  id: string;
  participantA: string;
  participantB: string;
  participantIds: [string, string];
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAt: Timestamp;
  unreadA: number;
  unreadB: number;
  lastReadAtA: Timestamp;
  lastReadAtB: Timestamp;
  typingAtA: Timestamp;
  typingAtB: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  participantIds: [string, string];
  text: string;
  replyToText: string;
  replyToSenderName: string;
  reaction: string;
  deleted: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type WallpaperId =
  | 'classic'
  | 'mint'
  | 'emerald_mist'
  | 'pure'
  | 'sage'
  | 'meadow'
  | 'slate'
  | 'botanical_art'
  | 'waves_art'
  | 'custom';

export interface WallpaperOption {
  id: Exclude<WallpaperId, 'custom'>;
  label: string;
  kind: 'solid' | 'gradient' | 'image';
  bgClass: string;
  swatchColor: string;
  imageUrl?: string;
}

export interface WallpaperSettings {
  id: WallpaperId;
  customImageUrl: string;
  showDoodles: boolean;
  dimming: number;
}

export const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
  id: 'classic',
  customImageUrl: '',
  showDoodles: true,
  dimming: 0,
};

export const WALLPAPER_OPTIONS: WallpaperOption[] = [
  { id: 'classic', label: 'Classic Sand', kind: 'solid', bgClass: 'bg-[#EFEAE2]', swatchColor: '#EFEAE2' },
  { id: 'mint', label: 'Fresh Mint', kind: 'solid', bgClass: 'bg-[#E9F5F0]', swatchColor: '#E9F5F0' },
  {
    id: 'emerald_mist',
    label: 'Emerald Mist',
    kind: 'gradient',
    bgClass: 'bg-gradient-to-br from-[#EAF8F1] via-[#F6FCF9] to-[#E2F3EB]',
    swatchColor: '#DDF3E8',
  },
  { id: 'pure', label: 'Crisp White', kind: 'solid', bgClass: 'bg-[#F8FAFC]', swatchColor: '#F8FAFC' },
  { id: 'sage', label: 'Soft Sage', kind: 'solid', bgClass: 'bg-[#E6EFEA]', swatchColor: '#E6EFEA' },
  { id: 'meadow', label: 'Deep Meadow', kind: 'solid', bgClass: 'bg-[#D6ECE1]', swatchColor: '#D6ECE1' },
  { id: 'slate', label: 'Cool Slate', kind: 'solid', bgClass: 'bg-[#EEF2F6]', swatchColor: '#EEF2F6' },
  {
    id: 'botanical_art',
    label: 'Botanical Mist',
    kind: 'image',
    bgClass: 'bg-[#F5F7F2]',
    swatchColor: '#E5EFE3',
    imageUrl: wallpaperBotanical,
  },
  {
    id: 'waves_art',
    label: 'Emerald Waves',
    kind: 'image',
    bgClass: 'bg-[#EAF5F0]',
    swatchColor: '#CBEAD9',
    imageUrl: wallpaperWaves,
  },
];

export const AVATAR_PRESETS = [
  {
    id: 'forest',
    label: 'Forest Portrait',
    url: avatarForest,
  },
  {
    id: 'emerald',
    label: 'Emerald Portrait',
    url: avatarEmerald,
  },
  {
    id: 'botanical',
    label: 'Botanical Wreath',
    url: avatarBotanical,
  },
  {
    id: 'horizon',
    label: 'Jade Horizon',
    url: avatarHorizon,
  },
];

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
