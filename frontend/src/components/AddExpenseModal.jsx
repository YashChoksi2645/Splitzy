import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { CATEGORY_ICONS } from '../utils/helpers';

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€' };

/**
 * Matches the real Splitwise "Add an expense" layout:
 *   With you and: [people picker]
 *   [icon] [description]                 ₹ [amount]
 *   Paid by [pill] and split [pill].  (₹x/person)
 *   [date] [Add image/notes]
 *   [Choose group]                          Cancel  Save
 *
 * Props:
 *   initialGroupId    - preselect a group (e.g. opened from inside a Group page)
 *   initialMembers    - [{id, name}] people to preselect as participants
 *                        (e.g. the group's members, or [you, friend] from a Friend page)
 *   currency          - default currency for the amount field
 *   expenseToEdit     - if provided (a populated expense object), the modal opens in
 *                        Edit mode: fields are prefilled and Save calls PUT instead of POST
 */
export default function AddExpenseModal({ groupId: initialGroupId = null, members: initialMembers = [], currency: defaultCurrency = 'INR', expenseToEdit = null, onClose, onCreated }) {
  const { user } = useAuth();
  const me = { id: user?.id, name: 'You' };
  const isEditMode = !!expenseToEdit;

  const [description, setDescription] = useState(expenseToEdit?.description || '');
  const [category, setCategory] = useState(expenseToEdit?.category || 'general');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [totalAmount, setTotalAmount] = useState(expenseToEdit ? String(expenseToEdit.totalAmount) : '');
  const [currency, setCurrency] = useState(expenseToEdit?.currency || defaultCurrency);
  const [date, setDate] = useState(() =>
    expenseToEdit ? new Date(expenseToEdit.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(expenseToEdit?.notes || '');
  const [showNotes, setShowNotes] = useState(!!expenseToEdit?.notes);

  const [groupId, setGroupId] = useState(expenseToEdit ? (expenseToEdit.groupId?._id || expenseToEdit.groupId || null) : initialGroupId);
  const [groupName, setGroupName] = useState(expenseToEdit?.groupId?.name || null);
  const [groupsList, setGroupsList] = useState([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const [friendsList, setFriendsList] = useState([]);
  const [participants, setParticipants] = useState(() => {
    if (expenseToEdit) {
      return expenseToEdit.splits.map((s) => ({
        id: s.userId?._id || s.userId,
        name: (s.userId?._id || s.userId) === me.id ? 'You' : (s.userId?.name || 'Unknown')
      }));
    }
    return [me, ...initialMembers.filter((m) => m.id !== me.id)];
  });
  const [peopleQuery, setPeopleQuery] = useState('');
  const [showPeopleDropdown, setShowPeopleDropdown] = useState(false);

  const [paidBy, setPaidBy] = useState(expenseToEdit ? (expenseToEdit.paidBy?._id || expenseToEdit.paidBy) : user?.id);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [splitType, setSplitType] = useState(expenseToEdit?.splitType || 'equal');
  const [showSplitPicker, setShowSplitPicker] = useState(false);
  const [exactValues, setExactValues] = useState(() => {
    if (expenseToEdit?.splitType === 'exact') {
      return Object.fromEntries(expenseToEdit.splits.map((s) => [s.userId?._id || s.userId, String(s.amountOwed)]));
    }
    return {};
  });
  const [percentValues, setPercentValues] = useState(() => {
    if (expenseToEdit?.splitType === 'percentage') {
      return Object.fromEntries(expenseToEdit.splits.map((s) => [
        s.userId?._id || s.userId,
        ((s.amountOwed / expenseToEdit.totalAmount) * 100).toFixed(2)
      ]));
    }
    return {};
  });
  // NOTE: original share weights aren't stored on the expense (only the resulting
  // amountOwed is), so editing a shares-split expense starts with blank share
  // inputs - re-enter the weights if you want to adjust a shares split.
  const [shareValues, setShareValues] = useState({});

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const groupPickerRef = useRef(null);
  const paidByRef = useRef(null);
  const splitRef = useRef(null);
  const peopleRef = useRef(null);
  const categoryRef = useRef(null);

  useEffect(() => {
    api.get('/friends').then((res) => setFriendsList(res.data)).catch(() => {});
    api.get('/groups').then((res) => setGroupsList(res.data)).catch(() => {});
    if (initialGroupId) {
      api.get(`/groups/${initialGroupId}`).then((res) => {
        setGroupName(res.data.name);
        setParticipants([me, ...res.data.members.filter((m) => m._id !== me.id).map((m) => ({ id: m._id, name: m.name }))]);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (groupPickerRef.current && !groupPickerRef.current.contains(e.target)) setShowGroupPicker(false);
      if (paidByRef.current && !paidByRef.current.contains(e.target)) setShowPaidByPicker(false);
      if (splitRef.current && !splitRef.current.contains(e.target)) setShowSplitPicker(false);
      if (peopleRef.current && !peopleRef.current.contains(e.target)) setShowPeopleDropdown(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target)) setShowCategoryPicker(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const total = parseFloat(totalAmount) || 0;

  const pickGroup = async (g) => {
    setShowGroupPicker(false);
    if (!g) {
      setGroupId(null);
      setGroupName(null);
      setParticipants([me]);
      return;
    }
    setGroupId(g._id);
    setGroupName(g.name);
    try {
      const res = await api.get(`/groups/${g._id}`);
      setParticipants([me, ...res.data.members.filter((m) => m._id !== me.id).map((m) => ({ id: m._id, name: m.name }))]);
    } catch {
      // ignore - keep existing participants if fetch fails
    }
  };

  const addPerson = (person) => {
    if (participants.some((p) => p.id === person.id)) return;
    setParticipants([...participants, person]);
    setPeopleQuery('');
    setShowPeopleDropdown(false);
  };

  const removePerson = (id) => {
    if (id === me.id) return; // can't remove yourself
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const peopleSuggestions = friendsList
    .filter((f) => !participants.some((p) => p.id === f.id))
    .filter((f) => f.name.toLowerCase().includes(peopleQuery.toLowerCase()) || f.email?.toLowerCase().includes(peopleQuery.toLowerCase()));

  // Compute the live split preview + validation message per splitType
  const { splits, validationError } = useMemo(() => {
    if (splitType === 'equal') {
      const n = participants.length || 1;
      const share = Math.round((total / n) * 100) / 100;
      const s = participants.map((p, idx) => ({
        userId: p.id,
        amountOwed: idx === participants.length - 1 ? Math.round((total - share * (n - 1)) * 100) / 100 : share
      }));
      return { splits: s, validationError: null };
    }
    if (splitType === 'exact') {
      const s = participants.map((p) => ({ userId: p.id, amountOwed: parseFloat(exactValues[p.id]) || 0 }));
      const sum = Math.round(s.reduce((acc, x) => acc + x.amountOwed, 0) * 100) / 100;
      const err = Math.abs(sum - total) > 0.02 ? `Amounts add up to ${sum.toFixed(2)}, but total is ${total.toFixed(2)}` : null;
      return { splits: s, validationError: err };
    }
    if (splitType === 'percentage') {
      const s = participants.map((p) => {
        const pct = parseFloat(percentValues[p.id]) || 0;
        return { userId: p.id, amountOwed: Math.round(total * (pct / 100) * 100) / 100 };
      });
      const pctSum = Math.round(participants.reduce((acc, p) => acc + (parseFloat(percentValues[p.id]) || 0), 0) * 100) / 100;
      const err = Math.abs(pctSum - 100) > 0.02 ? `Percentages add up to ${pctSum}%, must equal 100%` : null;
      return { splits: s, validationError: err };
    }
    if (splitType === 'shares') {
      const totalShares = participants.reduce((acc, p) => acc + (parseInt(shareValues[p.id]) || 0), 0);
      const s = participants.map((p) => {
        const shares = parseInt(shareValues[p.id]) || 0;
        return { userId: p.id, amountOwed: totalShares > 0 ? Math.round(total * (shares / totalShares) * 100) / 100 : 0 };
      });
      const err = totalShares === 0 ? 'Enter at least one share' : null;
      return { splits: s, validationError: err };
    }
    return { splits: [], validationError: 'Unknown split type' };
  }, [splitType, participants, total, exactValues, percentValues, shareValues]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) return setError('Enter a description');
    if (!total || total <= 0) return setError('Enter a valid amount');
    if (participants.length < 2) return setError('Add at least one other person to split with');
    if (validationError) return setError(validationError);

    const payload = {
      groupId,
      description,
      category,
      totalAmount: total,
      currency,
      paidBy,
      splitType,
      splits,
      participants: participants.map((p) => p.id),
      date
    };

    setLoading(true);
    try {
      if (isEditMode) {
        await api.put(`/expenses/${expenseToEdit._id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save expense');
    } finally {
      setLoading(false);
    }
  };

  const perPersonEqual = participants.length ? (total / participants.length) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto text-gray-900">
      <div className="card w-full max-w-lg overflow-visible my-8">
        <div className="bg-mint-500 text-white rounded-t-2xl px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEditMode ? 'Edit expense' : 'Add an expense'}</h2>
          <button onClick={onClose} className="text-white/90 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* With you and: people picker */}
          <div ref={peopleRef} className="relative">
            <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-500 whitespace-nowrap">With <b className="text-gray-900">you</b> and:</span>
              {participants.filter((p) => p.id !== me.id).map((p) => (
                <span key={p.id} className="flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2 py-1 rounded-full">
                  {p.name}
                  <button type="button" onClick={() => removePerson(p.id)} className="text-brand-500 hover:text-brand-700">✕</button>
                </span>
              ))}
              <input
                value={peopleQuery}
                onChange={(e) => { setPeopleQuery(e.target.value); setShowPeopleDropdown(true); }}
                onFocus={() => setShowPeopleDropdown(true)}
                placeholder={participants.length <= 1 ? 'Enter names or email addresses' : ''}
                className="flex-1 min-w-[120px] text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
            </div>
            {showPeopleDropdown && peopleSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {peopleSuggestions.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => addPerson({ id: f.id, name: f.name })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-brand-50"
                  >
                    <Avatar name={f.name} color={f.avatarColor} size={24} />
                    <span className="text-sm text-gray-900">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description + amount */}
          <div className="flex items-center gap-3">
            <div ref={categoryRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className="w-11 h-11 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-lg"
                title="Choose a category"
              >
                {CATEGORY_ICONS[category] || '🧾'}
              </button>
              {showCategoryPicker && (
                <div className="absolute z-20 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => { setCategory(key); setShowCategoryPicker(false); }}
                      className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-brand-50 capitalize ${category === key ? 'font-semibold text-brand-700 bg-brand-50' : 'text-gray-900'}`}
                    >
                      <span>{icon}</span>
                      <span>{key}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description"
              className="flex-1 border-b border-gray-300 px-1 py-2 text-base text-gray-900 placeholder-gray-400 outline-none focus:border-brand-500"
            />
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-lg text-gray-500 bg-transparent outline-none w-14"
              >
                <option value="INR">₹</option>
                <option value="USD">$</option>
                <option value="EUR">€</option>
              </select>
              <input
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-28 border-b border-gray-300 text-2xl font-light text-gray-800 placeholder-gray-300 outline-none focus:border-brand-500 text-right"
              />
            </div>
          </div>

          {/* Paid by / split pills */}
          <div className="text-center text-sm text-gray-600 py-2">
            Paid by{' '}
            <span ref={paidByRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setShowPaidByPicker(!showPaidByPicker)}
                className="bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full hover:bg-brand-100"
              >
                {paidBy === user?.id ? 'you' : participants.find((p) => p.id === paidBy)?.name || 'someone'}
              </button>
              {showPaidByPicker && (
                <div className="absolute z-20 left-1/2 -translate-x-1/2 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {participants.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => { setPaidBy(p.id); setShowPaidByPicker(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-brand-50"
                    >
                      {p.id === me.id ? 'you' : p.name}
                    </button>
                  ))}
                </div>
              )}
            </span>
            {' '}and split{' '}
            <span ref={splitRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setShowSplitPicker(!showSplitPicker)}
                className="bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full hover:bg-brand-100"
              >
                {splitType === 'equal' ? 'equally' : splitType}
              </button>
              {showSplitPicker && (
                <div className="absolute z-20 left-1/2 -translate-x-1/2 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {['equal', 'exact', 'percentage', 'shares'].map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => { setSplitType(t); setShowSplitPicker(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-brand-50 capitalize"
                    >
                      {t === 'equal' ? 'equally' : t}
                    </button>
                  ))}
                </div>
              )}
            </span>
            .
            {splitType === 'equal' && (
              <p className="text-xs text-gray-400 mt-1">({CURRENCY_SYMBOLS[currency]}{perPersonEqual.toFixed(2)}/person)</p>
            )}
          </div>

          {/* Detailed per-person editor for non-equal splits */}
          {splitType !== 'equal' && (
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-gray-800">{p.id === me.id ? 'You' : p.name}</span>
                  {splitType === 'exact' && (
                    <input
                      type="number" step="0.01"
                      value={exactValues[p.id] || ''}
                      onChange={(e) => setExactValues({ ...exactValues, [p.id]: e.target.value })}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 bg-white"
                      placeholder="0.00"
                    />
                  )}
                  {splitType === 'percentage' && (
                    <input
                      type="number" step="0.01"
                      value={percentValues[p.id] || ''}
                      onChange={(e) => setPercentValues({ ...percentValues, [p.id]: e.target.value })}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 bg-white"
                      placeholder="%"
                    />
                  )}
                  {splitType === 'shares' && (
                    <input
                      type="number"
                      value={shareValues[p.id] || ''}
                      onChange={(e) => setShareValues({ ...shareValues, [p.id]: e.target.value })}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 bg-white"
                      placeholder="shares"
                    />
                  )}
                </div>
              ))}
              {validationError && <p className="text-coral-600 text-xs">{validationError}</p>}
            </div>
          )}

          {/* Date + notes row */}
          <div className="flex gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 rounded-full px-4 py-1.5 text-sm text-gray-700 bg-white"
            />
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="border border-gray-300 rounded-full px-4 py-1.5 text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Add notes
            </button>
          </div>
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400"
            />
          )}

          {/* Group picker */}
          <div ref={groupPickerRef} className="relative">
            <button
              type="button"
              onClick={() => setShowGroupPicker(!showGroupPicker)}
              className="border border-gray-300 rounded-full px-4 py-1.5 text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              {groupName || 'No group'}
            </button>
            {showGroupPicker && (
              <div className="absolute z-20 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => pickGroup(null)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 ${!groupId ? 'font-semibold text-brand-700 bg-brand-50' : 'text-gray-900'}`}
                >
                  Non-group expenses
                </button>
                {groupsList.map((g) => (
                  <button
                    type="button"
                    key={g._id}
                    onClick={() => pickGroup(g)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 ${groupId === g._id ? 'font-semibold text-brand-700 bg-brand-50' : 'text-gray-900'}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-coral-600 text-xs">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="btn-secondary text-sm">
              {loading ? 'Saving…' : isEditMode ? 'Save changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
