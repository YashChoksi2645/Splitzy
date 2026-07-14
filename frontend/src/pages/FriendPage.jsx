import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/helpers';

export default function FriendPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    api.get(`/friends/${id}`).then((res) => setDetail(res.data)).catch((err) => {
      setLoadError(err.response?.data?.message || 'Could not load this friend');
    });
    api.get(`/expenses/direct/${id}`).then((res) => setExpenses(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  if (loadError) return <div className="p-8 text-coral-600">{loadError}</div>;
  if (!detail) return <div className="p-8 text-gray-400">Loading…</div>;

  const namesById = { [id]: detail.friend.name, [user?.id]: 'You' };
  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar name={detail.friend.name} color={detail.friend.avatarColor} size={44} />
            <div>
              <h1 className="text-xl font-bold text-gray-800">{detail.friend.name}</h1>
              {detail.byCurrency.length === 0 && <p className="text-sm text-gray-400">You are all settled up</p>}
              {detail.byCurrency.map((cb) => (
                <p key={cb.currency} className={`text-sm ${cb.netBalance >= 0 ? 'text-mint-600' : 'text-coral-600'}`}>
                  {cb.netBalance === 0 && `settled up in ${cb.currency}`}
                  {cb.netBalance > 0 && `owes you ${formatMoney(cb.netBalance, cb.currency)}`}
                  {cb.netBalance < 0 && `you owe ${formatMoney(cb.netBalance, cb.currency)}`}
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddExpense(true)} className="btn-primary">Add an expense</button>
            <button onClick={() => setShowSettleUp(true)} className="btn-secondary">
              Settle up
            </button>
          </div>
        </div>

        <div className="card">
          {expenses.length === 0 && <p className="p-6 text-sm text-gray-400">No shared expenses yet.</p>}
          {expenses.map((exp) => (
            <ExpenseCard key={exp._id} expense={exp} onClick={() => setSelectedExpense(exp)} showGroupBadge />
          ))}
        </div>
      </div>

      <div className="w-[320px] shrink-0 border-l border-gray-100 p-6 bg-white">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Settle up</h3>
        {detail.byCurrency.length === 0 && <p className="text-sm text-gray-400">Nothing to settle 🎉</p>}
        {detail.byCurrency.map((cb) => (
          <div key={cb.currency} className="mb-4">
            <p className="text-xs text-gray-400 font-semibold mb-1">{cb.currency}</p>
            {cb.settleUpSuggestions.length === 0 && <p className="text-xs text-gray-400">Settled up</p>}
            {cb.settleUpSuggestions.map((s, i) => (
              <div key={i} className="card p-3 mb-2 text-sm text-gray-900">
                <b>{namesById[s.from] || 'Someone'}</b> owes <b>{namesById[s.to] || 'Someone'}</b> {formatMoney(s.amount, cb.currency)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {showAddExpense && (
        <AddExpenseModal
          members={[{ id: user.id, name: 'You' }, { id: detail.friend._id, name: detail.friend.name }]}
          currency={user?.defaultCurrency || 'INR'}
          onClose={() => setShowAddExpense(false)}
          onCreated={() => { setShowAddExpense(false); load(); }}
        />
      )}
      {showSettleUp && (
        <SettleUpModal
          byCurrency={detail.byCurrency.map((cb) => ({ currency: cb.currency, simplifiedSettlements: cb.settleUpSuggestions }))}
          namesById={namesById}
          onClose={() => setShowSettleUp(false)}
          onSettled={() => { setShowSettleUp(false); load(); }}
        />
      )}
      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onEdit={(exp) => { setSelectedExpense(null); setEditingExpense(exp); }}
          onDeleted={() => { setSelectedExpense(null); load(); }}
        />
      )}
      {editingExpense && (
        <AddExpenseModal
          expenseToEdit={editingExpense}
          currency={user?.defaultCurrency || 'INR'}
          onClose={() => setEditingExpense(null)}
          onCreated={() => { setEditingExpense(null); load(); }}
        />
      )}
    </div>
  );
}
