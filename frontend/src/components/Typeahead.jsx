import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import Avatar from './Avatar';

/**
 * Search-as-you-type input for finding existing registered users by name or email
 * (used when adding a friend or a group member). Fixes the earlier bug where
 * typed text and the clear ("x") button were invisible - every element here has
 * an explicit text color instead of relying on inherited/default styles.
 *
 * onSelectUser(user) fires when an existing account is picked from the dropdown.
 * onRawValueChange(value) fires on every keystroke so the parent can still fall
 * back to "invite this email even though no account exists yet."
 */
export default function Typeahead({ placeholder = 'Name or email', onSelectUser, onRawValueChange, value, onChangeValue }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (typeof value === 'string' && value !== query) setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChangeValue?.(val);
    onRawValueChange?.(val);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/users/search', { params: { q: val.trim() } });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    onChangeValue?.('');
    onRawValueChange?.('');
  };

  const selectUser = (user) => {
    setQuery(user.name);
    setOpen(false);
    setResults([]);
    onChangeValue?.(user.name);
    onSelectUser?.(user);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {open && (loading || results.length > 0) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
          {!loading && results.map((u) => (
            <button
              type="button"
              key={u._id}
              onClick={() => selectUser(u)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-brand-50 transition"
            >
              <Avatar name={u.name} color={u.avatarColor} size={26} />
              <span className="min-w-0">
                <span className="block text-sm text-gray-900 truncate">{u.name}</span>
                <span className="block text-xs text-gray-500 truncate">{u.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
