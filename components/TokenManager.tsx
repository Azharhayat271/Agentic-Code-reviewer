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

  // Load token from localStorage on mount
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
    if (confirm('Are you sure you want to delete the stored GitHub token? You will need to enter it again.')) {
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
    return <div className="text-gray-500 text-sm">Loading...</div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">GitHub Token Status:</span>
          {hasToken ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Stored
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              ✗ Not set
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {hasToken && (
            <>
              <button
                onClick={handleEditToken}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteToken}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Delete
              </button>
            </>
          )}
          {!hasToken && !showInput && (
            <button
              onClick={() => setShowInput(true)}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Add Token
            </button>
          )}
        </div>
      </div>

      {showInput && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              GitHub Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ghp_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Token will be encrypted and stored locally in your browser. It's never sent to any server except GitHub's API.
            </p>
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddToken}
              className="px-4 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Save Token
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
