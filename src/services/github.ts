// GitHub API integration with localStorage caching and rate-limiting detection

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
  created_at: string;
  location: string | null;
  company: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number; // in KB
  language: string | null;
  languages_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics?: string[];
}

export interface RateLimitState {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  hasExceeded: boolean;
}

const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in ms

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  const token = localStorage.getItem('github_universe_token');
  if (token && token.trim() !== '') {
    headers['Authorization'] = `token ${token.trim()}`;
  }
  return headers;
}

export function saveToken(token: string) {
  if (token) {
    localStorage.setItem('github_universe_token', token.trim());
  } else {
    localStorage.removeItem('github_universe_token');
  }
}

export function getToken(): string {
  return localStorage.getItem('github_universe_token') || '';
}

export function getRateLimitInfo(): RateLimitState {
  const cached = localStorage.getItem('github_universe_ratelimit');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Check if current time has passed reset time
      if (Date.now() / 1000 > parsed.reset) {
        return { limit: 60, remaining: 60, reset: 0, hasExceeded: false };
      }
      return parsed;
    } catch {
      // Ignore
    }
  }
  return { limit: 60, remaining: 60, reset: 0, hasExceeded: false };
}

function updateRateLimitInfo(headers: Headers) {
  const limit = Number(headers.get('x-ratelimit-limit') || '0');
  const remaining = Number(headers.get('x-ratelimit-remaining') || '1');
  const reset = Number(headers.get('x-ratelimit-reset') || '0');
  
  if (limit) {
    const rateLimit: RateLimitState = {
      limit,
      remaining,
      reset,
      hasExceeded: remaining === 0 && (Date.now() / 1000 < reset),
    };
    localStorage.setItem('github_universe_ratelimit', JSON.stringify(rateLimit));
  }
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  try {
    const item: CacheItem<T> = JSON.parse(cached);
    if (Date.now() - item.timestamp < CACHE_EXPIRY) {
      return item.data;
    }
    localStorage.removeItem(key); // Stale
  } catch {
    localStorage.removeItem(key);
  }
  return null;
}

function setCachedData<T>(key: string, data: T) {
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export async function fetchGitHubProfile(username: string): Promise<{ user: GitHubUser; repos: GitHubRepo[] }> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) throw new Error('Username cannot be empty');

  // Check cache
  const cacheKey = `gh_universe_cache_${cleanUsername}`;
  const cached = getCachedData<{ user: GitHubUser; repos: GitHubRepo[] }>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const headers = getHeaders();
  
  // User Profile
  const profileRes = await fetch(`https://api.github.com/users/${cleanUsername}`, { headers });
  updateRateLimitInfo(profileRes.headers);

  if (profileRes.status === 404) {
    throw new Error(`User "${username}" not found on GitHub.`);
  }
  if (profileRes.status === 403 || profileRes.status === 429) {
    const rateLimit = getRateLimitInfo();
    if (rateLimit.hasExceeded) {
      const resetTime = new Date(rateLimit.reset * 1000).toLocaleTimeString();
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}. Add a GitHub Token in settings to bypass.`);
    }
    throw new Error('GitHub API access forbidden or rate-limited.');
  }
  if (!profileRes.ok) {
    throw new Error(`Failed to fetch user profile: ${profileRes.statusText}`);
  }

  const user: GitHubUser = await profileRes.json();

  // Repos (up to 100 public repos for performance & visibility)
  const reposRes = await fetch(`https://api.github.com/users/${cleanUsername}/repos?per_page=100&sort=updated`, { headers });
  updateRateLimitInfo(reposRes.headers);

  if (!reposRes.ok) {
    throw new Error(`Failed to fetch user repositories: ${reposRes.statusText}`);
  }

  const repos: GitHubRepo[] = await reposRes.json();

  const result = { user, repos };
  setCachedData(cacheKey, result);
  
  // Add to Search History
  addToSearchHistory(user);

  return result;
}

export interface SearchHistoryEntry {
  username: string;
  name: string | null;
  avatarUrl: string;
  timestamp: number;
}

export function getSearchHistory(): SearchHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem('github_universe_history') || '[]');
  } catch {
    return [];
  }
}

function addToSearchHistory(user: GitHubUser) {
  try {
    let history = getSearchHistory();
    // Remove if exists
    history = history.filter(item => item.username.toLowerCase() !== user.login.toLowerCase());
    // Insert at front
    history.unshift({
      username: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      timestamp: Date.now(),
    });
    // Keep top 6
    history = history.slice(0, 6);
    localStorage.setItem('github_universe_history', JSON.stringify(history));
  } catch {
    // Ignore
  }
}

export function clearSearchHistory() {
  localStorage.removeItem('github_universe_history');
}
