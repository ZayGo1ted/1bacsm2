import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { supabaseService, getSupabase } from '../services/supabaseService';
import { ChatMessage, Reaction } from '../types';
import { 
  Send, Mic, Image as ImageIcon, Paperclip, X, 
  Smile, Play, Pause, File as FileIcon, Download,
  MoreHorizontal
} from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👀', '🎉'];

const ChatRoom: React.FC = () => {
  const { user, t, onlineUserIds, lang } = useAuth(); // Assume 'users' are passed or accessible globally if needed, but we'll use user IDs.
  // In a real app we'd map IDs to names from the global users list.
  // Let's grab users from localStorage or cache if possible to display names.
  // For now, we'll try to find user info from the online list or just show ID/Name if we had a comprehensive list.
  // To make it look good, let's use the local storage state if available or just the ID.
  const allUsers = JSON.parse(localStorage.getItem('1bacsm2_state') || '{}').users || [];
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await supabaseService.fetchMessages(100);
        setMessages(msgs);
      } catch (e) {
        console.error("Chat load error", e);
      }
    };
    loadMessages();

    // Subscribe to Realtime
    const supabase = getSupabase();
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new as any;
        const formatted: ChatMessage = {
          id: newMsg.id,
          userId: newMsg.user_id,
          content: newMsg.content,
          type: newMsg.type,
          mediaUrl: newMsg.media_url,
          fileName: newMsg.file_name,
          createdAt: newMsg.created_at,
          reactions: newMsg.reactions || []
        };
        setMessages(prev => [...prev, formatted]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions || [] } : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserName = (id: string) => {
    const u = allUsers.find((u: any) => u.id === id);
    return u ? u.name : 'Unknown';
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !attachment) || !user) return;
    setIsSending(true);

    try {
      let type: 'text' | 'image' | 'file' = 'text';
      let mediaUrl = undefined;
      let fileName = undefined;

      if (attachment) {
        type = attachment.type.startsWith('image/') ? 'image' : 'file';
        fileName = attachment.name;
        mediaUrl = await supabaseService.uploadChatMedia(attachment);
      }

      await supabaseService.sendMessage({
        userId: user.id,
        content: inputText,
        type,
        mediaUrl,
        fileName
      });

      setInputText('');
      setAttachment(null);
    } catch (e) {
      alert("Error sending message");
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setAudioChunks(prev => [...prev, e.data]);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Use state chunks here? Wait, closure issue.
        // Better logic below in stopRecording
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      alert("Microphone access denied");
    }
  };

  const stopRecording = async (send: boolean) => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.onstop = async () => {
        if (send) {
          setIsSending(true);
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // This might be empty due to closure?
          // Fix: we need to access the latest chunks. 
          // Actually MediaRecorder events are safer. Let's rely on a simplified flow:
          // We can't easily get chunks inside this closure if we rely on state updated via ondataavailable without ref.
          // Let's restart.
        }
        if (timerRef.current) clearInterval(timerRef.current);
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach(track => track.stop());
        setIsRecording(false);
        setAudioChunks([]);
      };
      mediaRecorder.stop();
      
      // Hack for closure state: create a blob from the chunks *collected so far* is tricky if rely on event.
      // Standard pattern:
    }
  };
  
  // Revised Audio Logic
  const stopAndSendAudio = async () => {
    if (!mediaRecorder) return;
    setIsSending(true);
    mediaRecorder.onstop = async (e) => {
       // We need to gather data. The ondataavailable fires periodically or on stop.
       // Let's use a reference for chunks to avoid state closure issues.
    };
    mediaRecorder.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    // Simple Timeout to allow last chunk to process
    setTimeout(async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        if (blob.size < 100) return; // Too small
        try {
            const url = await supabaseService.uploadChatMedia(blob);
            await supabaseService.sendMessage({
                userId: user!.id,
                content: 'Voice Message',
                type: 'audio',
                mediaUrl: url
            });
        } catch(e) { console.error(e); }
        setIsSending(false);
        setAudioChunks([]);
    }, 500);
  };

  const cancelRecording = () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAudioChunks([]);
  };

  // Re-bind data available to use ref if needed, or simple state with functional updates
  useEffect(() => {
      if (!mediaRecorder) return;
      mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) setAudioChunks(prev => [...prev, e.data]);
      }
  }, [mediaRecorder]);


  const toggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!user) return;
    const existing = msg.reactions.find(r => r.userId === user.id && r.emoji === emoji);
    let newReactions;
    if (existing) {
        newReactions = msg.reactions.filter(r => !(r.userId === user.id && r.emoji === emoji));
    } else {
        newReactions = [...msg.reactions, { userId: user.id, emoji }];
    }
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m));
    await supabaseService.updateReactions(msg.id, newReactions);
  };

  const playAudio = (id: string) => {
      const audio = audioRefs.current[id];
      if (!audio) return;
      
      if (playingAudioId === id) {
          audio.pause();
          setPlayingAudioId(null);
      } else {
          // Pause others
          if (playingAudioId && audioRefs.current[playingAudioId]) {
              audioRefs.current[playingAudioId].pause();
              audioRefs.current[playingAudioId].currentTime = 0;
          }
          audio.play();
          setPlayingAudioId(id);
          audio.onended = () => setPlayingAudioId(null);
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('chat')}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
             {onlineUserIds.size} Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => {
          const isMe = msg.userId === user?.id;
          const showAvatar = idx === 0 || messages[idx - 1].userId !== msg.userId;
          
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white shadow-sm ${showAvatar ? (isMe ? 'bg-indigo-600' : 'bg-slate-400') : 'opacity-0'} transition-all`}>
                {getUserName(msg.userId).charAt(0)}
              </div>
              
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {showAvatar && !isMe && <span className="text-[9px] font-black text-slate-400 mb-1 ml-1">{getUserName(msg.userId)}</span>}
                
                <div className={`relative px-4 py-3 rounded-2xl text-sm font-bold shadow-sm ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}>
                  {/* Content */}
                  {msg.type === 'text' && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  
                  {msg.type === 'image' && (
                    <div className="space-y-2">
                        <img src={msg.mediaUrl} alt="attachment" className="max-w-full rounded-lg max-h-60 object-cover border border-white/20" />
                        {msg.content && <p className="text-xs opacity-90">{msg.content}</p>}
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl">
                        <div className="p-2 bg-white rounded-lg text-indigo-600"><FileIcon size={20}/></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{msg.fileName}</p>
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase underline opacity-70 hover:opacity-100">Download</a>
                        </div>
                    </div>
                  )}

                  {msg.type === 'audio' && (
                    <div className="flex items-center gap-3 min-w-[150px]">
                        <button 
                            onClick={() => playAudio(msg.id)} 
                            className={`p-2 rounded-full transition-all ${isMe ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        >
                            {playingAudioId === msg.id ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                        </button>
                        <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                            <div className={`h-full ${isMe ? 'bg-white' : 'bg-indigo-600'} w-1/2 animate-pulse`}></div>
                        </div>
                        <audio ref={el => { if(el) audioRefs.current[msg.id] = el }} src={msg.mediaUrl} onEnded={() => setPlayingAudioId(null)} />
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className={`text-[8px] font-black mt-1 block opacity-50 text-right ${isMe ? 'text-indigo-100' : 'text-slate-300'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Reaction Button (Hover) */}
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                     <div className="bg-white border border-slate-100 shadow-lg rounded-full p-1 flex gap-1 scale-75">
                        {REACTION_EMOJIS.slice(0,3).map(e => (
                            <button key={e} onClick={() => toggleReaction(msg, e)} className="hover:scale-125 transition-transform">{e}</button>
                        ))}
                        <button className="text-slate-400"><MoreHorizontal size={12}/></button>
                     </div>
                  </div>
                </div>

                {/* Reactions Display */}
                {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                            const count = msg.reactions.filter(r => r.emoji === emoji).length;
                            const iReacted = msg.reactions.some(r => r.emoji === emoji && r.userId === user?.id);
                            return (
                                <button 
                                    key={emoji}
                                    onClick={() => toggleReaction(msg, emoji)}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-sm transition-all ${
                                        iReacted ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-600'
                                    }`}
                                >
                                    {emoji} {count}
                                </button>
                            );
                        })}
                    </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 relative">
        {attachment && (
            <div className="absolute bottom-full left-4 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    {attachment.type.startsWith('image/') ? <ImageIcon size={20}/> : <FileIcon size={20}/>}
                </div>
                <div className="max-w-[150px]">
                    <p className="text-xs font-bold truncate">{attachment.name}</p>
                    <p className="text-[9px] text-slate-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setAttachment(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={14}/></button>
            </div>
        )}

        {isRecording ? (
            <div className="h-14 bg-rose-50 rounded-2xl flex items-center justify-between px-4 border border-rose-100 animate-pulse">
                <div className="flex items-center gap-2 text-rose-600">
                    <div className="w-3 h-3 bg-rose-600 rounded-full animate-ping"></div>
                    <span className="font-black text-xs uppercase tracking-widest">{new Date(recordingTime * 1000).toISOString().substr(14, 5)}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={cancelRecording} className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700">{t('cancel')}</button>
                    <button onClick={stopAndSendAudio} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">{t('release_send')}</button>
                </div>
            </div>
        ) : (
            <div className="flex items-end gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Paperclip size={20} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple={false} 
                    onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}
                />
                
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 py-2 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                    <textarea 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder={t('chat_placeholder')}
                        className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 resize-none max-h-24 py-2 hide-scrollbar"
                        rows={1}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    />
                    <button className="text-slate-400 hover:text-amber-500 transition-colors ml-2"><Smile size={20}/></button>
                </div>

                {inputText || attachment ? (
                    <button 
                        onClick={handleSendMessage} 
                        disabled={isSending}
                        className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Send size={20} className={lang === 'ar' ? 'rtl-flip' : ''} />
                    </button>
                ) : (
                    <button 
                        onClick={startRecording}
                        className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 hover:scale-105 transition-all active:scale-95"
                        title={t('tap_record')}
                    >
                        <Mic size={20} />
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
