
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { AcademicItem, Subject, AppState } from '../types';
import { SUBJECT_ICONS } from '../constants';
import { FileText, Video, Link as LinkIcon, BookOpen, ChevronRight } from 'lucide-react';

interface Props {
  items: AcademicItem[];
  subjects: Subject[];
  onUpdate: (updates: Partial<AppState>) => void;
  initialSubjectId?: string | null;
  clearInitialSubject?: () => void;
}

const SubjectsView: React.FC<Props> = ({ items, subjects, initialSubjectId, clearInitialSubject }) => {
  const { lang } = useAuth();
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (initialSubjectId) {
      const subj = subjects.find(s => s.id === initialSubjectId);
      if (subj) {
        setActiveSubject(subj);
        if (clearInitialSubject) clearInitialSubject();
      }
    }
  }, [initialSubjectId, subjects]);

  if (activeSubject) {
    const subjectItems = items.filter(i => i.subjectId === activeSubject.id);
    const exams = subjectItems.filter(i => i.type === 'exam');
    const homework = subjectItems.filter(i => i.type === 'homework');

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
        <button onClick={() => setActiveSubject(null)} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:underline uppercase tracking-widest">
          &larr; Back to subjects
        </button>

        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${activeSubject.color}`}>
            {SUBJECT_ICONS[activeSubject.id] || <BookOpen size={20} />}
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">{activeSubject.name[lang]}</h1>
            <p className="text-[10px] font-bold text-slate-400 truncate">{activeSubject.description[lang]}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="space-y-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Exams & Assessments</h2>
            <div className="space-y-2">
              {exams.length > 0 ? exams.map(item => (
                <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-xs text-slate-900 leading-tight">{item.title}</h3>
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase">{item.date}</span>
                  </div>
                  {item.notes && <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg italic">"{item.notes}"</p>}
                  {item.resources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.resources.map(res => (
                        <a key={res.id} href={res.url} target="_blank" className="flex items-center gap-1.5 p-1.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-[9px] font-black text-slate-600 transition-colors">
                          {res.type === 'pdf' ? <FileText size={10} /> : res.type === 'video' ? <Video size={10} /> : <LinkIcon size={10} />}
                          {res.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )) : <div className="p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-[9px] font-black text-slate-300 uppercase">No exams</div>}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Homework & Exercises</h2>
            <div className="space-y-2">
              {homework.length > 0 ? homework.map(item => (
                <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                  <div className="flex justify-between items-start mb-1.5">
                     <h3 className="font-black text-xs text-slate-900 leading-tight">{item.title}</h3>
                     <span className="text-[9px] font-black text-indigo-600 uppercase">Due: {item.date}</span>
                  </div>
                  {item.notes && <p className="text-[10px] text-slate-500 mb-2 line-clamp-1 italic">{item.notes}</p>}
                </div>
              )) : <div className="p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-[9px] font-black text-slate-300 uppercase">Clean slate</div>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="px-1">
        <h1 className="text-xl font-black text-slate-900">Explore Curriculum</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select a subject to access materials</p>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {subjects.map(subject => {
          const count = items.filter(i => i.subjectId === subject.id).length;
          return (
            <div 
              key={subject.id} 
              onClick={() => setActiveSubject(subject)}
              className="group bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer relative flex flex-col items-center text-center"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm mb-2.5 ${subject.color}`}>
                {SUBJECT_ICONS[subject.id] || <BookOpen size={20} />}
              </div>
              <h3 className="text-xs font-black text-slate-900 mb-0.5 truncate w-full">{subject.name[lang]}</h3>
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{count} {count === 1 ? 'Task' : 'Tasks'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectsView;
