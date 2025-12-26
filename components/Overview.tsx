
import React from 'react';
import { useAuth } from '../App';
import { AcademicItem, Subject } from '../types';
import { Calendar, Clock, BookOpen, AlertCircle, FileText, ChevronRight, Activity } from 'lucide-react';
import { SUBJECT_ICONS } from '../constants';

interface Props {
  items: AcademicItem[];
  subjects: Subject[];
  onSubjectClick: (id: string) => void;
}

const Overview: React.FC<Props> = ({ items, subjects, onSubjectClick }) => {
  const { lang, t, onlineUserIds } = useAuth();
  const upcoming = items
    .filter(i => new Date(i.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <section className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">{t('welcome')}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Status: Active</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <Activity size={10} className="animate-pulse" /> {onlineUserIds.size} student{onlineUserIds.size !== 1 ? 's' : ''} in hub
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-4 gap-2">
        {[
          { id: 'exam', icon: <AlertCircle size={14}/>, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Exams', count: items.filter(i => i.type === 'exam').length },
          { id: 'homework', icon: <FileText size={14}/>, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'HW', count: items.filter(i => i.type === 'homework').length },
          { id: 'subjects', icon: <BookOpen size={14}/>, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Subs', count: subjects.length },
          { id: 'active', icon: <Activity size={14}/>, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Active', count: onlineUserIds.size }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className={`w-7 h-7 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-1`}>
              {stat.icon}
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{stat.label}</p>
            <p className="text-base font-black text-slate-900 leading-tight mt-0.5">{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-12 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Curriculum Shortcut</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {subjects.slice(0, 10).map((subject) => (
              <button 
                key={subject.id}
                onClick={() => onSubjectClick(subject.id)}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:border-indigo-400 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${subject.color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(SUBJECT_ICONS[subject.id] as React.ReactElement<any>, { size: 18 })}
                </div>
                <span className="text-[9px] font-black text-slate-900 uppercase truncate w-full text-center">{subject.name[lang]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-12 space-y-2 mt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Upcoming Priority</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.length > 0 ? (
              upcoming.map((item) => {
                const subj = subjects.find(s => s.id === item.subjectId);
                return (
                  <button 
                    key={item.id} 
                    onClick={() => onSubjectClick(item.subjectId)}
                    className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:bg-slate-50 text-left w-full"
                  >
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm ${subj?.color || 'bg-slate-400'}`}>
                      {React.cloneElement(SUBJECT_ICONS[item.subjectId] as React.ReactElement<any>, { size: 22 })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          item.type === 'exam' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{subj?.name[lang]}</span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 truncate leading-tight">{item.title}</h3>
                    </div>
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                );
              })
            ) : (
              <div className="col-span-full p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">All clear</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
