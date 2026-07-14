import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      <div className="w-[20%] min-w-[220px] max-w-[280px] h-full">
        <Sidebar />
      </div>
      <div className="flex-1 h-full overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
