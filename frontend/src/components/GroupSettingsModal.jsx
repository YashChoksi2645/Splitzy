import React, { useState } from 'react';
import api from '../api/axios';
import Typeahead from './Typeahead';
import Avatar from './Avatar';

export default function GroupSettingsModal({ group, onClose, onUpdated, onLeft }) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [savingDetails, setSavingDetails] = useState(false);

  const [memberRaw, setMemberRaw] = useState('');
  const [memberSelected, setMemberSelected] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [addError, setAddError] = useState('');

  const [leaveError, setLeaveError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await api.put(`/groups/${group._id}`, { name, description });
      onUpdated(res.data);
    } finally {
      setSavingDetails(false);
    }
  };

  const addMember = async () => {
    const email = memberSelected ? memberSelected.email : memberRaw.trim();
    if (!email || !email.includes('@')) return setAddError('Search for an existing person, or type a valid email');
    setAddError('');
    setAddingMember(true);
    try {
      const res = await api.post(`/groups/${group._id}/members`, { email });
      onUpdated(res.data);
      setMemberRaw('');
      setMemberSelected(null);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Could not add member');
    } finally {
      setAddingMember(false);
    }
  };

  const leaveGroup = async () => {
    setLeaveError('');
    setLeaving(true);
    try {
      await api.post(`/groups/${group._id}/leave`);
      onLeft();
    } catch (err) {
      const data = err.response?.data;
      if (data?.outstanding?.length) {
        setLeaveError(
          `You still have a balance: ${data.outstanding.map((o) => `${o.currency} ${o.balance}`).join(', ')}. Settle up first.`
        );
      } else {
        setLeaveError(data?.message || 'Could not leave group');
      }
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 text-gray-900">Group settings</h2>

        <div className="space-y-3 mb-6">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Group name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group for?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <button onClick={saveDetails} disabled={savingDetails} className="btn-primary text-sm">
            {savingDetails ? 'Saving…' : 'Save details'}
          </button>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Members ({group.members?.length || 0})</h3>
          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
            {(group.members || []).map((m) => (
              <div key={m._id} className="flex items-center gap-2">
                <Avatar name={m.name} color={m.avatarColor} size={26} />
                <span className="text-sm text-gray-800">{m.name}</span>
              </div>
            ))}
          </div>

          <label className="text-xs font-semibold text-gray-500 mb-1 block">Add a member</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Typeahead
                placeholder="Search name or email…"
                value={memberRaw}
                onChangeValue={(v) => { setMemberRaw(v); setMemberSelected(null); }}
                onSelectUser={(u) => { setMemberSelected(u); setMemberRaw(u.name); }}
              />
            </div>
            <button onClick={addMember} disabled={addingMember} className="btn-secondary text-sm shrink-0">
              {addingMember ? 'Adding…' : 'Add'}
            </button>
          </div>
          {addError && <p className="text-coral-600 text-xs mt-1">{addError}</p>}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-bold text-coral-600 mb-2">Danger zone</h3>
          {!confirmLeave ? (
            <button onClick={() => setConfirmLeave(true)} className="text-sm text-coral-600 font-medium hover:underline">
              Leave this group
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Are you sure you want to leave "{group.name}"?</p>
              <div className="flex gap-2">
                <button onClick={leaveGroup} disabled={leaving} className="text-xs bg-coral-500 hover:bg-coral-600 text-white rounded-lg px-3 py-1.5">
                  {leaving ? 'Leaving…' : 'Yes, leave group'}
                </button>
                <button onClick={() => setConfirmLeave(false)} className="text-xs text-gray-500 px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}
          {leaveError && <p className="text-coral-600 text-xs mt-2">{leaveError}</p>}
        </div>

        <div className="flex justify-end pt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
}
