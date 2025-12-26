
import React, { useState, useRef, useEffect } from 'react';
import { AcademicItem, Subject, AppState, Resource } from '../types';
import { useAuth } from '../App';
import { supabaseService } from '../services/supabaseService';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar as CalendarIcon, 
  Clock, 
  Type, 
  AlertCircle,
  X,
  UploadCloud,
  FileUp,
  MapPin,
  Save
} from 'lucide-react';

interface Props {
  items: AcademicItem[];
  subjects: Subject[];
  onUpdate: (updates: Partial<AppState>) => void;
  initialEditItem?: AcademicItem | null;
  onEditHandled?: () => void;
}

const AdminPanel: React.FC<Props> = ({ items, subjects, onUpdate, initialEditItem, onEditHandled }) => {
  const { t, lang } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<AcademicItem>>({
    title: '',
    subjectId: subjects[0]?.id || '',
    type: 'homework',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    location: '',
    notes: '',
    resources: []
  });

  const [resInput, setResInput] = useState({ title: '', url: '', type: 'pdf' as any });

  useEffect(() => {
    if (initialEditItem) {
      handleEdit(initialEditItem);
      if (onEditHandled) onEditHandled();
    }
  }, [initialEditItem]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      title: '', subjectId: subjects[0]?.id || '', type: 'homework', 
      date: new Date().toISOString().split('T')[0], time: '08:00', location: '', notes: '', resources: []
    });
  };

  const handleEdit = (item: AcademicItem) => {
    setFormData({ ...item });
    setEditingId(item.id);
    setIsAdding(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const publicUrl = await supabaseService.uploadFile(file);
      const newRes: Resource = {
        id: crypto.randomUUID(),
        title: file.name,
        url: publicUrl,
        type: file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : 'exercise'
      };
      setFormData(prev => ({ ...prev, resources: [...(prev.resources || []), newRes] }));
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const addResource = () => {
    if (!resInput.title || !resInput.url) return;
    const newRes: Resource = { id: crypto.randomUUID(), ...resInput };
    setFormData({ ...formData, resources: [...(formData.resources || []), newRes] });
    setResInput({ title: '', url: '', type: 'pdf' });
  };

  const removeResource = (id: string) => {
    setFormData({ ...formData, resources: (formData.resources || []).filter(r => r.id !== id) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: AcademicItem = {
      id: editingId || crypto.randomUUID(),
      title: formData.title || 'Untitled',
      subjectId: formData.subjectId || subjects[0]?.id || '',
      type: formData.type as any,
      date: formData.date || '',
      time: formData.time || '08:00',
      location: formData.location || '',
      notes: formData.notes || '',
      resources: formData.resources || []
    };

    try {
      if (editingId) {
        await supabaseService.updateAcademicItem(item);
        onUpdate({ items: items.map(i => i.id === editingId ? item : i) });
      } else {
        await supabaseService.createAcademicItem(item);
        onUpdate({ items: [item, ...items] });
      }
      resetForm();
    } catch (err) {
      alert("Failed to save.");
    }
  };

  const deleteItem = async (id: string) => {
    if (confirm('Delete permanently?')) {
      try {
        await supabaseService.deleteAcademicItem(id);
        onUpdate({ items: items.filter(i => i.id !== id) });
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('management')}</h1>
          <p className="text-slate-500 font-bold mt-1">Manage all classroom entries.</p>
        </div>
        <button 
          onClick={() => { if(isAdding) resetForm(); else setIsAdding(true); }}
          className={`px-8 py-4 rounded-[1.75rem] font-black shadow-2xl transition-all flex items-center gap-3 ${
            isAdding ? 'bg-rose-50 text-rose-600' : 'bg-indigo-600 text-white'
          }`}
        >
          {isAdding ? <><X size={22}/><span>{t('cancel')}</span></> : <><Plus size={22}/><span>{t('add')}</span></>}
        </button>
      </div>

      {isAdding && (
        <form ref={formRef} onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl space-y-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {editingId ? <Edit2 size={18}/> : <Plus size={18}/>}
            </div>
            <h2 className="text-xl font-black text-slate-900">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><Type size={14}/> {t('placeholder_title')}</label>
              <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold shadow-inner" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase">Subject</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-black cursor-pointer shadow-inner" value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name[lang]}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><CalendarIcon size={14}/> {t('due')}</label>
              <input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-black cursor-pointer shadow-inner" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><Clock size={14}/> {t('time')}</label>
              <input type="time" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-black cursor-pointer shadow-inner" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><MapPin size={14}/> {t('location')}</label>
              <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-black shadow-inner" placeholder="Room Number" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase">Category</label>
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                {['exam', 'homework', 'event'].map(type => (
                  <button key={type} type="button" onClick={() => setFormData({...formData, type: type as any})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${formData.type === type ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400'}`}>{t(type)}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><AlertCircle size={14}/> {t('notes')}</label>
            <textarea rows={4} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-6 outline-none resize-none font-bold shadow-inner" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <button type="submit" className={`w-full py-6 text-white font-black rounded-[2.5rem] shadow-2xl transition-all text-xl flex items-center justify-center gap-3 ${editingId ? 'bg-amber-500 shadow-amber-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
            {editingId ? <><Save size={24}/> Update Task</> : <><Plus size={24}/> Create Task</>}
          </button>
        </form>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-start min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-start">Type</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-start">Title</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-start">Subject</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-start">Schedule</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.sort((a,b) => b.date.localeCompare(a.date)).map(item => (
              <tr key={item.id} className={`hover:bg-slate-50 transition-colors group ${editingId === item.id ? 'bg-amber-50/50' : ''}`}>
                <td className="px-8 py-5">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${item.type === 'exam' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{t(item.type)}</span>
                </td>
                <td className="px-8 py-5 font-black text-slate-900">{item.title}</td>
                <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase text-start">{subjects.find(s => s.id === item.subjectId)?.name[lang]}</td>
                <td className="px-8 py-5 text-slate-500 font-bold text-xs text-start">
                  <div className="flex flex-col">
                    <span>{item.date}</span>
                    <span className="text-indigo-600 font-black">@ {item.time || '08:00'}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-end">
                  <div className="flex justify-end gap-2 opacity-100">
                    <button onClick={() => handleEdit(item)} className="p-3 text-slate-400 hover:text-amber-600 hover:bg-white rounded-xl shadow-sm transition-all border border-slate-100 hover:border-amber-200"><Edit2 size={18}/></button>
                    <button onClick={() => deleteItem(item.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all border border-slate-100 hover:border-red-200"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
