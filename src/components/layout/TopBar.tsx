import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Sliders,
  Clock,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { SearchHistoryItem } from '../../types';

interface TopBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onSearchSubmit: (query: string) => void;
  onOpenEqualizer: () => void;
  initialQuery?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onSearchSubmit,
  onOpenEqualizer,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when query changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        try {
          const res = await api.getSearchSuggestions(query.trim());
          setSuggestions(res.slice(0, 7));
        } catch (e) {
          console.warn('Suggestions error:', e);
        }
      } else {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleFocus = async () => {
    setIsOpen(true);
    try {
      const hist = await api.getSearchHistory();
      setHistory(hist.slice(0, 6));
    } catch (e) {
      console.warn('Failed to get search history:', e);
    }
  };

  const handleSubmit = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsOpen(false);
    api.addSearchHistory(trimmed).catch(console.warn);
    onSearchSubmit(trimmed);
  };

  const handleClearHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.clearSearchHistory();
      setHistory([]);
    } catch (e) {
      console.warn('Failed to clear search history:', e);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#0A0B0E]/80 backdrop-blur-xl border-b border-white/5">
      {/* Navigation history controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className={`p-1.5 rounded-full bg-white/5 transition-colors ${
            canGoBack
              ? 'text-white hover:bg-white/10 active:scale-95'
              : 'text-neutral-600 cursor-not-allowed opacity-50'
          }`}
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className={`p-1.5 rounded-full bg-white/5 transition-colors ${
            canGoForward
              ? 'text-white hover:bg-white/10 active:scale-95'
              : 'text-neutral-600 cursor-not-allowed opacity-50'
          }`}
          title="Go forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input & Dropdown */}
      <div ref={containerRef} className="relative flex-1 max-w-md mx-6">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit(query);
            }}
            placeholder="Search songs, artists, albums, or playlists..."
            className="w-full pl-10 pr-9 py-2 rounded-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/10 border border-white/5 focus:border-accent-red/50 text-sm text-white placeholder-neutral-500 focus:outline-none transition-all"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              className="absolute right-3 p-1 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/10 bg-[#16181F]/95 backdrop-blur-xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
            {/* Realtime suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-2">
                <span className="px-3 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Suggestions
                </span>
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(sug);
                      handleSubmit(sug);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {query.trim().length <= 1 && history.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Recent Searches
                  </span>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setQuery(item.query);
                      handleSubmit(item.query);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{item.query}</span>
                  </button>
                ))}
              </div>
            )}

            {suggestions.length === 0 && history.length === 0 && (
              <div className="p-4 text-center text-xs text-neutral-500">
                Type to search across YouTube Music
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenEqualizer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-neutral-300 hover:text-white transition-all active:scale-95"
          title="Open Audio Equalizer"
        >
          <Sliders className="w-3.5 h-3.5 text-accent-red" />
          <span className="hidden sm:inline font-medium">EQ & FX</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-red to-orange-500 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-accent-red/20 select-none">
          V
        </div>
      </div>
    </header>
  );
};
