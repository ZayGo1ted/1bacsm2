
import React from 'react';
import { Github, Twitter, Mail, Heart, Code, Users, ShieldCheck, Sparkles } from 'lucide-react';

const Credits: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-24">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-10 md:p-16 rounded-[3.5rem] shadow-2xl border-4 border-white">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
          <Code size={200} />
        </div>
        <div className="absolute -bottom-10 -left-10 p-10 opacity-10 -rotate-12 scale-150">
          <Sparkles size={150} />
        </div>
        
        <div className="relative z-10 text-center space-y-8">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-white/30 shadow-xl">
            <Heart size={48} className="text-white fill-white animate-pulse" />
          </div>
          
          <div className="space-y-4">
            <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <span className="text-white text-[10px] font-black uppercase tracking-[0.4em]">Official Credits</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
              Developed by <span className="text-indigo-200">ZayGo1ted</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Main Acknowledgment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6 hover:shadow-2xl transition-all group">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={32} />
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Special Thanks</h3>
            <p className="text-slate-500 font-bold leading-relaxed text-xl italic">
              "Special thanks to <span className="text-indigo-600 font-black not-italic">Itz_Ousso</span> for testing and feedback, and to all my classmates."
            </p>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6 hover:shadow-2xl transition-all group">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShieldCheck size={32} />
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mission Statement</h3>
            <p className="text-slate-500 font-bold leading-relaxed text-lg">
              This platform was created to centralize our academic resources and keep our 1Bac Science Math community connected and organized.
            </p>
          </div>
        </div>
      </div>

      {/* Footer / Contact */}
      <div className="bg-slate-900 p-12 rounded-[4rem] text-center space-y-10 relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
        
        <div className="space-y-3">
          <h2 className="text-white text-3xl font-black tracking-tight">Stay Connected</h2>
          <p className="text-slate-400 font-bold max-w-md mx-auto">Have ideas for the next version? Reach out and let's make it happen.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <a href="#" className="bg-white/5 hover:bg-white/10 text-white px-8 py-5 rounded-[2.5rem] border border-white/10 transition-all flex items-center gap-3 font-black text-sm group">
            <Github size={22} className="group-hover:rotate-12 transition-transform" /> GitHub
          </a>
          <a href="#" className="bg-white/5 hover:bg-white/10 text-white px-8 py-5 rounded-[2.5rem] border border-white/10 transition-all flex items-center gap-3 font-black text-sm group">
            <Mail size={22} /> Contact Dev
          </a>
        </div>

        <div className="pt-10 border-t border-white/5">
          <div className="flex items-center justify-center gap-4 text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">
            <span>Hub Protocol V2.5.5</span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            <span>Released 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Credits;
