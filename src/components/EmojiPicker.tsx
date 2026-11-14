import { useMemo, useState } from 'react';
import { Search, Smile } from 'lucide-react';

interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  items: { char: string; keywords: string }[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    icon: '😀',
    items: [
      { char: '😀', keywords: 'grinning happy smile' },
      { char: '😃', keywords: 'smiley happy joy' },
      { char: '😄', keywords: 'smile laugh happy' },
      { char: '😁', keywords: 'beaming grin teeth' },
      { char: '😆', keywords: 'laughing haha' },
      { char: '😅', keywords: 'sweat smile nervous' },
      { char: '😂', keywords: 'joy tears laugh crying' },
      { char: '🤣', keywords: 'rofl laughing floor' },
      { char: '😊', keywords: 'blush warm smile' },
      { char: '😇', keywords: 'angel halo innocent' },
      { char: '🙂', keywords: 'slight smile' },
      { char: '😉', keywords: 'wink flirt' },
      { char: '😌', keywords: 'relieved calm' },
      { char: '😍', keywords: 'heart eyes love' },
      { char: '🥰', keywords: 'smiling hearts adore' },
      { char: '😘', keywords: 'kiss blowing' },
      { char: '😋', keywords: 'yum delicious' },
      { char: '😎', keywords: 'cool sunglasses' },
      { char: '🤩', keywords: 'star struck excited' },
      { char: '🥳', keywords: 'party celebrate' },
      { char: '🤔', keywords: 'thinking hmm' },
      { char: '🤗', keywords: 'hug warm' },
      { char: '🤭', keywords: 'oops giggle' },
      { char: '🤫', keywords: 'shh quiet secret' },
      { char: '😴', keywords: 'sleep tired zzz' },
      { char: '😢', keywords: 'cry sad tear' },
      { char: '😭', keywords: 'sob crying loud' },
      { char: '😮', keywords: 'surprised wow' },
      { char: '🤯', keywords: 'mind blown shocked' },
      { char: '😤', keywords: 'triumph huff' },
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    icon: '👋',
    items: [
      { char: '👋', keywords: 'wave hello hi bye' },
      { char: '🤚', keywords: 'raised hand stop' },
      { char: '👌', keywords: 'ok perfect' },
      { char: '✌️', keywords: 'peace victory two' },
      { char: '🤞', keywords: 'crossed fingers luck' },
      { char: '🤟', keywords: 'love you' },
      { char: '👍', keywords: 'thumbs up like yes' },
      { char: '👎', keywords: 'thumbs down dislike no' },
      { char: '👏', keywords: 'clap applause bravo' },
      { char: '🙌', keywords: 'celebrate hands up' },
      { char: '🤝', keywords: 'handshake deal agree' },
      { char: '🙏', keywords: 'pray please thanks namaste' },
      { char: '💪', keywords: 'strong muscle flex' },
      { char: '🫶', keywords: 'heart hands love' },
      { char: '✍️', keywords: 'writing note' },
      { char: '👀', keywords: 'eyes looking watch' },
    ],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    icon: '💚',
    items: [
      { char: '💚', keywords: 'green heart love' },
      { char: '❤️', keywords: 'red heart love' },
      { char: '🧡', keywords: 'orange heart' },
      { char: '💛', keywords: 'yellow heart' },
      { char: '💙', keywords: 'blue heart' },
      { char: '💜', keywords: 'purple heart' },
      { char: '🤍', keywords: 'white heart' },
      { char: '💖', keywords: 'sparkling heart' },
      { char: '💯', keywords: '100 hundred perfect' },
      { char: '✨', keywords: 'sparkles shine' },
      { char: '🔥', keywords: 'fire hot lit' },
      { char: '⭐', keywords: 'star favorite' },
      { char: '🎉', keywords: 'party confetti celebrate' },
      { char: '🎊', keywords: 'confetti celebration' },
      { char: '🚀', keywords: 'rocket launch fast' },
      { char: '✅', keywords: 'check done green' },
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    icon: '🌿',
    items: [
      { char: '🌿', keywords: 'herb leaf green plant' },
      { char: '🌱', keywords: 'seedling sprout grow' },
      { char: '🍀', keywords: 'clover luck green' },
      { char: '🌳', keywords: 'tree forest' },
      { char: '🌸', keywords: 'cherry blossom flower' },
      { char: '🌻', keywords: 'sunflower sun' },
      { char: '☀️', keywords: 'sun bright sunny' },
      { char: '🌙', keywords: 'moon night' },
      { char: '🌈', keywords: 'rainbow colors' },
      { char: '🌊', keywords: 'wave ocean water' },
      { char: '🐶', keywords: 'dog puppy pet' },
      { char: '🐱', keywords: 'cat kitty pet' },
      { char: '🦋', keywords: 'butterfly' },
      { char: '🐝', keywords: 'bee honey' },
    ],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: '☕',
    items: [
      { char: '☕', keywords: 'coffee tea morning cafe' },
      { char: '🍵', keywords: 'green tea matcha' },
      { char: '🍕', keywords: 'pizza slice' },
      { char: '🍔', keywords: 'burger food' },
      { char: '🌮', keywords: 'taco' },
      { char: '🍣', keywords: 'sushi' },
      { char: '🥑', keywords: 'avocado green' },
      { char: '🍓', keywords: 'strawberry fruit' },
      { char: '🍉', keywords: 'watermelon' },
      { char: '🍰', keywords: 'cake dessert birthday' },
      { char: '🍪', keywords: 'cookie snack' },
      { char: '🍦', keywords: 'ice cream' },
    ],
  },
  {
    id: 'objects',
    label: 'Work & Fun',
    icon: '💬',
    items: [
      { char: '💬', keywords: 'chat message bubble' },
      { char: '📱', keywords: 'phone mobile' },
      { char: '💻', keywords: 'laptop computer code' },
      { char: '🎧', keywords: 'headphones music listen' },
      { char: '🎵', keywords: 'music note song' },
      { char: '📸', keywords: 'camera photo' },
      { char: '📚', keywords: 'books study read' },
      { char: '📝', keywords: 'memo note write' },
      { char: '📅', keywords: 'calendar date schedule' },
      { char: '⏰', keywords: 'alarm clock time' },
      { char: '📍', keywords: 'pin location map' },
      { char: '🎁', keywords: 'gift present' },
    ],
  },
];

const RECENT_STORAGE_KEY = 'my_chat_recent_emojis';
const DEFAULT_RECENT = ['😀', '😂', '❤️', '💚', '👍', '🙏', '🔥', '🎉'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_RECENT;
  });

  const handlePick = (emoji: string) => {
    const nextRecent = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 12);
    setRecent(nextRecent);
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextRecent));
    } catch {
      // ignore
    }
    onSelect(emoji);
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return EMOJI_CATEGORIES.flatMap((cat) => cat.items).filter(
      (item) => item.keywords.includes(q) || item.char === q
    );
  }, [search]);

  const activeItems =
    EMOJI_CATEGORIES.find((cat) => cat.id === activeCategory)?.items ?? EMOJI_CATEGORIES[0].items;

  return (
    <div
      className="w-[310px] sm:w-[340px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
          />
        </div>
      </div>

      {!searchResults && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 bg-white">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              title={cat.label}
              aria-label={cat.label}
              className={`min-h-[36px] min-w-[36px] rounded-lg text-lg flex items-center justify-center transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#E7F8F0] ring-1 ring-[#00A884]/40'
                  : 'hover:bg-slate-100'
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      <div className="h-[220px] overflow-y-auto p-3 custom-scrollbar space-y-3">
        {searchResults ? (
          searchResults.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-2">Search results</p>
              <div className="grid grid-cols-7 gap-1">
                {searchResults.map((item) => (
                  <button
                    key={item.char}
                    type="button"
                    onClick={() => handlePick(item.char)}
                    className="h-10 w-10 rounded-lg text-xl hover:bg-emerald-50 active:scale-95 transition-transform flex items-center justify-center"
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <Smile className="w-6 h-6" />
              <span>No emojis match "{search}"</span>
            </div>
          )
        ) : (
          <>
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">Recently used</p>
              <div className="grid grid-cols-7 gap-1">
                {recent.map((char) => (
                  <button
                    key={`recent-${char}`}
                    type="button"
                    onClick={() => handlePick(char)}
                    className="h-10 w-10 rounded-lg text-xl hover:bg-emerald-50 active:scale-95 transition-transform flex items-center justify-center"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">
                {EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {activeItems.map((item) => (
                  <button
                    key={item.char}
                    type="button"
                    onClick={() => handlePick(item.char)}
                    className="h-10 w-10 rounded-lg text-xl hover:bg-emerald-50 active:scale-95 transition-transform flex items-center justify-center"
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
