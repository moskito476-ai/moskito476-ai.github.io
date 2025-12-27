
import React, { useState, useEffect, useMemo } from 'react';
import { Song, GenreStat } from './types';
import SongCard from './components/SongCard';
import Visualizer from './components/Visualizer';
import Snowfall from './components/Snowfall';
import InteractiveBackground from './components/InteractiveBackground';
import { getMusicalInsights, suggestNewSong, generateSongArt } from './services/geminiService';

type SortKey = 'title' | 'artist' | 'addedAt';
type SortOrder = 'asc' | 'desc';

const DEFAULT_FALLBACK_IMAGE_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRjNGM0YyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLW11c2ljIj48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTMiLz48Y2lyY2xlIGN4PSI2IiBjeT0iMTgiIHI9IjMiLz48Y2lyY2xlIGN4PSIxOCIgY3k9IjE2IiByPSIzIi8+PC9zdmc+';

const INITIAL_SONGS: Song[] = [
  {
    id: 'cob1',
    title: "Lake Bodom",
    artist: "Children of Bodom",
    spotifyUrl: "https://open.spotify.com/track/1L2N0YjO5W8kF6rG5v8S0T",
    imageUrl: "https://picsum.photos/seed/lakebodom/400/400",
    genre: "Metal",
    mood: "Aggressive",
    addedAt: Date.now()
  },
  {
    id: 'cob2',
    title: "Are You Dead Yet?",
    artist: "Children of Bodom",
    spotifyUrl: "https://open.spotify.com/track/4C6h2vC57mS9u0E9O9u9A9",
    imageUrl: "https://picsum.photos/seed/areyoudeadyet/400/400",
    genre: "Metal",
    mood: "Heavy",
    addedAt: Date.now() - 500
  },
  {
    id: '1',
    title: "Frozen",
    artist: "Madonna",
    spotifyUrl: "https://open.spotify.com/track/4Y9f6lY7XjK8q3MvI9f6lY",
    imageUrl: "https://picsum.photos/seed/frozen/400/400",
    genre: "Pop",
    mood: "Mystic",
    addedAt: Date.now() - 1000
  }
];

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [insights, setInsights] = useState<string>("");
  const [suggestion, setSuggestion] = useState<{title: string, artist: string, reason: string} | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  
  const [sortKey, setSortKey] = useState<SortKey>('addedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [formState, setFormState] = useState({ title: '', artist: '', url: '', genre: 'Pop' });

  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [songs, sortKey, sortOrder]);

  const genreStats = useMemo(() => {
    const stats: Record<string, number> = {};
    songs.forEach(s => { stats[s.genre] = (stats[s.genre] || 0) + 1; });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [songs]);

  const fetchAIContent = async () => {
    if (songs.length === 0) return;
    setLoadingInsights(true);
    try {
      const [insightText, recommended] = await Promise.all([
        getMusicalInsights(songs),
        suggestNewSong(songs)
      ]);
      setInsights(insightText);
      setSuggestion(recommended);
    } catch (error) {
      console.error("AI Fetch error:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => { fetchAIContent(); }, [songs.length]);

  const openAddModal = () => {
    setFormState({ title: '', artist: '', url: '', genre: 'Pop' });
    setModalMode('add');
  };

  const openEditModal = (song: Song) => {
    setEditingSong(song);
    setFormState({ title: song.title, artist: song.artist, url: song.spotifyUrl, genre: song.genre });
    setModalMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingImage(true);
    try {
      const aiImage = await generateSongArt(formState.title, formState.artist, formState.genre);
      const finalImageUrl = aiImage || DEFAULT_FALLBACK_IMAGE_URL;

      if (modalMode === 'add') {
        const song: Song = {
          id: Math.random().toString(36).substr(2, 9),
          title: formState.title,
          artist: formState.artist,
          spotifyUrl: formState.url || 'https://open.spotify.com',
          imageUrl: finalImageUrl,
          genre: formState.genre,
          mood: 'Winter',
          addedAt: Date.now()
        };
        setSongs([song, ...songs]);
      } else if (modalMode === 'edit' && editingSong) {
        setSongs(songs.map(s => s.id === editingSong.id ? { ...s, ...formState, imageUrl: finalImageUrl } : s));
      }
      setModalMode(null);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить этот трек из зимней коллекции?')) {
      setSongs(songs.filter(s => s.id !== id));
    }
  };

  return (
    <div className="min-h-screen relative pb-20 overflow-x-hidden">
      <InteractiveBackground />
      <Snowfall />

      <header className="sticky top-0 z-50 bg-slate-950/20 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8Z"/><path d="M12 8v8"/><path d="m8 12 8 8"/><path d="m16 12-8 8"/><path d="M12 4v2"/><path d="M12 18v2"/><path d="M4 12h2"/><path d="M18 12h2"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none">VibeTracks</h1>
              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.3em]">Winter Edition</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://open.spotify.com/user/31bwwlz7ziglloqj6mg6pwy3mvoe" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.833 17.067c-.208.342-.642.458-1 .25c-1.392-.85-3.1-1.042-5.183-.583-1.05.225-2.075.083-2.925-.267-.408-.167-.85-.017-1.0.358-.158.375.008.792.408.95c1.1.458 2.258.625 3.5.475 2.5-.542 4.417-.375 6.092.642.367.217.808.067 1-.358.192-.417.033-.85-.358-1.067-1.158-.692-2.583-.933-4.083-.758-1.55.183-3.108.458-4.667.883-1.7.475-3.558.292-5.067-.583-.433-.25-.942-.167-1.292.158-.35.325-.4.808-.083 1.158 1.15.6 2.392.817 3.65.658 1.483-.183 2.917-.467 4.383-.883 1.892-.55 3.842-.317 5.483.508.383.2.783.15.967-.25.2-.417.117-.85-.208-1.083z"/>
              </svg>
              <span className="hidden sm:inline text-[11px] font-black text-white uppercase tracking-widest">Профиль</span>
            </a>

            <button 
              onClick={openAddModal}
              className="bg-white hover:bg-blue-50 text-slate-950 font-black py-3 px-8 rounded-full text-xs transition-all transform active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              + ДОБАВИТЬ ЛЕД
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-8 space-y-12">
            <section>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
                <div>
                  <h2 className="text-5xl font-black text-white mb-3 tracking-tighter drop-shadow-lg">Зимний Плейлист</h2>
                  <div className="h-1.5 w-16 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
                </div>
                
                <div className="flex items-center gap-4 bg-slate-900/30 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 self-start sm:self-auto">
                  <div className="flex items-center gap-3 px-4 border-r border-white/10">
                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Порядок:</span>
                    <select 
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="bg-transparent text-xs font-black text-white focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="addedAt">Дата</option>
                      <option value="title">Название</option>
                      <option value="artist">Артист</option>
                    </select>
                  </div>
                  <button onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-200">
                    {sortOrder === 'asc' ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/></svg>}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {sortedSongs.map(song => (
                  <SongCard key={song.id} song={song} onDelete={handleDelete} onEdit={openEditModal} />
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                 <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1"><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="M2 12h20"/><path d="m19.07 4.93-14.14 14.14"/></svg>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-blue-400 font-black text-[11px] uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
                  Снежная Аналитика
                </h3>
                
                {loadingInsights ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-3 bg-white/10 rounded w-full"></div>
                    <div className="h-3 bg-white/10 rounded w-4/5"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-white text-xl font-medium leading-relaxed mb-10 italic drop-shadow-md">"{insights}"</p>
                    {suggestion && (
                      <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                        <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mb-4">Ледяная рекомендация:</p>
                        <p className="font-black text-white text-2xl mb-1">{suggestion.title}</p>
                        <p className="text-blue-200/60 text-sm mb-5">{suggestion.artist}</p>
                        <p className="text-xs text-white/40 leading-relaxed border-l-2 border-blue-500/50 pl-4">{suggestion.reason}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <Visualizer data={genreStats} />
          </div>
        </div>
      </main>

      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-950/80" onClick={() => !isGeneratingImage && setModalMode(null)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-lg p-12 shadow-3xl overflow-hidden">
            <h3 className="text-3xl font-black mb-10 text-white tracking-tighter">
              {modalMode === 'add' ? 'Заморозить Трек' : 'Обновить Лед'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                value={formState.title}
                onChange={e => setFormState({ ...formState, title: e.target.value })}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Название песни"
                required
              />
              <input
                value={formState.artist}
                onChange={e => setFormState({ ...formState, artist: e.target.value })}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Исполнитель"
                required
              />
              <input
                value={formState.url}
                onChange={e => setFormState({ ...formState, url: e.target.value })}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Spotify URL"
              />
              <select
                value={formState.genre}
                onChange={e => setFormState({ ...formState, genre: e.target.value })}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none"
              >
                <option value="Pop">Поп</option>
                <option value="Rock">Рок</option>
                <option value="Metal">Метал</option>
                <option value="Electronic">Электронная</option>
                <option value="Hip Hop">Хип-хоп</option>
              </select>

              <button
                type="submit"
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-black rounded-2xl text-lg shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? "ГЕНЕРАЦИЯ ЛЬДА..." : "ДОБАВИТЬ В ХОЛОД"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
