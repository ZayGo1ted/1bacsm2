
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { supabaseService, getSupabase } from '../services/supabaseService';
import { aiService } from '../services/aiService';
import { ChatMessage, Reaction, UserRole } from '../types';
import { 
  Send, Mic, Image as ImageIcon, Paperclip, X, 
  Smile, Play, Pause, File as FileIcon, Trash2,
  MoreHorizontal, Plus, ShieldAlert, ShieldCheck, Maximize2,
  Bell, BellOff, Sparkles, Bot, AlertTriangle, Bug, WifiOff
} from 'lucide-react';

const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉',
  '👀', '💯', '🤔', '👋', '🎓', '📚', '🧠', '✨',
  '🚀', '💩', '🤝', '🫡', '💀', '🤡', '🤮', '🤧',
  '🥳', '🥺', '😤', '😱', '🤫', '🤥', '👻', '👽',
  '🤖', '👾', '🎃', '😺', '🤲', '💪', '👑', '💎'
];

const ZAY_ID = 'zay-assistant';

const ChatRoom: React.FC = () => {
  const { user, t, onlineUserIds, lang, isDev } = useAuth();
  const [userCache, setUserCache] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const lastBotTriggerRef = useRef<number>(0);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<{[key: string]: any}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('chat_notifications') === 'true';
  });

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem('1bacsm2_state') || '{}');
      if (state.users) setUserCache(state.users);
    } catch (e) {}
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping, typingUsers]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('chat_notifications', 'true');
        } else {
          alert("Permission denied.");
        }
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('chat_notifications', 'false');
    }
  };

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase.channel('chat_activity');
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
        const userId = payload.userId;
        if (userId === user?.id) return;
        setTypingUsers(prev => new Set(prev).add(userId));
        if (typingTimeoutRef.current[userId]) clearTimeout(typingTimeoutRef.current[userId]);
        typingTimeoutRef.current[userId] = setTimeout(() => {
           setTypingUsers(prev => {
             const next = new Set(prev);
             next.delete(userId);
             return next;
           });
        }, 3000);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const broadcastTyping = async () => {
    if (!user) return;
    await getSupabase().channel('chat_activity').send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id }
    });
  };

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await supabaseService.fetchMessages(100);
        setMessages(msgs);
      } catch (e) {}
    };
    loadMessages();

    const supabase = getSupabase();
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new as any;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, {
            id: newMsg.id,
            userId: newMsg.user_id,
            content: newMsg.content,
            type: newMsg.type,
            mediaUrl: newMsg.media_url,
            fileName: newMsg.file_name,
            createdAt: newMsg.created_at,
            reactions: newMsg.reactions || []
          }];
        });
        setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(newMsg.user_id);
            return next;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions || [] } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const getUserInfo = (id: string) => {
    if (id === ZAY_ID) return { name: 'Zay', role: 'ASSISTANT', isBot: true };
    const u = userCache.find((u: any) => u.id === id);
    return u || { name: 'Student', role: 'STUDENT' };
  };

  const handleBotTrigger = async (userQuery: string) => {
    const now = Date.now();
    if (now - lastBotTriggerRef.current < 2000) return; 
    lastBotTriggerRef.current = now;
    setIsBotTyping(true);
    try {
      const responseText = await aiService.askZay(userQuery, user);
      setIsBotTyping(false);
      await supabaseService.sendMessage({
        userId: ZAY_ID,
        content: responseText,
        type: 'text'
      });
    } catch (error) {
      setIsBotTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !attachment) || !user) return;
    setIsSending(true);
    setEmojiPickerOpen(false);
    const content = inputText;
    try {
      let type: 'text' | 'image' | 'file' = 'text';
      let mediaUrl, fileName;
      if (attachment) {
        type = attachment.type.startsWith('image/') ? 'image' : 'file';
        fileName = attachment.name;
        mediaUrl = await supabaseService.uploadChatMedia(attachment);
      }
      await supabaseService.sendMessage({ userId: user.id, content, type, mediaUrl, fileName });
      setInputText('');
      setAttachment(null);
      if (type === 'text' && content.toLowerCase().includes('@zay')) handleBotTrigger(content);
    } catch (e) {
      alert("Error sending");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (confirm("Delete message?")) {
      try {
        await supabaseService.deleteMessage(msgId);
      } catch (e) {}
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      alert("Mic blocked.");
    }
  };

  const stopAndSendAudio = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setIsSending(true);
    recorder.onstop = async () => {
       try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (blob.size < 100) return;
          const url = await supabaseService.uploadChatMedia(blob);
          await supabaseService.sendMessage({ userId: user!.id, content: 'Voice Message', type: 'audio', mediaUrl: url });
       } catch(e) { 
           alert("Audio fail");
       } finally {
           setIsSending(false);
           audioChunksRef.current = [];
       }
    };
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const toggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!user) return;
    const existing = msg.reactions.find(r => r.userId === user.id && r.emoji === emoji);
    let newReactions = existing 
        ? msg.reactions.filter(r => !(r.userId === user.id && r.emoji === emoji))
        : [...msg.reactions, { userId: user.id, emoji }];
    await supabaseService.updateReactions(msg.id, newReactions);
  };

  const playAudio = (id: string) => {
      const audio = audioRefs.current[id];
      if (!audio) return;
      if (playingAudioId === id) {
          audio.pause();
          setPlayingAudioId(null);
      } else {
          if (playingAudioId && audioRefs.current[playingAudioId]) audioRefs.current[playingAudioId].pause();
          audio.play();
          setPlayingAudioId(id);
      }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {fullImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="Full" className="max-w-full max-h-screen rounded-md" />
        </div>
      )}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('chat')}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{onlineUserIds.size} Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleNotifications} 
            className={`p-2 rounded-xl transition-all ${notificationsEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}
          >
            {notificationsEnabled ? <Bell size={20} className="fill-current" /> : <BellOff size={20} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 scroll-smooth" onClick={() => setEmojiPickerOpen(false)}>
        {messages.map((msg, idx) => {
          const isMe = msg.userId === user?.id;
          const userInfo = getUserInfo(msg.userId);
          const showAvatar = idx === 0 || messages[idx - 1].userId !== msg.userId;
          const canDelete = isMe || isDev;
          const isBot = msg.userId === ZAY_ID;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-all ${showAvatar ? (isMe ? 'bg-indigo-600' : isBot ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-600' : 'bg-slate-400') : 'opacity-0'}`}>
                {showAvatar && (isBot ? <Bot size={18} /> : userInfo.name.charAt(0))}
              </div>
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[65%]`}>
                {showAvatar && !isMe && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className={`text-[10px] font-black ${isBot ? 'text-violet-600' : 'text-slate-500'}`}>{userInfo.name}</span>
                    {userInfo.role === UserRole.DEV && <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[7px] font-black rounded-full">DEV</span>}
                    {userInfo.role === UserRole.ADMIN && <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[7px] font-black rounded-full">ADMIN</span>}
                  </div>
                )}
                <div className={`relative px-4 py-3 rounded-2xl text-sm font-bold shadow-sm border ${isMe ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm border-transparent' : isBot ? 'bg-white text-slate-700 border-violet-100 rounded-tl-sm ring-1 ring-violet-50' : 'bg-white text-slate-700 border-slate-100 rounded-tl-sm'}`}>
                  {msg.type === 'text' && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  {msg.type === 'image' && (
                    <div className="space-y-2 cursor-pointer" onClick={() => setFullImage(msg.mediaUrl!)}>
                       <img src={msg.mediaUrl} alt="attachment" className="max-w-full max-h-60 object-cover rounded-lg" />
                    </div>
                  )}
                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl">
                        <FileIcon size={20}/><a href={msg.mediaUrl} target="_blank" className="text-xs underline">{msg.fileName}</a>
                    </div>
                  )}
                  {msg.type === 'audio' && (
                    <div className="flex items-center gap-3 min-w-[180px]">
                        <button onClick={() => playAudio(msg.id)} className={`p-2 rounded-full ${isMe ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {playingAudioId === msg.id ? <Pause size={16}/> : <Play size={16}/>}
                        </button>
                        <audio ref={el => { if(el) audioRefs.current[msg.id] = el }} src={msg.mediaUrl} onEnded={() => setPlayingAudioId(null)} />
                    </div>
                  )}
                  <span className={`text-[9px] font-black mt-1 block opacity-60 text-right ${isMe ? 'text-indigo-200' : 'text-slate-300'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className={`absolute -top-4 ${isMe ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-all z-10`}>
                       <div className="bg-white border shadow-xl rounded-full p-1 flex items-center gap-1 scale-90">
                          {['👍', '❤️', '😂'].map(e => <button key={e} onClick={() => toggleReaction(msg, e)} className="p-1">{e}</button>)}
                          {canDelete && <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={12} /></button>}
                       </div>
                    </div>
                </div>
                {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                            <button key={emoji} onClick={() => toggleReaction(msg, emoji)} className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-white">{emoji} {msg.reactions.filter(r => r.emoji === emoji).length}</button>
                        ))}
                    </div>
                )}
              </div>
            </div>
          );
        })}
        {typingUsers.size > 0 && !isBotTyping && (
           <div className="flex gap-2 items-center px-4">
              <span className="text-[10px] font-bold text-slate-400">Someone is typing...</span>
           </div>
        )}
        {isBotTyping && (
           <div className="flex gap-3 animate-pulse items-end px-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white"><Bot size={18} /></div>
              <div className="bg-white px-5 py-4 rounded-2xl border-2 border-violet-100 shadow-lg text-[10px] font-black text-violet-600">Zay is thinking...</div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 bg-white border-t border-slate-100 relative z-30 pb-safe">
        {emojiPickerOpen && (
          <div className="absolute bottom-full left-4 mb-2 bg-white border shadow-2xl rounded-2xl p-3 w-72 h-64 overflow-y-auto z-40">
             <div className="grid grid-cols-6 gap-1">
                {EMOJIS.map(e => <button key={e} onClick={() => { setInputText(prev => prev + e); }} className="p-2 text-xl">{e}</button>)}
             </div>
          </div>
        )}
        {attachment && (
            <div className="absolute bottom-full left-4 right-4 mb-2 p-3 bg-white rounded-2xl border shadow-xl flex items-center gap-3">
                <p className="text-xs font-black flex-1 truncate">{attachment.name}</p>
                <button onClick={() => setAttachment(null)}><X size={16}/></button>
            </div>
        )}
        <div className="flex items-end gap-2">
            {isRecording ? (
                <div className="flex-1 h-14 bg-rose-50 rounded-[1.25rem] flex items-center justify-between px-4 border border-rose-100">
                    <span className="font-black text-xs text-rose-600 uppercase">Recording {recordingTime}s</span>
                    <button onClick={stopAndSendAudio} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase">Send</button>
                </div>
            ) : (
                <>
                    <button onClick={() => fileInputRef.current?.click()} className="p-3.5 text-slate-400 hover:text-indigo-600"><Paperclip size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}/>
                    <div className="flex-1 bg-slate-50 border rounded-[1.25rem] flex items-center px-4 py-2.5">
                        <textarea value={inputText} onChange={e => { setInputText(e.target.value); broadcastTyping(); }} placeholder={t('chat_placeholder')} className="w-full bg-transparent outline-none text-sm font-bold resize-none py-1.5" rows={1} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                        <button onClick={() => setEmojiPickerOpen(!emojiPickerOpen)} className="ml-2 text-slate-400"><Smile size={20}/></button>
                    </div>
                    <button onClick={handleSendMessage} disabled={isSending} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl disabled:opacity-50"><Send size={20} /></button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
