'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function MainLayout({ children }: { children?: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      {/* Hero Section */}
      <div className="relative h-[400px] bg-gradient-to-r from-black via-zinc-900 to-black overflow-hidden">
        <Image
          src="/hero-construction.png"
          alt="Road Construction"
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="flex-1">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-4">Work Zone OS</h1>
            <p className="text-xl mb-6 max-w-2xl text-gray-200">
              The Operating System For Road Crews. Unified platform to manage work orders, equipment, training, and team performance.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('workorders')}
                className="bg-amber-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-amber-400 
                           transition-all hover:shadow-[0_0_20px_rgba(255,179,0,0.5)]"
              >
                View Work Orders
              </button>
              <button className="bg-white/10 backdrop-blur-sm border border-amber-500/30 text-white px-6 py-3 
                                 rounded-lg font-semibold hover:bg-white/20 transition-all">
                Create New Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-black/40 backdrop-blur-md border-b border-amber-500/20 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {['overview', 'workorders', 'equipment', 'team', 'training'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-gray-400 hover:text-amber-300'
                }`}
              >
                {tab === 'workorders' ? 'Work Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
