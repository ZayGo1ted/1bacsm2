
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { supabaseService, getSupabase } from '../services/supabaseService';
import { ChatMessage, Reaction, UserRole } from '../types';
import { 
  Send, Mic, Image as ImageIcon, Paperclip, X, 
  Smile, Play, Pause, File as FileIcon, Trash2,
  MoreHorizontal, Plus, ShieldAlert, ShieldCheck, Maximize2
} from 'lucide-react';

// Extensive Emoji List
const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉',
  '👀', '💯', '🤔', '👋', '🎓', '📚', '🧠', '✨',
  '🚀', '💩', '🤝', '🫡', '💀', '🤡', '🤮', '🤧',
  '🥳', '🥺', '😤', '😱', '🤫', '🤥', '👻', '👽',
  '🤖', '👾', '🎃', '😺', '🤲', '💪', '👑', '💎'
];

const ChatRoom: React.FC = () => {
  const { user, t, onlineUserIds, lang, isDev } = useAuth();
  
  // Local caching of users to avoid constant DB lookups for names/roles
  const [userCache, setUserCache] = useState<any[]>([]);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  
  // Attachments
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // UI State
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);

  // Load User Cache
  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem('1bacsm2_state') || '{}');
      if (state.users) setUserCache(state.users);
    } catch (e) {}
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Data Fetching & Realtime Subscription
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
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helpers
  const getUserInfo = (id: string) => {
    const u = userCache.find((u: any) => u.id === id);
    return u ? u : { name: 'Unknown', role: 'STUDENT' };
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !attachment) || !user) return;
    setIsSending(true);
    setEmojiPickerOpen(false);

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

  const handleDeleteMessage = async (msgId: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      try {
        // Optimistic delete
        setMessages(prev => prev.filter(m => m.id !== msgId));
        await supabaseService.deleteMessage(msgId);
      } catch (e) {
        alert("Failed to delete");
      }
    }
  };

  // Audio Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setAudioChunks(prev => [...prev, e.data]);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      alert("Microphone access denied");
    }
  };

  const stopAndSendAudio = async () => {
    if (!mediaRecorder) return;
    setIsSending(true);
    mediaRecorder.onstop = () => {
       // Wait slightly for chunks to gather
       setTimeout(async () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          if (blob.size < 100) { setIsSending(false); return; }
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
       }, 200);
    };
    mediaRecorder.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
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

  useEffect(() => {
    if (!mediaRecorder) return;
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) setAudioChunks(prev => [...prev, e.data]);
    }
  }, [mediaRecorder]);

  // Reactions
  const toggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!user) return;
    const existing = msg.reactions.find(r => r.userId === user.id && r.emoji === emoji);
    let newReactions;
    if (existing) {
        newReactions = msg.reactions.filter(r => !(r.userId === user.id && r.emoji === emoji));
    } else {
        newReactions = [...msg.reactions, { userId: user.id, emoji }];
    }
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
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative">
      
      {/* Full Image Viewer */}
      {fullImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setFullImage(null)}>
          <button onClick={() => setFullImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={32}/></button>
          <img src={fullImage} alt="Full" className="max-w-full max-h-screen rounded-md shadow-2xl scale-100" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('chat')}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {onlineUserIds.size} Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 scroll-smooth" onClick={() => setEmojiPickerOpen(false)}>
        {messages.map((msg, idx) => {
          const isMe = msg.userId === user?.id;
          const userInfo = getUserInfo(msg.userId);
          const showAvatar = idx === 0 || messages[idx - 1].userId !== msg.userId;
          const canDelete = isMe || isDev;

          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group animate-in slide-in-from-bottom-2 duration-300`}>
              
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-all ${showAvatar ? (isMe ? 'bg-indigo-600 shadow-indigo-200' : 'bg-slate-400') : 'opacity-0'}`}>
                {showAvatar && userInfo.name.charAt(0)}
              </div>
              
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[65%]`}>
                
                {/* Name & Role Tag */}
                {showAvatar && !isMe && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-[10px] font-black text-slate-500">{userInfo.name}</span>
                    {userInfo.role === UserRole.DEV && <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[7px] font-black rounded-full flex items-center gap-0.5"><ShieldAlert size={6} /> DEV</span>}
                    {userInfo.role === UserRole.ADMIN && <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[7px] font-black rounded-full flex items-center gap-0.5"><ShieldCheck size={6} /> ADMIN</span>}
                  </div>
                )}
                
                {/* Message Bubble */}
                <div className={`relative px-4 py-3 rounded-2xl text-sm font-bold shadow-sm border transition-all hover:shadow-md ${
                  isMe 
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm border-transparent' 
                    : 'bg-white text-slate-700 border-slate-100 rounded-tl-sm'
                }`}>
                  
                  {/* Content */}
                  {msg.type === 'text' && <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                  
                  {msg.type === 'image' && (
                    <div className="space-y-2">
                        <div className="relative group/img cursor-pointer overflow-hidden rounded-lg border border-black/10" onClick={() => setFullImage(msg.mediaUrl!)}>
                           <img src={msg.mediaUrl} alt="attachment" className="max-w-full max-h-60 object-cover w-full transition-transform group-hover/img:scale-105" />
                           <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                              <Maximize2 className="text-white drop-shadow-md" />
                           </div>
                        </div>
                        {msg.content && <p className="text-xs opacity-90">{msg.content}</p>}
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl border border-black/5 hover:bg-black/10 transition-colors">
                        <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><FileIcon size={20}/></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate max-w-[140px]">{msg.fileName}</p>
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase underline opacity-70 hover:opacity-100">Download</a>
                        </div>
                    </div>
                  )}

                  {msg.type === 'audio' && (
                    <div className="flex items-center gap-3 min-w-[180px]">
                        <button 
                            onClick={() => playAudio(msg.id)} 
                            className={`p-2.5 rounded-full transition-all shadow-sm ${isMe ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        >
                            {playingAudioId === msg.id ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                        </button>
                        <div className="h-1 flex-1 bg-black/20 rounded-full overflow-hidden">
                           {playingAudioId === msg.id && (
                             <div className={`h-full ${isMe ? 'bg-white' : 'bg-indigo-600'} w-full animate-[progress_10s_linear]`}></div>
                           )}
                        </div>
                        <audio ref={el => { if(el) audioRefs.current[msg.id] = el }} src={msg.mediaUrl} onEnded={() => setPlayingAudioId(null)} />
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className={`text-[9px] font-black mt-1 block opacity-60 text-right ${isMe ? 'text-indigo-200' : 'text-slate-300'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Action Menu (Hover) */}
                  <div className={`absolute -top-4 ${isMe ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10`}>
                     <div className="bg-white border border-slate-200 shadow-xl rounded-full p-1 flex items-center gap-1 scale-90">
                        {['👍', '❤️', '😂'].map(e => (
                            <button key={e} onClick={() => toggleReaction(msg, e)} className="hover:scale-125 transition-transform p-1">{e}</button>
                        ))}
                        <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                        {canDelete && (
                          <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative group/more">
                           <Plus size={12}/>
                           {/* Popover Emoji Picker */}
                           <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 grid grid-cols-5 gap-1 w-48 hidden group-focus-within/more:grid group-hover/more:grid z-50 animate-in fade-in zoom-in-95">
                              {EMOJIS.map(e => (
                                <button key={e} onClick={(ev) => { ev.stopPropagation(); toggleReaction(msg, e); }} className="hover:bg-slate-100 rounded p-1 text-lg transition-colors">{e}</button>
                              ))}
                           </div>
                        </button>
                     </div>
                  </div>
                </div>

                {/* Reactions Display */}
                {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 px-1 animate-in slide-in-from-top-1">
                        {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                            const count = msg.reactions.filter(r => r.emoji === emoji).length;
                            const iReacted = msg.reactions.some(r => r.emoji === emoji && r.userId === user?.id);
                            return (
                                <button 
                                    key={emoji}
                                    onClick={() => toggleReaction(msg, emoji)}
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-full border shadow-sm transition-all flex items-center gap-1 hover:scale-105 ${
                                        iReacted ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'
                                    }`}
                                >
                                    <span>{emoji}</span>
                                    <span>{count}</span>
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
      <div className="p-3 md:p-4 bg-white border-t border-slate-100 relative z-30">
        
        {/* Emoji Picker Popover */}
        {emojiPickerOpen && (
          <div className="absolute bottom-full left-4 mb-2 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-3 w-72 h-64 overflow-y-auto animate-in slide-in-from-bottom-5 z-40">
             <div className="grid grid-cols-6 gap-1">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setInputText(prev => prev + e); }} className="hover:bg-indigo-50 rounded-lg p-2 text-xl transition-colors">{e}</button>
                ))}
             </div>
          </div>
        )}

        {attachment && (
            <div className="absolute bottom-full left-4 right-4 mb-2 p-3 bg-white rounded-2xl border border-indigo-100 shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-2 z-30">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                    {attachment.type.startsWith('image/') ? <ImageIcon size={20}/> : <FileIcon size={20}/>}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate text-slate-900">{attachment.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{(attachment.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setAttachment(null)} className="p-2 hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-xl transition-colors"><X size={16}/></button>
            </div>
        )}

        <div className="flex items-end gap-2">
            {isRecording ? (
                <div className="flex-1 h-14 bg-rose-50 rounded-[1.25rem] flex items-center justify-between px-4 border border-rose-100 shadow-inner animate-pulse">
                    <div className="flex items-center gap-3 text-rose-600">
                        <div className="w-3 h-3 bg-rose-600 rounded-full animate-ping"></div>
                        <span className="font-black text-xs uppercase tracking-widest">{new Date(recordingTime * 1000).toISOString().substr(14, 5)}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={cancelRecording} className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 bg-white/50 rounded-lg">{t('cancel')}</button>
                        <button onClick={stopAndSendAudio} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">{t('release_send')}</button>
                    </div>
                </div>
            ) : (
                <>
                    <button onClick={() => fileInputRef.current?.click()} className="p-3.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all">
                        <Paperclip size={20} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        multiple={false} 
                        onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}
                    />
                    
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-[1.25rem] flex items-center px-4 py-2.5 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm">
                        <textarea 
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            placeholder={t('chat_placeholder')}
                            className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 resize-none max-h-24 py-1.5 hide-scrollbar"
                            rows={1}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        />
                        <button 
                          onClick={() => setEmojiPickerOpen(!emojiPickerOpen)} 
                          className={`ml-2 transition-colors ${emojiPickerOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-amber-500'}`}
                        >
                          <Smile size={20}/>
                        </button>
                    </div>

                    {inputText || attachment ? (
                        <button 
                            onClick={handleSendMessage} 
                            disabled={isSending}
                            className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            <Send size={20} className={lang === 'ar' ? 'rtl-flip' : ''} />
                        </button>
                    ) : (
                        <button 
                            onClick={startRecording}
                            className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 hover:scale-110 hover:rotate-12 transition-all active:scale-95 shadow-sm border border-rose-100"
                            title={t('tap_record')}
                        >
                            <Mic size={20} />
                        </button>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
