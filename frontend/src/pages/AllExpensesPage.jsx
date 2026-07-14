import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import AddExpenseModal from '../components/AddExpenseModal';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/helpers';

export default function AllExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const load = () => {
    api.get('/users/all-expenses').then((res) => setExpenses(res.data));
    api.get('/users/dashboard-summary').then((res) => setSummary(res.data));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">All expenses</h1>
        <div className="card">
          {expenses.length === 0 && <p className="p-6 text-sm text-gray-400">No expenses yet.</p>}
          {expenses.map((exp) => (
            <ExpenseCard key={exp._id} expense={exp} onClick={() => setSelectedExpense(exp)} showGroupBadge />
          ))}
        </div>
      </div>
      <div className="w-[320px] shrink-0 border-l border-gray-100 p-6 bg-white">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Your total balance</h3>
        {summary?.currencyBreakdown.length === 0 && (
          <p className="text-sm text-gray-400">All settled up 🎉</p>
        )}
        {summary?.currencyBreakdown.map((cb) => (
          <div key={cb.currency} className="mb-5">
            <p className="text-xs text-gray-400 mb-1">you are owed ({cb.currency})</p>
            <p className="text-lg font-bold text-mint-600 mb-2">{formatMoney(cb.youAreOwedTotal, cb.currency)}</p>
            <p className="text-xs text-gray-400 mb-1">you owe ({cb.currency})</p>
            <p className="text-lg font-bold text-coral-600">{formatMoney(cb.youOweTotal, cb.currency)}</p>
          </div>
        ))}
      </div>
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
