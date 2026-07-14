import React, { useState } from 'react';
import api from '../api/axios';
import Typeahead from './Typeahead';

export default function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState('Home');
  // each row: { rawInput, selectedUser }
  const [rows, setRows] = useState([{ rawInput: '', selectedUser: null }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateRow = (i, patch) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows([...rows, { rawInput: '', selectedUser: null }]);
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // For each row: if an existing user was picked, use their email.
    // Otherwise, if it looks like a typed email, invite that directly.
    const emails = rows
      .map((r) => (r.selectedUser ? r.selectedUser.email : r.rawInput.trim()))
      .filter((v) => v && v.includes('@'));

    if (!name.trim()) return setError('Group name is required');

    setLoading(true);
    try {
      const res = await api.post('/groups', {
        name,
        groupType,
        memberEmails: emails
      });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-1 text-gray-900">Start a new group</h2>
        <p className="text-sm text-gray-500 mb-4">My group shall be called…</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400"
          />
          <select
            value={groupType}
            onChange={(e) => setGroupType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option>Home</option>
            <option>Trip</option>
            <option>Couple</option>
            <option>Other</option>
          </select>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Group members — search existing people, or type a new email to invite
            </p>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Typeahead
                      placeholder="Name or email"
                      value={row.rawInput}
                      onChangeValue={(val) => updateRow(i, { rawInput: val, selectedUser: val === row.selectedUser?.name ? row.selectedUser : null })}
                      onSelectUser={(user) => updateRow(i, { selectedUser: user, rawInput: user.name })}
                    />
                  </div>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} className="text-coral-500 hover:text-coral-600 text-sm px-1">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addRow} className="text-brand-600 text-sm font-medium mt-2">
              + Add a person
            </button>
          </div>

          {error && <p className="text-coral-600 text-xs">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm">{loading ? 'Creating…' : 'Create group'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
