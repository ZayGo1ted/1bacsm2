
import React from 'react';
import { useAuth } from '../App';
import { AcademicItem, Subject } from '../types';
import { Calendar, Clock, BookOpen, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { SUBJECT_ICONS } from '../constants';

interface Props {
  items: AcademicItem[];
  subjects: Subject[];
}

const Overview: React.FC<Props> = ({ items, subjects }) => {
  const { lang, t } = useAuth();
  const upcoming = items
    .filter(i => new Date(i.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{t('welcome')}</h1>
        <p className="text-slate-500">Here's what's happening in the classroom.</p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <AlertCircle />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Exams</p>
            <p className="text-2xl font-black text-slate-900">{items.filter(i => i.type === 'exam').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
            <FileText />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Homeworks</p>
            <p className="text-2xl font-black text-slate-900">{items.filter(i => i.type === 'homework').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <BookOpen />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subjects</p>
            <p className="text-2xl font-black text-slate-900">{subjects.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Academic Tasks</h2>
          </div>
          <div className="space-y-4">
            {upcoming.length > 0 ? (
              upcoming.map((item) => {
                const subj = subjects.find(s => s.id === item.subjectId);
                return (
                  <div key={item.id} className="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4">
                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg ${subj?.color || 'bg-slate-400'}`}>
                      {SUBJECT_ICONS[item.subjectId] || <BookOpen />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.type === 'exam' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-sm font-bold text-slate-400">{subj?.name[lang]}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">{item.title}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 md:px-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Calendar size={16} />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                      {item.time && (
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Clock size={16} />
                          {item.time}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Calendar className="mx-auto w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No upcoming tasks found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Your Subjects</h2>
          <div className="grid grid-cols-1 gap-4">
            {subjects.map(subject => (
              <div key={subject.id} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors cursor-pointer group shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${subject.color}`}>
                  {SUBJECT_ICONS[subject.id]}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-black text-slate-900 truncate">{subject.name[lang]}</p>
                  {/* Cleaned up: Removed the small description for a more modern look */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
