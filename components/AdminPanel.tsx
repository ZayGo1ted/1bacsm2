
import React, { useState, useRef } from 'react';
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
  Link as LinkIcon, 
  FileText, 
  Video,
  AlertCircle,
  X,
  UploadCloud,
  FileUp,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';

interface Props {
  items: AcademicItem[];
  subjects: Subject[];
  onUpdate: (updates: Partial<AppState>) => void;
}

const AdminPanel: React.FC<Props> = ({ items, subjects, onUpdate }) => {
  const { t, lang } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<AcademicItem>>({
    title: '',
    subjectId: subjects[0]?.id || '',
    type: 'homework',
    date: new Date().toISOString().split('T')[0],
    location: '',
    notes: '',
    resources: []
  });

  const [resInput, setResInput] = useState({ title: '', url: '', type: 'pdf' as any });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await supabaseService.uploadFile(file);
      const fileType = file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : 'exercise';
      
      const newRes: Resource = {
        id: crypto.randomUUID(),
        title: file.name,
        url: publicUrl,
        type: fileType as any
      };

      setFormData(prev => ({
        ...prev,
        resources: [...(prev.resources || []), newRes]
      }));
    } catch (err) {
      alert("Failed to upload file to Supabase Cloud.");
      console.error(err);
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
    const newItem: AcademicItem = {
      id: crypto.randomUUID(),
      title: formData.title || 'Untitled',
      subjectId: formData.subjectId || subjects[0].id,
      type: formData.type as any,
      date: formData.date || '',
      time: formData.time,
      location: formData.location,
      notes: formData.notes || '',
      resources: formData.resources || []
    };

    try {
      await supabaseService.createAcademicItem(newItem);
      onUpdate({ items: [newItem, ...items] });
      setIsAdding(false);
      setFormData({
        title: '', subjectId: subjects[0].id, type: 'homework', 
        date: new Date().toISOString().split('T')[0], location: '', notes: '', resources: []
      });
    } catch (err) {
      alert("Failed to save to database.");
      console.error(err);
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
          <p className="text-slate-500 font-bold mt-1">Admin Dashboard — Cloud Synced.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`px-8 py-4 rounded-[1.75rem] font-black shadow-2xl transition-all flex items-center gap-3 active:scale-95 ${
            isAdding 
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-rose-100' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
          }`}
        >
          {isAdding ? <><X size={22}/><span>{t('cancel')}</span></> : <><Plus size={22}/><span>{t('add')}</span></>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl space-y-10 animate-in slide-in-from-top-12 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Type size={14}/> {t('placeholder_title')}
              </label>
              <input 
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold transition-all"
                placeholder={t('placeholder_title')}
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('subjects')}</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 outline-none font-black appearance-none text-slate-800"
                value={formData.subjectId}
                onChange={e => setFormData({...formData, subjectId: e.target.value})}
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name['en']}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon size={14}/> {t('due')}
              </label>
              <input 
                type="date"
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 outline-none font-black transition-all"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14}/> {t('location')}
              </label>
              <input 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 outline-none font-black transition-all"
                placeholder="Classroom / Room Number"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Category</label>
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                {['exam', 'homework', 'event'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, type: type as any})}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${
                      formData.type === type ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14}/> {t('notes')}
            </label>
            <textarea 
              rows={4}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-6 outline-none resize-none font-bold"
              placeholder={t('placeholder_notes')}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="space-y-6">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <UploadCloud size={14}/> {t('upload_res')}
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-4 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept="application/pdf,image/*,video/*"
                />
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <FileUp size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-900">Choose File</p>
                  <p className="text-xs text-slate-400 font-bold">Cloud Upload (Real Files)</p>
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-[2rem]">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4">
                <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Or Add Web Link</p>
                <input 
                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  placeholder="Link Title (e.g. YouTube Video)"
                  value={resInput.title}
                  onChange={e => setResInput({...resInput, title: e.target.value})}
                />
                <input 
                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  placeholder="https://..."
                  value={resInput.url}
                  onChange={e => setResInput({...resInput, url: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={addResource}
                  className="w-full bg-white text-indigo-600 border-2 border-indigo-100 py-3 rounded-xl font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  Attach Link
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {formData.resources?.map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-white border border-slate-200 ps-4 pe-2 py-2 rounded-xl shadow-sm">
                  <span className="text-xs font-black text-slate-700 max-w-[150px] truncate">{r.title}</span>
                  <button type="button" onClick={() => removeResource(r.id)} className="p-1 hover:bg-red-50 text-red-400 rounded-lg transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 py-6 text-white font-black rounded-[2.5rem] shadow-2xl hover:bg-indigo-700 transition-all text-xl">
            {t('save')}
          </button>
        </form>
      )}

      {/* Item List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-start min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">{t('type')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">{t('placeholder_title')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">{t('subjects')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">{t('due')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-5">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                    item.type === 'exam' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {t(item.type)}
                  </span>
                </td>
                <td className="px-8 py-5 font-black text-slate-900">{item.title}</td>
                <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase text-start">
                  {subjects.find(s => s.id === item.subjectId)?.name['en']}
                </td>
                <td className="px-8 py-5 text-slate-500 font-bold text-xs text-start">
                  {new Date(item.date).toLocaleDateString(lang)}
                </td>
                <td className="px-8 py-5 text-end">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent">
                      <Trash2 size={16}/>
                    </button>
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
