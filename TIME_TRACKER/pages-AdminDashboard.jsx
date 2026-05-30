import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function AdminDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch ALL entries (admin only)
  const { data: allEntries } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-clock_in'),
    enabled: user?.role === 'admin',  // ← Only fetch if admin
  });

  // Redirect non-admins
  if (user && user.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">Access Denied: Admin Only</p>
      </div>
    );
  }

  // Group entries by user
  const entriesByUser = allEntries?.reduce((acc, entry) => {
    const email = entry.created_by;
    if (!acc[email]) acc[email] = [];
    acc[email].push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        Admin Dashboard - All Team Members
      </h1>

      {Object.entries(entriesByUser || {}).map(([email, entries]) => (
        <div key={email} className="bg-slate-800 rounded-xl p-4 mb-4">
          <h2 className="text-white font-semibold mb-2">{email}</h2>
          <p className="text-slate-400">
            Total entries this week: {entries.length}
          </p>
          {/* Show entries... */}
        </div>
      ))}
    </div>
  );
}