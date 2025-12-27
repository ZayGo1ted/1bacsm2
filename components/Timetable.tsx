import React, { useState } from 'react';
import { useAuth } from '../App';
import { TimetableEntry, Subject, AppState } from '../types';
import { Plus, Trash2, Edit2, Clock, MapPin, X, Save, Palette } from 'lucide-react';

interface Props {
  entries: TimetableEntry[];
  subjects: Subject[];
  onUpdate: (updates: Partial<AppState>) => void;
}

const Timetable: React.FC<Props> = ({ entries, subjects, onUpdate }) => {
  const { t, lang, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<TimetableEntry>>({
    day: 1,
    startHour: 8,
    endHour: 10,
    subjectId: subjects[0]?.id || '',
    color: 'bg-indigo-600',
    room: ''
  });

  const days = [1, 2, 3, 4, 5, 6]; // Mon-Sat
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 to 18 (11 hours)

  const handleAdd = () => {
    if (newEntry.startHour! >= newEntry.endHour!) {
      alert("Start hour must be before end hour.");
      return;
    }
    const entry: TimetableEntry = {
      id: Math.random().toString(36).substr(2, 9),
      day: newEntry.day!,
      startHour: newEntry.startHour!,
      endHour: newEntry.endHour!,
      subjectId: newEntry.subjectId!,
      color: newEntry.color!,
      room: newEntry.room || ''
    };
    onUpdate({ timetable: [...entries, entry] });
    setIsEditing(false);
  };

  const removeEntry = (id: string) => {
    onUpdate({ timetable: entries.filter(e => e.id !== id) });
  };

  const currentDayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...

  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full max-h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-end shrink-0 px-1">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('timetable')}</h1>
          <p className="text-slate-500 font-bold text-sm">1Bac SM - Science Math Weekly Schedule</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`px-6 py-3 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2 ${
              isEditing ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isEditing ? <X size={20} /> : <Edit2 size={20} />}
            <span className="hidden sm:inline">{isEditing ? t('cancel') : 'Edit Schedule'}</span>
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-indigo-50 shadow-2xl space-y-4 shrink-0 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Day</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 font-bold text-sm" value={newEntry.day} onChange={e => setNewEntry({...newEntry, day: parseInt(e.target.value)})}>
                {dayNames.map((d, i) => <option key={d} value={i+1}>{t(d)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Subject</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 font-bold text-sm" value={newEntry.subjectId} onChange={e => setNewEntry({...newEntry, subjectId: e.target.value})}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name[lang] || s.name['en']}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Start (8-17)</label>
              <input type="number" min="8" max="17" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 font-bold text-sm" value={newEntry.startHour} onChange={e => setNewEntry({...newEntry, startHour: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">End (9-18)</label>
              <input type="number" min="9" max="18" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 font-bold text-sm" value={newEntry.endHour} onChange={e => setNewEntry({...newEntry, endHour: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Color</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 font-bold text-sm" value={newEntry.color} onChange={e => setNewEntry({...newEntry, color: e.target.value})}>
                <option value="bg-indigo-600">Indigo</option>
                <option value="bg-blue-600">Blue</option>
                <option value="bg-rose-600">Rose</option>
                <option value="bg-emerald-600">Emerald</option>
                <option value="bg-amber-600">Amber</option>
                <option value="bg-purple-600">Purple</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleAdd} className="w-full bg-indigo-600 text-white py-2 rounded-xl font-black hover:bg-indigo-700 shadow-lg transition-all active:scale-95">
                <Plus size={20} className="mx-auto" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto hide-scrollbar">
          <div className="min-w-[1200px] h-full flex flex-col">
            <div className="grid grid-cols-[100px_repeat(11,1fr)] bg-slate-900 sticky top-0 z-20 backdrop-blur-md">
              <div className="p-4 flex items-center justify-center font-black text-slate-500 text-[10px] tracking-widest border-r border-white/5">TIME</div>
              {hours.map(h => (
                <div key={h} className="p-4 text-center border-r border-white/5 last:border-0 font-black text-white/40 text-[10px] tracking-widest">
                  {h}:00
                </div>
              ))}
            </div>

            <div className="flex-1 flex flex-col bg-slate-50/30">
              {days.map(day => {
                const isToday = day === (currentDayIndex === 0 ? 7 : currentDayIndex);
                return (
                  <div key={day} className={`grid grid-cols-[100px_repeat(11,1fr)] flex-1 min-h-[90px] border-b border-slate-100 last:border-0 relative ${isToday ? 'bg-indigo-50/40' : ''}`}>
                    <div className={`flex items-center justify-center font-black text-[11px] border-r border-slate-100 sticky left-0 z-10 backdrop-blur-sm uppercase tracking-tighter ${isToday ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                      {t(dayNames[day-1]).substring(0, 3)}
                    </div>
                    
                    {hours.map(h => {
                      const entry = entries.find(e => e.day === day && e.startHour === h);
                      if (entry) {
                        const duration = entry.endHour - entry.startHour;
                        const subj = subjects.find(s => s.id === entry.subjectId);
                        return (
                          <div 
                            key={h} 
                            className={`relative ${entry.color} m-1.5 p-4 rounded-[1.25rem] text-white shadow-xl overflow-hidden group/entry transition-all hover:scale-[1.02] hover:z-20 flex flex-col justify-between`}
                            style={{ 
                              gridColumnStart: h - 8 + 2, 
                              gridColumnEnd: `span ${duration}` 
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <p className="font-black text-sm leading-tight drop-shadow-md">{subj?.name[lang] || entry.subjectId}</p>
                              {isEditing && (
                                <button onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }} className="bg-white/20 hover:bg-white/40 p-1 rounded-lg transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black opacity-80 mt-2">
                              <span className="flex items-center gap-1.5"><MapPin size={10} className="text-white/60"/> {entry.room || 'Room A2'}</span>
                              <span className="bg-black/20 px-2 py-0.5 rounded-lg">{entry.startHour}:00 - {entry.endHour}:00</span>
                            </div>
                          </div>
                        );
                      }
                      return <div key={h} className="border-r border-slate-100/40 group hover:bg-white/50 transition-colors"></div>;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timetable;
