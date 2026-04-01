'use client';

import { useState, useEffect } from 'react';
import { getStoredToken, saveStoredToken, clearStoredToken, isValidGitHubToken } from '@/lib/encryption';

interface TokenManagerProps {
  onTokenChange?: (token: string | null) => void;
}

export default function TokenManager({ onTokenChange }: TokenManagerProps) {
  const [hasToken, setHasToken] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    setHasToken(!!token);
    setLoading(false);
  }, []);

  const handleAddToken = () => {
    setError('');
    
    if (!inputValue.trim()) {
      setError('Token cannot be empty');
      return;
    }

    if (!isValidGitHubToken(inputValue)) {
      setError('Invalid GitHub token format. Token should start with "ghp_" and be at least 20 characters long.');
      return;
    }

    if (saveStoredToken(inputValue)) {
      setHasToken(true);
      setInputValue('');
      setShowInput(false);
      onTokenChange?.(inputValue);
    } else {
      setError('Failed to save token. Please try again.');
    }
  };

  const handleEditToken = () => {
    setError('');
    setInputValue('');
    setShowInput(true);
  };

  const handleDeleteToken = () => {
    if (confirm('Are you sure you want to delete the stored GitHub token?')) {
      clearStoredToken();
      setHasToken(false);
      setShowInput(false);
      setInputValue('');
      onTokenChange?.(null);
    }
  };

  const handleCancel = () => {
    setShowInput(false);
    setInputValue('');
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddToken();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (loading) {
    return <div className="text-zinc-400 text-sm font-inter">Loading...</div>;
  }

  return (
    <div className="card-glass card-glass-accent rounded-xl p-6 mb-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: hasToken ? '#10b981' : '#ef233c' }}></div>
          <span className="font-inter text-sm font-medium text-white">GitHub Token</span>
          {hasToken && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
              ✓ Encrypted & Stored
            </span>
          )}
          {!hasToken && !showInput && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              ✗ Not Set
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {hasToken && (
            <>
              <button
                onClick={handleEditToken}
                className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteToken}
                className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all"
              >
                Delete
              </button>
            </>
          )}
          {!hasToken && !showInput && (
            <button
              onClick={() => setShowInput(true)}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all"
            >
              Add Token
            </button>
          )}
        </div>
      </div>

      {showInput && (
        <div className="mt-4 space-y-3 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2 font-inter">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ghp_..."
              className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors font-inter placeholder:text-zinc-600"
              autoFocus
            />
            <p className="text-xs text-zinc-500 mt-2 font-inter">
              🔒 Token is encrypted locally in your browser. Never sent to any server except GitHub API.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 font-inter">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddToken}
              className="flex-1 py-2.5 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all font-inter"
            >
              Save Token
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-semibold transition-all font-inter"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
