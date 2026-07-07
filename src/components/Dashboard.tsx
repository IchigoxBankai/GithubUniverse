import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitFork, Star, Folder, Info, 
  MapPin, Compass, Settings, Key, 
  AlertTriangle, X, ExternalLink, Activity
} from 'lucide-react';
import { getRateLimitInfo, saveToken, getToken } from '../services/github';
import type { GitHubRepo, GitHubUser } from '../services/github';
import { getLanguageColor } from './SolarSystem';


// Helper to format numbers (e.g. 1500 -> 1.5k)
function formatNum(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

// 1. Repository Details Panel (Floating Glassmorphism Card)
interface SelectedRepoPanelProps {
  repo: GitHubRepo | null;
  onClose: () => void;
}

export function SelectedRepoPanel({ repo, onClose }: SelectedRepoPanelProps) {
  if (!repo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.95 }}
        className="absolute top-20 right-4 z-20 w-full max-w-md p-6 rounded-2xl glass-panel text-white shadow-2xl border border-white/10"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <span 
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ 
                backgroundColor: `${getLanguageColor(repo.language)}25`, 
                color: getLanguageColor(repo.language),
                border: `1px solid ${getLanguageColor(repo.language)}40`
              }}
            >
              {repo.language || 'HTML/Text'}
            </span>
            <h3 className="text-xl font-bold text-gray-50 flex items-center gap-2">
              {repo.name}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-5 leading-relaxed">
          {repo.description || 'No description provided.'}
        </p>

        {/* Repos stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center">
            <Star size={16} className="text-yellow-400 mb-1" />
            <span className="text-xs text-gray-400">Stars</span>
            <span className="font-bold text-sm mt-0.5">{formatNum(repo.stargazers_count)}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center">
            <GitFork size={16} className="text-blue-400 mb-1" />
            <span className="text-xs text-gray-400">Forks</span>
            <span className="font-bold text-sm mt-0.5">{formatNum(repo.forks_count)}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center">
            <Activity size={16} className="text-green-400 mb-1" />
            <span className="text-xs text-gray-400">Size</span>
            <span className="font-bold text-sm mt-0.5">{formatNum(Math.round(repo.size))} KB</span>
          </div>
        </div>

        {/* Date and details metadata */}
        <div className="space-y-2 text-xs text-gray-400 mb-6 bg-white/3 p-3.5 rounded-xl border border-white/5">
          <div className="flex justify-between">
            <span>Created on</span>
            <span className="font-medium text-gray-200">
              {new Date(repo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Last Active</span>
            <span className="font-medium text-gray-200">
              {new Date(repo.pushed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Repo topics/tags */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Topics</h4>
            <div className="flex flex-wrap gap-1.5">
              {repo.topics.map(topic => (
                <span key={topic} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-300 font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-3">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 font-semibold text-xs tracking-wider uppercase text-center flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-orange-950/40"
          >
            GitHub Repo <ExternalLink size={14} />
          </a>
          {repo.homepage && (
            <a
              href={repo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 font-semibold text-xs tracking-wider uppercase text-center flex items-center justify-center gap-1.5 transition-all"
            >
              Live Demo <ExternalLink size={14} />
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// 2. Profile Dashboard (Left sidebar analytics panels)
interface ProfileDashboardProps {
  user: GitHubUser;
  repos: GitHubRepo[];
}

export function ProfileDashboard({ user, repos }: ProfileDashboardProps) {
  // Aggregate stats
  const stats = useMemo(() => {
    let stars = 0;
    let forks = 0;
    const langCounts: Record<string, number> = {};

    repos.forEach(repo => {
      stars += repo.stargazers_count;
      forks += repo.forks_count;
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
    });

    // Languages percentages
    const sortedLangs = Object.entries(langCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / repos.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { stars, forks, sortedLangs };
  }, [repos]);

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Bio / Profile Glass Widget */}
      <div className="p-5 rounded-2xl glass-panel">
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={user.avatar_url} 
            alt={user.name || user.login} 
            className="w-14 h-14 rounded-full border-2 border-orange-500/50 shadow-md"
          />
          <div>
            <h2 className="text-lg font-bold leading-tight">{user.name || user.login}</h2>
            <a 
              href={user.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:underline flex items-center gap-1 mt-0.5"
            >
              @{user.login} <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {user.bio && (
          <p className="text-xs text-gray-300 leading-relaxed mb-4 italic">
            "{user.bio}"
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-center border-t border-white/5 pt-4">
          <div>
            <div className="text-lg font-bold text-gray-100">{formatNum(user.followers)}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Followers</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-100">{formatNum(user.following)}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Following</div>
          </div>
        </div>

        {/* Location & Company details */}
        {(user.location || user.company) && (
          <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-xs text-gray-400">
            {user.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-orange-500/80" />
                <span>{user.location}</span>
              </div>
            )}
            {user.company && (
              <div className="flex items-center gap-1.5">
                <Folder size={12} className="text-orange-500/80" />
                <span>{user.company}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metrics Grid Widget */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl glass-panel text-center">
          <Folder className="mx-auto mb-1 text-orange-400" size={16} />
          <div className="text-sm font-bold">{user.public_repos}</div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wider">Repos</div>
        </div>
        <div className="p-3.5 rounded-2xl glass-panel text-center">
          <Star className="mx-auto mb-1 text-yellow-400" size={16} />
          <div className="text-sm font-bold">{stats.stars}</div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wider">Stars</div>
        </div>
        <div className="p-3.5 rounded-2xl glass-panel text-center">
          <GitFork className="mx-auto mb-1 text-blue-400" size={16} />
          <div className="text-sm font-bold">{stats.forks}</div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wider">Forks</div>
        </div>
      </div>

      {/* Language Distribution Widget */}
      <div className="p-5 rounded-2xl glass-panel">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Compass size={14} className="text-orange-500" /> Language Distribution
        </h3>
        
        {stats.sortedLangs.length === 0 ? (
          <p className="text-xs text-gray-400">No language data found.</p>
        ) : (
          <div className="space-y-3">
            {stats.sortedLangs.map(lang => (
              <div key={lang.name}>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block" 
                      style={{ backgroundColor: getLanguageColor(lang.name) }}
                    />
                    <span className="font-medium text-gray-200">{lang.name}</span>
                  </span>
                  <span className="text-gray-400 font-mono">{lang.percentage}%</span>
                </div>
                {/* Visual Bar */}
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${lang.percentage}%`,
                      backgroundColor: getLanguageColor(lang.name)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Settings Modal component (for Token management & Limits)
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [tokenInput, setTokenInput] = React.useState(getToken());
  const [rateLimit, setRateLimit] = React.useState(getRateLimitInfo());

  React.useEffect(() => {
    if (isOpen) {
      setTokenInput(getToken());
      setRateLimit(getRateLimitInfo());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveToken(tokenInput);
    onSaved();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-6 rounded-2xl glass-panel text-white shadow-2xl border border-white/10"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Settings size={20} className="text-orange-500" />
            Universe Configuration
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* API Rate Limit display */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 mb-5 space-y-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info size={14} className="text-blue-400" />
            GitHub API Rate Limits
          </h4>
          <div className="flex justify-between text-sm">
            <span>Remaining Requests:</span>
            <span className={`font-mono font-bold ${rateLimit.remaining < 10 ? 'text-red-400' : 'text-green-400'}`}>
              {rateLimit.remaining} / {rateLimit.limit}
            </span>
          </div>
          {rateLimit.reset > 0 && (
            <div className="text-xs text-gray-400 flex justify-between">
              <span>Reset Time:</span>
              <span>{new Date(rateLimit.reset * 1000).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Personal Access Token Input */}
        <div className="space-y-3 mb-6">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block flex items-center gap-1.5">
            <Key size={14} className="text-orange-400" />
            Personal Access Token (PAT)
          </label>
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
          />
          <p className="text-[11px] text-gray-400 leading-normal">
            GitHub limits unauthenticated users to 60 requests/hr. Add a fine-grained or classic token to increase this limit to 5000 requests/hr. Only stored locally in your browser.
          </p>
        </div>

        {/* Warn about token security */}
        <div className="flex gap-2.5 p-3 rounded-xl bg-orange-950/20 border border-orange-500/20 text-orange-200 text-xs leading-normal mb-6">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>No permissions/scopes are required for this token if you only want to visualize public repositories.</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 font-semibold text-xs uppercase tracking-wider text-center transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 font-semibold text-xs uppercase tracking-wider text-center transition-colors shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
