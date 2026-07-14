import React, { useState } from 'react';
import api from '../api/axios';
import { formatMoney } from '../utils/helpers';

export default function ExpenseDetailModal({ expense, onClose, onEdit, onDeleted }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!expense) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/expenses/${expense._id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete expense');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-gray-900">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-1">{expense.description}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {new Date(expense.date).toLocaleDateString()} · {formatMoney(expense.totalAmount, expense.currency)} total
          {expense.groupId?.name && <> · in {expense.groupId.name}</>}
        </p>
        <p className="text-sm mb-2"><b>Paid by:</b> {expense.paidBy?.name || 'Unknown'}</p>
        <div className="space-y-1">
          {expense.splits?.map((s, i) => (
            <div key={i} className="flex justify-between text-sm border-b border-gray-100 py-1.5">
              <span>{s.userId?.name || 'Unknown'}</span>
              <span className="font-medium">{formatMoney(s.amountOwed, expense.currency)}</span>
            </div>
          ))}
        </div>
        {expense.notes && <p className="text-xs text-gray-500 mt-3">Notes: {expense.notes}</p>}

        {error && <p className="text-coral-600 text-xs mt-3">{error}</p>}

        {!confirmDelete ? (
          <div className="flex items-center justify-between pt-5">
            <div className="flex gap-2">
              <button onClick={() => onEdit(expense)} className="text-sm text-brand-600 font-medium hover:underline">✏️ Edit</button>
              <button onClick={() => setConfirmDelete(true)} className="text-sm text-coral-600 font-medium hover:underline">🗑️ Delete</button>
            </div>
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100">Close</button>
          </div>
        ) : (
          <div className="pt-5 border-t border-gray-100 mt-3">
            <p className="text-sm text-gray-700 mb-2">Delete this expense for everyone? This can't be undone.</p>
            <div className="flex gap-2">
              <button disabled={deleting} onClick={handleDelete} className="text-xs bg-coral-500 hover:bg-coral-600 text-white rounded-lg px-3 py-1.5">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 px-3 py-1.5">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
