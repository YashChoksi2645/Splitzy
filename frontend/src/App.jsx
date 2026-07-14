import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import FriendPage from './pages/FriendPage';
import ActivityPage from './pages/ActivityPage';
import AllExpensesPage from './pages/AllExpensesPage';
import AccountPage from './pages/AccountPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups/:id" element={<GroupPage />} />
        <Route path="/friends/:id" element={<FriendPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/all-expenses" element={<AllExpensesPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
