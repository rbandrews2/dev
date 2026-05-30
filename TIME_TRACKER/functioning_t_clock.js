import React, { useState } from 'react';
import { Clock, CalendarDays, MapPin, Play, Square, Coffee, ChevronLeft, ChevronRight, Calendar, Flag, Settings, Truck, Navigation, MoreHorizontal, Plus, MoreVertical, Building2, TrendingUp } from 'lucide-react';

export default function RoadCrewDemo() {
  const [currentView, setCurrentView] = useState('clock'); // 'clock', 'timesheet', 'sites'
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [selectedSite, setSelectedSite] = useState('');
  const [workType, setWorkType] = useState('flagging');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  React.useEffect(() => {
    if (isClockedIn && !isOnBreak) {
      const interval = setInterval(() => {
        const now = new Date();
        const hours = String(now.getHours() % 3).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isClockedIn, isOnBreak]);

  const workTypes = [
    { id: 'flagging', label: 'Flagging', icon: Flag, color: 'orange' },
    { id: 'setup', label: 'Setup', icon: Settings, color: 'blue' },
    { id: 'teardown', label: 'Teardown', icon: Truck, color: 'purple' },
    { id: 'travel', label: 'Travel', icon: Navigation, color: 'green' },
    { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'slate' },
  ];

  const jobSites = [
    { id: '1', name: 'Highway 101 Mile Marker 45', client: 'VDOT', address: 'Roanoke, VA', status: 'active' },
    { id: '2', name: 'I-81 Construction Zone', client: 'State Highway', address: 'Exit 143', status: 'active' },
    { id: '3', name: 'Route 220 Repaving', client: 'County Roads', address: 'Salem, VA', status: 'on_hold' },
  ];

  const timeEntries = [
    { id: 1, site: 'Highway 101 Mile Marker 45', type: 'flagging', clockIn: '8:00 AM', clockOut: '4:30 PM', hours: '7h 30m', breakMin: 30 },
    { id: 2, site: 'I-81 Construction Zone', type: 'setup', clockIn: '7:30 AM', clockOut: '3:00 PM', hours: '7h 15m', breakMin: 15 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Main Content Area */}
      <div className="pb-24 px-4 py-8">
        <div className="max-w-md mx-auto">
          
          {/* TIME CLOCK VIEW */}
          {currentView === 'clock' && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Road Crew Time Clock</h1>
                <p className="text-slate-400 mt-1">Friday, January 16, 2026</p>
              </div>

              {/* Active Timer */}
              {isClockedIn && (
                <div className="bg-slate-800/60 backdrop-blur rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Time Today</span>
                    </div>
                    {isOnBreak && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full">
                        <Coffee className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-400 font-medium">On Break</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <div className="text-5xl font-bold text-white font-mono tracking-wider">
                      {elapsedTime}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-400 justify-center pt-2 border-t border-slate-700/50">
                    <MapPin className="w-4 h-4 text-orange-400" />
                    <span className="text-sm">{jobSites[0].name}</span>
                  </div>
                </div>
              )}

              {/* Job Site & Work Type Selectors (only when not clocked in) */}
              {!isClockedIn && (
                <>
                  <div className="space-y-3">
                    <label className="text-sm text-slate-400 font-medium px-1">Job Site</label>
                    <select 
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full h-14 bg-slate-800/80 border border-slate-700 rounded-2xl text-white text-lg px-4"
                    >
                      <option value="">Select job site</option>
                      {jobSites.filter(s => s.status === 'active').map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm text-slate-400 font-medium px-1">Work Type</label>
                    <div className="grid grid-cols-5 gap-2">
                      {workTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = workType === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setWorkType(type.id)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                              isSelected 
                                ? `bg-${type.color}-500/20 border-${type.color}-500 text-${type.color}-400`
                                : 'bg-slate-800/50 border-slate-700 text-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Clock Button */}
              <div className="flex flex-col items-center gap-4 pt-4">
                {!isClockedIn ? (
                  <button
                    onClick={() => setIsClockedIn(true)}
                    className="w-44 h-44 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_8px_32px_rgba(16,185,129,0.4)] active:scale-95 transition-transform"
                  >
                    <Play className="w-14 h-14 text-white fill-white ml-2" />
                    <span className="text-white font-semibold text-lg mt-2">CLOCK IN</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsClockedIn(false)}
                      className="w-44 h-44 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-red-500 to-red-600 shadow-[0_8px_32px_rgba(239,68,68,0.4)] active:scale-95 transition-transform"
                    >
                      <Square className="w-12 h-12 text-white fill-white" />
                      <span className="text-white font-semibold text-lg mt-2">CLOCK OUT</span>
                    </button>
                    
                    <button
                      onClick={() => setIsOnBreak(!isOnBreak)}
                      className={`px-8 py-4 rounded-2xl flex items-center gap-3 active:scale-95 transition-all ${
                        isOnBreak 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_4px_16px_rgba(245,158,11,0.4)]'
                          : 'bg-slate-700 shadow-lg'
                      }`}
                    >
                      <Coffee className={`w-6 h-6 ${isOnBreak ? 'text-white' : 'text-amber-400'}`} />
                      <span className="text-white font-medium">
                        {isOnBreak ? 'END BREAK' : 'START BREAK'}
                      </span>
                    </button>
                  </>
                )}
              </div>

              {!isClockedIn && (
                <p className="text-center text-xs text-slate-500">
                  📍 Location tracking enabled
                </p>
              )}
            </div>
          )}

          {/* TIMESHEET VIEW */}
          {currentView === 'timesheet' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Timesheet</h1>
                <p className="text-slate-400 mt-1">View your work history</p>
              </div>

              {/* Weekly Summary */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-3xl p-6">
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">This Week</span>
                  <span className="text-xs text-slate-500">(Jan 13 - Jan 19)</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-700/30 rounded-2xl">
                    <Clock className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">38h 45m</p>
                    <p className="text-xs text-slate-400 mt-1">Total Hours</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-2xl">
                    <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">5</p>
                    <p className="text-xs text-slate-400 mt-1">Days Worked</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-2xl">
                    <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">7.8h</p>
                    <p className="text-xs text-slate-400 mt-1">Avg/Day</p>
                  </div>
                </div>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center justify-between bg-slate-800/60 backdrop-blur rounded-2xl p-4">
                <button className="text-slate-400 hover:text-white p-2">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">Friday</p>
                  <p className="text-sm text-slate-400">January 16, 2026</p>
                </div>
                <button className="text-slate-400 p-2 opacity-30">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Time Entries */}
              <div className="space-y-4">
                {timeEntries.map(entry => (
                  <div key={entry.id} className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/20">
                          <Flag className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{entry.site}</h3>
                          <p className="text-sm text-slate-400 capitalize">{entry.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-white">{entry.hours}</span>
                        <p className="text-xs text-slate-500">Net time</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400 pt-2 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{entry.clockIn} - {entry.clockOut}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Coffee className="w-4 h-4 text-amber-400" />
                        <span>{entry.breakMin} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JOB SITES VIEW */}
          {currentView === 'sites' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Job Sites</h1>
                  <p className="text-slate-400 mt-1">Manage your work locations</p>
                </div>
                <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Site
                </button>
              </div>

              {/* Active Sites */}
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-slate-400 px-1">Active Sites</h2>
                {jobSites.filter(s => s.status === 'active').map(site => (
                  <div key={site.id} className="bg-slate-800/60 backdrop-blur rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/20">
                          <MapPin className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{site.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{site.client}</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{site.address}</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-white p-2">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inactive Sites */}
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-slate-400 px-1">On Hold / Completed</h2>
                {jobSites.filter(s => s.status === 'on_hold').map(site => (
                  <div key={site.id} className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-600/30">
                          <MapPin className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{site.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{site.client}</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{site.address}</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-white p-2">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setCurrentView('clock')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              currentView === 'clock' ? 'text-orange-400' : 'text-slate-500'
            }`}
          >
            <Clock className={`w-6 h-6 ${currentView === 'clock' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Clock</span>
          </button>
          
          <button
            onClick={() => setCurrentView('timesheet')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              currentView === 'timesheet' ? 'text-orange-400' : 'text-slate-500'
            }`}
          >
            <CalendarDays className={`w-6 h-6 ${currentView === 'timesheet' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Timesheet</span>
          </button>
          
          <button
            onClick={() => setCurrentView('sites')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              currentView === 'sites' ? 'text-orange-400' : 'text-slate-500'
            }`}
          >
            <MapPin className={`w-6 h-6 ${currentView === 'sites' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Sites</span>
          </button>
        </div>
      </nav>
    </div>
  );
}