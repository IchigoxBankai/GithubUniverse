import React, { useState, useEffect } from 'react';
import { 
  Search, Settings, History, Sparkles,
  ArrowRight, Loader2, AlertCircle
} from 'lucide-react';
import { fetchGitHubProfile, getSearchHistory, clearSearchHistory } from './services/github';

import type { GitHubUser, GitHubRepo, SearchHistoryEntry } from './services/github';
import { SolarSystem } from './components/SolarSystem';
import { ProfileDashboard, SelectedRepoPanel, SettingsModal } from './components/Dashboard';

export default function App() {
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{ user: GitHubUser; repos: GitHubRepo[] } | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  
  // History and Settings state
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [profileData]);


  const handleSearch = async (username: string) => {
    const query = username.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setSelectedRepo(null);

    try {
      const data = await fetchGitHubProfile(query);
      setProfileData(data);
      setUsernameInput('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching user profile.');
    } finally {
      setLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(usernameInput);
    }
  };

  const clearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#020205] text-gray-100 flex flex-col relative overflow-hidden font-sans">
      
      {/* 1. Header (Floating Glassmorphism Navbar) */}
      <header className="z-10 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/30 sticky top-0">
        <div 
          onClick={() => setProfileData(null)} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="p-2 bg-orange-600 rounded-xl group-hover:bg-orange-500 transition-colors shadow-lg shadow-orange-950/40">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              GitHub Universe
            </h1>
            <span className="text-[10px] text-gray-500 tracking-wider uppercase font-mono block -mt-1">
              3D Solar Visualizer
            </span>
          </div>
        </div>

        {/* Search & Config Header segment */}
        <div className="flex items-center gap-3 max-w-lg w-full justify-end">
          {profileData && (
            <div className="relative flex-1 hidden md:block">
              <input
                type="text"
                placeholder="Search another username..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs glass-input"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={12} />
            </div>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white transition-colors"
            title="API Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* 2. Main Space Container */}
      <main className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Render 3D Canvas in background when profile is loaded */}
        {profileData ? (
          <div className="absolute inset-0 z-0">
            <SolarSystem 
              user={profileData.user} 
              repos={profileData.repos} 
              selectedRepo={selectedRepo}
              onSelectRepo={setSelectedRepo}
            />

            {/* Float profile card inside canvas */}
            <div className="absolute top-4 left-4 z-10 w-full max-w-sm max-h-[85vh] overflow-y-auto hidden md:block select-none">
              <ProfileDashboard user={profileData.user} repos={profileData.repos} />
            </div>

            {/* Selected planet panel details */}
            <SelectedRepoPanel repo={selectedRepo} onClose={() => setSelectedRepo(null)} />
          </div>
        ) : (
          
          /* Welcome Search landing page */
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 py-12 z-10">
            
            {/* Center Header */}
            <div className="text-center mb-10 max-w-xl">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-950/40">
                <svg className="text-white" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"/>
                </svg>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-white mb-3">
                Visualize GitHub as a 3D Solar System
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Enter any GitHub username to transform public repositories into orbiting planets, stars, and moons. Experience real-time stats mapped directly to orbital physics.
              </p>
            </div>

            {/* Main search bar */}
            <div className="w-full max-w-lg mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter a GitHub username... (e.g. torvalds)"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  className="w-full pl-12 pr-28 py-3.5 rounded-2xl glass-input text-base text-white shadow-2xl"
                />
                <Search className="absolute left-4 top-4.5 text-gray-400" size={18} />
                
                <button
                  onClick={() => handleSearch(usernameInput)}
                  disabled={loading || !usernameInput.trim()}
                  className="absolute right-2 top-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 rounded-xl font-semibold text-xs tracking-wider uppercase text-white flex items-center gap-1 transition-colors"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>Visualize <ArrowRight size={14} /></>
                  )}
                </button>
              </div>

              {/* Error Box */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-950/20 border border-red-500/20 flex gap-3 text-red-200 text-xs">
                  <AlertCircle size={18} className="shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Execution Error</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Search history cache list */}
            {history.length > 0 && (
              <div className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <History size={12} /> Recent Explorations
                  </span>
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] text-gray-500 hover:text-white transition-colors"
                  >
                    Clear History
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {history.map((entry) => (
                    <div
                      key={entry.username}
                      onClick={() => handleSearch(entry.username)}
                      className="p-2.5 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 flex items-center gap-2 cursor-pointer transition-all select-none"
                    >
                      <img 
                        src={entry.avatarUrl} 
                        alt="" 
                        className="w-6 h-6 rounded-full border border-white/10"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{entry.name || entry.username}</div>
                        <div className="text-[10px] text-gray-400 truncate">@{entry.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Mobile Sidebar overlay widget */}
      {profileData && (
        <div className="md:hidden z-10 px-6 py-4 border-t border-white/5 bg-black/40 backdrop-blur-md">
          <ProfileDashboard user={profileData.user} repos={profileData.repos} />
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSaved={() => {}}
      />
    </div>
  );
}
