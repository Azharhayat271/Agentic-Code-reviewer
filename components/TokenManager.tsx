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
    return <div className="text-[#666666] text-sm font-inter">Loading...</div>;
  }

  return (
    <div className="card-glass rounded-2xl p-6 border border-[#FF6B50]/20 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: hasToken ? '#10b981' : '#FF6B50' }}></div>
          <span className="font-inter text-sm font-medium text-white">GitHub Token</span>
          {hasToken && (
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/20 uppercase tracking-wider">
              ✓ Stored
            </span>
          )}
          {!hasToken && !showInput && (
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#FF6B50]/10 text-[#FF6B50] border border-[#FF6B50]/20 uppercase tracking-wider">
              ✗ Not Set
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {hasToken && (
            <>
              <button
                onClick={handleEditToken}
                className="px-4 py-2 text-xs font-bold bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#333333] rounded-lg hover:bg-[#222222] transition-all uppercase tracking-wider"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteToken}
                className="px-4 py-2 text-xs font-bold bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#333333] rounded-lg hover:bg-[#222222] transition-all uppercase tracking-wider"
              >
                Delete
              </button>
            </>
          )}
          {!hasToken && !showInput && (
            <button
              onClick={() => setShowInput(true)}
              className="px-4 py-2 text-xs font-bold bg-[#FF6B50] text-black rounded-lg hover:bg-[#E55A40] transition-all uppercase tracking-wider"
            >
              Add Token
            </button>
          )}
        </div>
      </div>

      {showInput && (
        <div className="mt-6 space-y-4 animate-fade-up">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[#666666] mb-3 font-inter">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ghp_..."
              className="w-full bg-[#0a0a0a] border border-[#333333] rounded-xl px-5 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B50] transition-colors font-inter placeholder:text-[#444444]"
              autoFocus
            />
            <p className="text-xs text-[#666666] mt-3 font-inter">
              🔒 Token is encrypted locally in your browser. Never sent to any server except GitHub API.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-300 font-inter">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAddToken}
              className="flex-1 py-3 px-5 text-xs font-bold bg-[#FF6B50] hover:bg-[#E55A40] text-black rounded-xl transition-all font-inter uppercase tracking-wider"
            >
              Save Token
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-3 text-xs font-bold bg-[#1a1a1a] hover:bg-[#222222] text-[#888888] hover:text-white border border-[#333333] rounded-xl transition-all font-inter uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
