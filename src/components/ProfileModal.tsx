import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { Camera, Check, ChevronRight, Copy, Link as LinkIcon, Palette, X } from 'lucide-react';
import { updateUserProfile } from '../lib/chatService';
import { AVATAR_PRESETS, UserProfile, WALLPAPER_OPTIONS, WallpaperSettings } from '../types/chat';
import { Avatar } from './Avatar';

interface ProfileModalProps {
  profile: UserProfile;
  wallpaperSettings: WallpaperSettings;
  onOpenWallpaper: () => void;
  onClose: () => void;
}

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function ProfileModal({
  profile,
  wallpaperSettings,
  onOpenWallpaper,
  onClose,
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [photoURL, setPhotoURL] = useState(profile.photoURL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inviteUrl = `${window.location.origin}/?add=${profile.username}`;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const resized = await resizeImageToDataUrl(file);
      if (resized.length > 65000) {
        setError('Image is too large even after compression. Please pick a simpler image.');
        return;
      }
      setPhotoURL(resized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, profile.username, {
        displayName,
        username,
        photoURL,
        bio,
      });
      setSavedNotice(true);
      setTimeout(() => onClose(), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Profile"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#008069] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <h2 className="font-display text-lg font-semibold">Profile &amp; Preferences</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="min-h-[44px] min-w-[44px] -mr-2 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar src={photoURL} name={displayName || profile.displayName} size="xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload custom profile picture"
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-[#00A884] hover:bg-[#008069] text-white shadow-md flex items-center justify-center border-2 border-white transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Or pick an avatar preset</span>
              <div className="flex items-center gap-2.5">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPhotoURL(preset.url)}
                    title={preset.label}
                    className={`rounded-full p-0.5 transition-all ${
                      photoURL === preset.url
                        ? 'ring-2 ring-[#00A884] ring-offset-2'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {savedNotice && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Profile updated successfully.</span>
            </div>
          )}

          {/* Profile Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-slate-600 mb-1.5">
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
              />
            </div>

            <div>
              <label htmlFor="profile-username" className="block text-xs font-medium text-slate-600 mb-1.5">
                Username Handle (for friends to find you)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                <input
                  id="profile-username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                3-24 characters, lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div>
              <label htmlFor="profile-bio" className="block text-xs font-medium text-slate-600 mb-1.5">
                About / Status
              </label>
              <textarea
                id="profile-bio"
                rows={2}
                maxLength={160}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Hey there! I am using My Chat."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884] resize-none"
              />
            </div>
          </div>

          {/* Share Invite Link */}
          <div className="p-4 rounded-2xl bg-[#F4FBF7] border border-emerald-900/10 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#008069]">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Your Friend Invite Link</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                aria-label="Your invite link"
                className="flex-1 min-h-[40px] px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 truncate"
              />
              <button
                type="button"
                onClick={handleCopyInvite}
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006B57] text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Chat Wallpaper Settings Link */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-600">Chat Wallpaper</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWallpaper();
              }}
              className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-[#E7F8F0] text-[#008069] flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-[#111B21] truncate">
                    {wallpaperSettings.id === 'custom'
                      ? 'Custom Photo Wallpaper'
                      : WALLPAPER_OPTIONS.find((w) => w.id === wallpaperSettings.id)?.label ||
                        'Classic Sand'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    Change theme, upload photo, or toggle doodles
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
