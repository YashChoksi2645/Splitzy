import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';
import GroupSettingsModal from '../components/GroupSettingsModal';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/helpers';

export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    api.get(`/groups/${id}`).then((res) => setGroup(res.data)).catch((err) => {
      setLoadError(err.response?.data?.message || 'Could not load this group');
    });
    api.get(`/groups/${id}/expenses`).then((res) => setExpenses(res.data)).catch(() => {});
    api.get(`/groups/${id}/balances`).then((res) => setBalances(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  if (loadError) return <div className="p-8 text-coral-600">{loadError}</div>;
  if (!group) return <div className="p-8 text-gray-400">Loading group…</div>;

  const namesById = Object.fromEntries((group.members || []).map((m) => [m._id, m.name]));
  namesById[user?.id] = 'You';

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-800">{group.name}</h1>
              <button
                onClick={() => setShowSettings(true)}
                title="Group settings"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
              >
                ⚙️
              </button>
            </div>
            <p className="text-sm text-gray-400">{group.members?.length} people · {group.groupType}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddExpense(true)} className="btn-primary">Add an expense</button>
            <button onClick={() => setShowSettleUp(true)} className="btn-secondary">
              Settle up
            </button>
          </div>
        </div>

        {balances?.multipleCurrencies && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 text-xs rounded-lg px-3 py-2 mb-4">
            This group has balances in multiple currencies — shown separately, never combined.
          </div>
        )}

        <div className="card">
          {expenses.length === 0 && <p className="p-6 text-sm text-gray-400">No expenses yet — add the first one!</p>}
          {expenses.map((exp) => (
            <ExpenseCard key={exp._id} expense={exp} onClick={() => setSelectedExpense(exp)} />
          ))}
        </div>
      </div>

      <div className="w-[320px] shrink-0 border-l border-gray-100 p-6 bg-white overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Group balances</h3>
        <div className="space-y-4">
          {balances?.balances.map((b) => (
            <div key={b.id} className="flex items-center gap-3">
              <Avatar name={b.name} color={b.avatarColor} size={32} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{String(b.id) === String(user?.id) ? 'You' : b.name}</p>
                {Object.keys(b.balances).length === 0 && <p className="text-xs text-gray-400">settled up</p>}
                {Object.entries(b.balances).map(([currency, amount]) => (
                  <p key={currency} className={`text-xs ${amount > 0 ? 'text-mint-600' : amount < 0 ? 'text-coral-600' : 'text-gray-400'}`}>
                    {amount === 0 && `settled up (${currency})`}
                    {amount > 0 && `gets back ${formatMoney(amount, currency)}`}
                    {amount < 0 && `owes ${formatMoney(amount, currency)}`}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddExpense && (
        <AddExpenseModal
          groupId={id}
          members={(group.members || []).map((m) => ({ id: m._id, name: m.name }))}
          currency={user?.defaultCurrency || 'INR'}
          onClose={() => setShowAddExpense(false)}
          onCreated={() => { setShowAddExpense(false); load(); }}
        />
      )}
      {showSettleUp && (
        <SettleUpModal
          groupId={id}
          byCurrency={balances?.byCurrency || []}
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
      {showSettings && (
        <GroupSettingsModal
          group={group}
          onClose={() => setShowSettings(false)}
          onUpdated={(updatedGroup) => { setGroup(updatedGroup); load(); }}
          onLeft={() => navigate('/dashboard')}
        />
      )}
    </div>
  );
}
