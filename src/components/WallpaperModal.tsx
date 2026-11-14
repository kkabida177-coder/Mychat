import { ChangeEvent, useRef, useState } from 'react';
import { Check, CheckCheck, ImagePlus, Palette, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import {
  DEFAULT_WALLPAPER_SETTINGS,
  WALLPAPER_OPTIONS,
  WallpaperSettings,
} from '../types/chat';

interface WallpaperModalProps {
  settings: WallpaperSettings;
  onUpdateSettings: (next: WallpaperSettings) => void;
  onClose: () => void;
}

function resizeWallpaperFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1080;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Could not load image file.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function getWallpaperSurfaceProps(settings: WallpaperSettings) {
  const matched = WALLPAPER_OPTIONS.find((w) => w.id === settings.id);
  const bgClass = matched?.bgClass ?? 'bg-[#EFEAE2]';
  const activeImageUrl =
    settings.id === 'custom' && settings.customImageUrl
      ? settings.customImageUrl
      : matched?.imageUrl ?? '';

  return {
    bgClass,
    activeImageUrl,
    showDoodles: settings.showDoodles,
    dimming: settings.dimming,
  };
}

export function WallpaperModal({
  settings,
  onUpdateSettings,
  onClose,
}: WallpaperModalProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorOptions = WALLPAPER_OPTIONS.filter((o) => o.kind !== 'image');
  const imageOptions = WALLPAPER_OPTIONS.filter((o) => o.kind === 'image');
  const preview = getWallpaperSurfaceProps(settings);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeWallpaperFile(file);
      onUpdateSettings({
        ...settings,
        id: 'custom',
        customImageUrl: dataUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload wallpaper.');
    }
    e.target.value = '';
  };

  const handleReset = () => {
    setError(null);
    onUpdateSettings(DEFAULT_WALLPAPER_SETTINGS);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chat Wallpaper Settings"
    >
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#008069] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5" />
            <h2 className="font-display text-lg font-semibold">Chat Wallpaper</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallpaper settings"
            className="min-h-[44px] min-w-[44px] -mr-2 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Live Chat Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Live Chat Preview</span>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-[#008069] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </div>

            <div
              className={`relative rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-2.5 ${preview.bgClass}`}
            >
              {preview.activeImageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url("${preview.activeImageUrl}")` }}
                />
              )}
              {preview.showDoodles && (
                <div className="absolute inset-0 chat-wallpaper-pattern pointer-events-none" />
              )}
              {preview.dimming > 0 && (
                <div
                  className="absolute inset-0 bg-white pointer-events-none"
                  style={{ opacity: preview.dimming / 100 }}
                />
              )}

              <div className="relative z-10 flex justify-center">
                <span className="px-2.5 py-0.5 rounded-lg bg-white/90 text-[11px] font-medium text-slate-600 shadow-2xs border border-black/5">
                  Today
                </span>
              </div>

              <div className="relative z-10 flex justify-start">
                <div className="max-w-[78%] bg-white px-3.5 py-2 rounded-2xl rounded-tl-sm shadow-2xs text-xs text-[#111B21]">
                  <p>Hey! How does this wallpaper look? 🌿</p>
                  <span className="block text-right text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    10:24 AM
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex justify-end">
                <div className="max-w-[78%] bg-[#D9FDD3] px-3.5 py-2 rounded-2xl rounded-tr-sm shadow-2xs text-xs text-[#111B21]">
                  <p>Super clean and easy to read! 💚</p>
                  <span className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-0.5 tabular-nums">
                    <span>10:25 AM</span>
                    <CheckCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Custom Image Upload */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold text-slate-600">Custom Photo</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-dashed border-[#00A884] bg-[#F4FBF7] hover:bg-[#E7F8F0] text-[#008069] text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                <span>
                  {settings.customImageUrl ? 'Replace Custom Photo' : 'Upload Wallpaper Image'}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />

              {settings.customImageUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, id: 'custom' })}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                      settings.id === 'custom'
                        ? 'border-[#00A884] bg-emerald-50 text-[#008069] ring-1 ring-[#00A884]/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={settings.customImageUrl}
                      alt="Custom wallpaper thumbnail"
                      className="h-6 w-6 rounded-md object-cover border border-black/10"
                    />
                    <span>Use My Photo</span>
                    {settings.id === 'custom' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        id: settings.id === 'custom' ? 'classic' : settings.id,
                        customImageUrl: '',
                      })
                    }
                    title="Remove custom photo"
                    aria-label="Remove custom photo"
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-500 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Illustrated Wallpapers */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold text-slate-600">
              Illustrated Wallpapers
            </span>
            <div className="grid grid-cols-2 gap-3">
              {imageOptions.map((opt) => {
                const selected = settings.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, id: opt.id })}
                    className={`group relative rounded-2xl overflow-hidden border text-left transition-all ${
                      selected
                        ? 'border-[#00A884] ring-2 ring-[#00A884]/35'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-24 w-full relative overflow-hidden bg-slate-100">
                      <img
                        src={opt.imageUrl}
                        alt={opt.label}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {selected && (
                        <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2 bg-white text-xs font-semibold text-[#111B21]">
                      {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Solid & Gradient Colors */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold text-slate-600">
              Solid &amp; Soft Gradient Themes
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {colorOptions.map((opt) => {
                const selected = settings.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, id: opt.id })}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                      selected
                        ? 'border-[#00A884] bg-emerald-50/70 text-[#008069] ring-1 ring-[#00A884]/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: opt.swatchColor }}
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overlay & Readability Controls */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#008069]" />
                <div>
                  <p className="text-xs font-semibold text-[#111B21]">Chat Doodle Pattern</p>
                  <p className="text-[11px] text-slate-500">
                    Subtle dot motif layered over the chat canvas
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.showDoodles}
                onClick={() =>
                  onUpdateSettings({ ...settings, showDoodles: !settings.showDoodles })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  settings.showDoodles ? 'bg-[#00A884]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    settings.showDoodles ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="wallpaper-dimming" className="font-semibold text-[#111B21]">
                  Background Softness Veil
                </label>
                <span className="text-slate-500 tabular-nums">{settings.dimming}%</span>
              </div>
              <input
                id="wallpaper-dimming"
                type="range"
                min={0}
                max={65}
                step={5}
                value={settings.dimming}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, dimming: Number(e.target.value) })
                }
                className="w-full accent-[#00A884] cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Increase softness to boost message readability over busy photos.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
