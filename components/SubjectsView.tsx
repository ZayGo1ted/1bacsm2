
import React, { useState } from 'react';
import { useAuth } from '../App';
import { AcademicItem, Subject, AppState } from '../types';
import { SUBJECT_ICONS } from '../constants';
import { FileText, Video, Link as LinkIcon, BookOpen, ChevronRight, File, MoreHorizontal } from 'lucide-react';

interface Props {
  items: AcademicItem[];
  subjects: Subject[];
  onUpdate: (updates: Partial<AppState>) => void;
}

const SubjectsView: React.FC<Props> = ({ items, subjects }) => {
  const { lang } = useAuth();
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);

  if (activeSubject) {
    const subjectItems = items.filter(i => i.subjectId === activeSubject.id);
    const exams = subjectItems.filter(i => i.type === 'exam');
    const homework = subjectItems.filter(i => i.type === 'homework');

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
        <button onClick={() => setActiveSubject(null)} className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline">
          &larr; Back to all subjects
        </button>

        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl ${activeSubject.color}`}>
            {SUBJECT_ICONS[activeSubject.id] || <BookOpen size={32} />}
          </div>
          <div>
            {/* Fix: name and description are translation Records, accessing by current lang */}
            <h1 className="text-3xl font-black text-slate-900">{activeSubject.name[lang]}</h1>
            <p className="text-slate-500">{activeSubject.description[lang]}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Exams Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-red-500 rounded-full"></span>
              Exams
            </h2>
            <div className="space-y-4">
              {exams.length > 0 ? exams.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-500">{new Date(item.date).toLocaleDateString()} at {item.time || 'TBD'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">{item.notes}</p>
                  
                  {item.resources.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Resources</p>
                      <div className="grid grid-cols-1 gap-2">
                        {item.resources.map(res => (
                          <a key={res.id} href={res.url} className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                            {res.type === 'pdf' ? <FileText size={18} /> : res.type === 'video' ? <Video size={18} /> : <LinkIcon size={18} />}
                            <span className="text-sm font-semibold">{res.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )) : <p className="text-slate-400 text-sm py-4 italic">No exams scheduled.</p>}
            </div>
          </section>

          {/* Homework Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Homework & Exercises
            </h2>
            <div className="space-y-4">
              {homework.length > 0 ? homework.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex justify-between mb-3">
                     <h3 className="font-bold text-slate-900">{item.title}</h3>
                     <span className="text-xs font-bold text-blue-600">Due: {new Date(item.date).toLocaleDateString()}</span>
                  </div>
                  {item.notes && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{item.notes}</p>}
                  <button className="w-full py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all">
                    View Task Details
                  </button>
                </div>
              )) : <p className="text-slate-400 text-sm py-4 italic">No pending homework.</p>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h1 className="text-3xl font-black text-slate-900">Explore Subjects</h1>
        <p className="text-slate-500">Select a subject to view resources, homework and exams.</p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map(subject => (
          <div 
            key={subject.id} 
            onClick={() => setActiveSubject(subject)}
            className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-2 h-full ${subject.color}`}></div>
            <div className="flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${subject.color}`}>
                {SUBJECT_ICONS[subject.id] || <BookOpen size={24} />}
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-200 group-hover:text-indigo-100 transition-colors">
                  {items.filter(i => i.subjectId === subject.id).length}
                </span>
                <p className="text-[10px] font-black uppercase text-slate-300 tracking-tighter">Items</p>
              </div>
            </div>
            {/* Fix: name and description are translation Records, accessing by current lang */}
            <h3 className="text-xl font-bold text-slate-900 mb-2">{subject.name[lang]}</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed line-clamp-2">{subject.description[lang]}</p>
            <div className="flex items-center text-xs font-bold text-indigo-600 group-hover:gap-2 transition-all">
              EXPLORE SUBJECT <ChevronRight size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectsView;
