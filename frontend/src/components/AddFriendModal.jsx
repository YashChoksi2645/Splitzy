import React, { useState } from 'react';
import api from '../api/axios';
import Typeahead from './Typeahead';

export default function AddFriendModal({ onClose, onAdded }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [rawInput, setRawInput] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setEmail(user.email);
    setError('');
  };

  const handleRawChange = (val) => {
    setRawInput(val);
    // if they're typing a fresh name, any previous selection no longer applies
    if (selectedUser && val !== selectedUser.name) setSelectedUser(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const targetEmail = selectedUser ? selectedUser.email : email;
    if (!targetEmail) return setError('Search for an existing person above, or type their email below');

    setLoading(true);
    try {
      const res = await api.post('/friends/request', {
        email: targetEmail,
        name: selectedUser ? selectedUser.name : rawInput
      });
      if (res.data.status === 'pending') {
        setInfo(`Friend request sent to ${res.data.friend.name}. They'll show up once they accept.`);
        setTimeout(() => onAdded(), 1200);
      } else {
        onAdded();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add friend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1 text-gray-900">Add a friend</h2>
        <p className="text-sm text-gray-500 mb-4">Search for someone already on Splitzy, or invite by email.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Search by name or email</label>
            <Typeahead
              placeholder="Start typing a name or email…"
              value={rawInput}
              onChangeValue={handleRawChange}
              onSelectUser={handleSelectUser}
            />
            {selectedUser && (
              <p className="text-xs text-mint-600 mt-1">✓ Selected {selectedUser.name} ({selectedUser.email})</p>
            )}
          </div>

          {!selectedUser && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Or invite a new email directly</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          )}

          {error && <p className="text-coral-600 text-xs">{error}</p>}
          {info && <p className="text-mint-600 text-xs">{info}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm">{loading ? 'Adding…' : 'Add friend'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
