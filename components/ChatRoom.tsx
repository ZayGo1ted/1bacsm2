
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../App';
import { supabaseService, getSupabase } from '../services/supabaseService';
import { aiService } from '../services/aiService';
import { ChatMessage, Reaction, UserRole } from '../types';
import { 
  Send, Mic, Image as ImageIcon, Paperclip, X, 
  Smile, Play, Pause, File as FileIcon, Trash2,
  Plus, ShieldAlert, ShieldCheck, Maximize2,
  Bell, BellOff, Sparkles, Bot, Bug, Reply,
  ChevronDown, Copy, MoreVertical, ArrowDown
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
  
  // Data State
  const [userCache, setUserCache] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Input State
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});

  // Bot & Typing State
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutRef = useRef<{[key: string]: any}>({});
  const lastBotTriggerRef = useRef<number>(0);

  // UI Refs & Scroll State
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('chat_notifications') === 'true';
  });

  // Load user cache from local storage for quick lookup
  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem('1bacsm2_state') || '{}');
      if (state.users) setUserCache(state.users);
    } catch (e) {}
  }, []);

  // --- Scroll Logic ---
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    // Initial scroll
    scrollToBottom(false);
  }, [messages.length === 0]); 

  useEffect(() => {
    // Smart auto-scroll: Only if near bottom or if it's my message
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    const lastMsg = messages[messages.length - 1];
    
    if (isNearBottom || (lastMsg && lastMsg.userId === user?.id)) {
      scrollToBottom();
    }
  }, [messages, isBotTyping, typingUsers]);

  // --- Real-time Typing ---
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase.channel('chat_activity');

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId, userName } = payload;
        if (userId === user?.id) return; 

        setTypingUsers(prev => {
           const next = new Map(prev);
           next.set(userId, userName);
           return next;
        });

        if (typingTimeoutRef.current[userId]) {
           clearTimeout(typingTimeoutRef.current[userId]);
        }

        typingTimeoutRef.current[userId] = setTimeout(() => {
           setTypingUsers(prev => {
             const next = new Map(prev);
             next.delete(userId);
             return next;
           });
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const broadcastTyping = async () => {
    if (!user) return;
    await getSupabase().channel('chat_activity').send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, userName: user.name }
    });
  };

  // --- Mention Logic ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    broadcastTyping();

    // Detect @Mention
    const lastWord = val.split(/[\s\n]+/).pop();
    if (lastWord && lastWord.startsWith('@')) {
      setMentionQuery(lastWord.substring(1));
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
      setMentionQuery(null);
    }
  };

  const insertMention = (userName: string) => {
    const words = inputText.split(/[\s\n]+/);
    words.pop(); // Remove the incomplete @...
    const newValue = words.join(' ') + (words.length > 0 ? ' ' : '') + `@${userName} `;
    setInputText(newValue);
    setShowMentionPopup(false);
    setMentionQuery(null);
  };

  // --- Message Subscription & Notifications ---
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
          return [...prev, formatted];
        });
        
        // Remove from typing list
        setTypingUsers(prev => {
            const next = new Map(prev);
            next.delete(newMsg.user_id);
            return next;
        });

        // Notifications
        if (notificationsEnabled && user && newMsg.user_id !== user.id && document.hidden) {
           const sender = userCache.find(u => u.id === newMsg.user_id);
           const senderName = sender ? sender.name : 'Someone';
           
           // Check for Mentions
           if (newMsg.content.includes(`@${user.name}`)) {
             new Notification(`🔴 You were mentioned by ${senderName}`, { 
                body: newMsg.content,
                icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602316.png' 
             });
           } else {
             new Notification(`New message from ${senderName}`, { body: newMsg.content });
           }
        }
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
  }, [user, notificationsEnabled, userCache]);

  const getUserInfo = (id: string) => {
    if (id === ZAY_ID) return { name: 'Zay', role: 'ASSISTANT', isBot: true };
    const u = userCache.find((u: any) => u.id === id);
    return u || { name: 'Student', role: 'STUDENT' };
  };

  // --- BOT LOGIC ---
  const handleBotTrigger = async (userQuery: string) => {
    const now = Date.now();
    if (now - lastBotTriggerRef.current < 2000) return; 
    lastBotTriggerRef.current = now;

    setIsBotTyping(true);
    const safetyTimeout = setTimeout(() => setIsBotTyping(false), 15000);

    try {
      const responseText = await aiService.askZay(userQuery, user);
      clearTimeout(safetyTimeout);
      setIsBotTyping(false);

      const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          userId: ZAY_ID,
          content: responseText,
          type: 'text',
          createdAt: new Date().toISOString(),
          reactions: []
      };
      setMessages(prev => [...prev, aiMsg]);
      scrollToBottom();

      await supabaseService.sendMessage({ userId: ZAY_ID, content: responseText, type: 'text' });
    } catch (error) {
      console.error("Bot Trigger Error:", error);
    } finally {
      clearTimeout(safetyTimeout);
      setIsBotTyping(false);
    }
  };

  // --- SEND MESSAGE ---
  const handleSendMessage = async () => {
    if ((!inputText.trim() && !attachment) || !user) return;
    setIsSending(true);
    setEmojiPickerOpen(false);
    setShowMentionPopup(false);

    let content = inputText;
    // Add reply context if exists
    if (replyingTo) {
      const replyUser = getUserInfo(replyingTo.userId);
      content = `> Replying to ${replyUser.name}: "${replyingTo.content.substring(0, 30)}..."\n\n${content}`;
    }

    try {
      let type: 'text' | 'image' | 'file' = 'text';
      let mediaUrl, fileName;

      if (attachment) {
        type = attachment.type.startsWith('image/') ? 'image' : 'file';
        fileName = attachment.name;
        mediaUrl = await supabaseService.uploadChatMedia(attachment);
      }

      await supabaseService.sendMessage({
        userId: user.id,
        content,
        type,
        mediaUrl,
        fileName
      });

      setInputText('');
      setAttachment(null);
      setReplyingTo(null);

      if (type === 'text' && content.toLowerCase().includes('@zay')) {
        handleBotTrigger(content);
      }

    } catch (e) {
      alert("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  // --- AUDIO ---
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
      alert("Microphone access denied.");
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
           alert("Failed to send audio.");
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

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    audioChunksRef.current = [];
  };

  // --- INTERACTIONS ---
  const toggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!user) return;
    const existing = msg.reactions.find(r => r.userId === user.id && r.emoji === emoji);
    let newReactions = existing 
        ? msg.reactions.filter(r => !(r.userId === user.id && r.emoji === emoji))
        : [...msg.reactions, { userId: user.id, emoji }];
    
    // Optimistic
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
          if (playingAudioId && audioRefs.current[playingAudioId]) audioRefs.current[playingAudioId].pause();
          audio.play();
          setPlayingAudioId(id);
      }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (confirm("Delete this message?")) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      await supabaseService.deleteMessage(msgId);
    }
  };

  // --- FORMATTING HELPERS ---
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(lang, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-indigo-200 bg-indigo-500/20 px-1 rounded font-black">{part}</span>;
      }
      return part;
    });
  };

  // --- RENDER ---
  const typingNames = Array.from(typingUsers.values());
  let typingText = '';
  if (typingNames.length === 1) typingText = `${typingNames[0]} is typing...`;
  else if (typingNames.length === 2) typingText = `${typingNames[0]} and ${typingNames[1]} are typing...`;
  else if (typingNames.length > 2) typingText = `${typingNames[0]}, ${typingNames[1]} and ${typingNames.length - 2} others...`;

  const filteredUsers = mentionQuery !== null 
    ? userCache.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()) && u.id !== user?.id)
    : [];

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] relative">
      {fullImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <button onClick={() => setFullImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-white/10 rounded-full"><X size={24}/></button>
          <img src={fullImage} alt="Full" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">{t('chat')}</h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{onlineUserIds.size} Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleNotifications} className={`p-2 rounded-xl transition-all ${notificationsEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
            {notificationsEnabled ? <Bell size={18} className="fill-current" /> : <BellOff size={18} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f0f2f5] scroll-smooth" 
        onClick={() => { setEmojiPickerOpen(false); setShowMentionPopup(false); }}
      >
        {messages.map((msg, idx) => {
          const isMe = msg.userId === user?.id;
          const userInfo = getUserInfo(msg.userId);
          const isBot = msg.userId === ZAY_ID;
          const prevMsg = messages[idx - 1];
          
          // Date Grouping
          const showDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
          
          // Consecutive Message Logic (for cleaner bubbles)
          const isSequence = prevMsg && prevMsg.userId === msg.userId && !showDate;
          
          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-6">
                  <span className="bg-slate-200/60 backdrop-blur text-slate-500 text-[10px] font-bold px-4 py-1.5 rounded-full shadow-sm uppercase tracking-wider">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                </div>
              )}

              <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group ${isSequence ? 'mt-1' : 'mt-4'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-all ${!isSequence ? (isMe ? 'bg-indigo-600' : isBot ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-600' : 'bg-slate-400') : 'opacity-0'}`}>
                  {!isSequence && (isBot ? <Bot size={16} /> : userInfo.name.charAt(0))}
                </div>
                
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                  {!isSequence && !isMe && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <span className={`text-[11px] font-black ${isBot ? 'text-violet-600' : 'text-slate-600'}`}>{userInfo.name}</span>
                      {userInfo.role === UserRole.DEV && <ShieldAlert size={10} className="text-slate-900" />}
                      {userInfo.isBot && <Sparkles size={10} className="text-violet-500" />}
                    </div>
                  )}
                  
                  <div className={`relative px-4 py-3 text-sm font-medium shadow-sm transition-all
                    ${isMe 
                      ? `bg-indigo-600 text-white ${isSequence ? 'rounded-3xl rounded-tr-md' : 'rounded-3xl rounded-tr-sm'}` 
                      : isBot 
                        ? `bg-white text-slate-800 border border-violet-100 ${isSequence ? 'rounded-3xl rounded-tl-md' : 'rounded-3xl rounded-tl-sm'}`
                        : `bg-white text-slate-800 ${isSequence ? 'rounded-3xl rounded-tl-md' : 'rounded-3xl rounded-tl-sm'}`
                    }
                  `}>
                    {msg.type === 'text' && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {isMe ? msg.content : renderContentWithMentions(msg.content)}
                      </p>
                    )}
                    
                    {msg.type === 'image' && (
                      <div className="cursor-pointer -mx-1 -my-1" onClick={() => setFullImage(msg.mediaUrl || null)}>
                         <img src={msg.mediaUrl || ''} alt="attachment" className="max-w-full max-h-72 object-cover rounded-2xl" />
                      </div>
                    )}

                    {msg.type === 'file' && (
                      <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl border border-black/5">
                          <FileIcon size={20}/><a href={msg.mediaUrl || '#'} target="_blank" className="text-xs underline font-black truncate max-w-[150px]">{msg.fileName}</a>
                      </div>
                    )}

                    {msg.type === 'audio' && (
                      <div className="flex items-center gap-3 min-w-[140px]">
                          <button onClick={() => playAudio(msg.id)} className={`p-2 rounded-full ${isMe ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {playingAudioId === msg.id ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                          </button>
                          <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                             {playingAudioId === msg.id && <div className={`h-full ${isMe ? 'bg-white' : 'bg-indigo-600'} w-full animate-[progress_10s_linear]`}></div>}
                          </div>
                          <audio ref={el => { if(el) audioRefs.current[msg.id] = el }} src={msg.mediaUrl || ''} onEnded={() => setPlayingAudioId(null)} />
                      </div>
                    )}

                    <div className="flex justify-end items-center gap-1 mt-1 opacity-70">
                       <span className={`text-[9px] font-bold ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                         {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>

                    {/* Quick Actions Hover */}
                    <button 
                        onClick={() => setReplyingTo(msg)}
                        className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-right-8'} p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all`}
                        title="Reply"
                    >
                        <Reply size={14} />
                    </button>
                  </div>

                  {msg.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Array.from(new Set(msg.reactions.map(r => r.emoji))).map((emoji: any) => (
                              <button key={emoji} onClick={() => toggleReaction(msg, emoji)} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white shadow-sm border border-slate-100 hover:scale-110 transition-transform">
                                  {emoji} <span className="font-bold text-slate-500">{msg.reactions.filter(r => r.emoji === emoji).length}</span>
                              </button>
                          ))}
                      </div>
                  )}

                  {/* Reaction Picker on Hover */}
                  <div className={`absolute -top-8 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none group-hover:pointer-events-auto`}>
                       <div className="bg-white border shadow-lg rounded-full p-1 flex items-center gap-0.5 scale-90">
                          {['👍', '❤️', '😂', '😮'].map(e => <button key={e} onClick={() => toggleReaction(msg, e)} className="p-1.5 hover:scale-125 transition-transform">{e}</button>)}
                          {(isMe || isDev) && <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>}
                       </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && !isBotTyping && (
           <div className="flex gap-2 items-center px-4 py-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex space-x-1">
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{typingText}</span>
           </div>
        )}

        {isBotTyping && (
           <div className="flex gap-3 animate-pulse items-end px-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg">
                <Bot size={16} />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-violet-100 shadow-sm flex items-center gap-2">
                 <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></div>
                 </div>
                 <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Thinking...</span>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll To Bottom Button */}
      {showScrollButton && (
        <button 
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-6 bg-white text-indigo-600 p-2 rounded-full shadow-lg border border-indigo-100 hover:scale-110 transition-transform z-30 animate-in fade-in"
        >
          <ArrowDown size={20} />
        </button>
      )}

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 relative z-30 pb-safe">
        
        {/* Mention Popup */}
        {showMentionPopup && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 bg-white border border-slate-100 shadow-xl rounded-2xl w-64 max-h-48 overflow-y-auto animate-in slide-in-from-bottom-2 z-50">
             <div className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 sticky top-0">Mention Member</div>
             {filteredUsers.map(u => (
               <button 
                 key={u.id}
                 onClick={() => insertMention(u.name)}
                 className="w-full flex items-center gap-3 p-2.5 hover:bg-indigo-50 transition-colors text-left"
               >
                 <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                   {u.name.charAt(0)}
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-800">{u.name}</p>
                   <p className="text-[9px] text-slate-400">{u.role}</p>
                 </div>
               </button>
             ))}
          </div>
        )}

        {/* Reply Context */}
        {replyingTo && (
           <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl mb-2 border-l-4 border-indigo-500 animate-in slide-in-from-bottom-2">
             <div className="overflow-hidden">
                <p className="text-[10px] font-black text-indigo-600 uppercase mb-0.5">Replying to {getUserInfo(replyingTo.userId).name}</p>
                <p className="text-xs text-slate-600 truncate">{replyingTo.content}</p>
             </div>
             <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={14}/></button>
           </div>
        )}

        {/* Emoji Picker */}
        {emojiPickerOpen && (
          <div className="absolute bottom-full left-4 mb-2 bg-white border shadow-2xl rounded-2xl p-3 w-72 h-64 overflow-y-auto z-40 animate-in slide-in-from-bottom-4">
             <div className="grid grid-cols-6 gap-1">
                {EMOJIS.map(e => <button key={e} onClick={() => { setInputText(prev => prev + e); }} className="p-2 text-xl hover:bg-slate-50 rounded-lg">{e}</button>)}
             </div>
          </div>
        )}

        {/* File Preview */}
        {attachment && (
            <div className="absolute bottom-full left-4 right-4 mb-2 p-3 bg-white rounded-2xl border shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">{attachment.type.startsWith('image/') ? <ImageIcon size={16}/> : <FileIcon size={16}/>}</div>
                <p className="text-xs font-black flex-1 truncate">{attachment.name}</p>
                <button onClick={() => setAttachment(null)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg"><X size={16}/></button>
            </div>
        )}

        <div className="flex items-end gap-2">
            {isRecording ? (
                <div className="flex-1 h-12 bg-rose-50 rounded-[1.5rem] flex items-center justify-between px-4 border border-rose-100 animate-pulse">
                    <div className="flex items-center gap-2 text-rose-600">
                        <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></div>
                        <span className="font-black text-xs uppercase tracking-widest">REC {new Date(recordingTime * 1000).toISOString().substr(14, 5)}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={cancelRecording} className="px-3 py-1 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                        <button onClick={stopAndSendAudio} className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-200">Send</button>
                    </div>
                </div>
            ) : (
                <>
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"><Paperclip size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}/>
                    
                    <div className="flex-1 bg-slate-100 border border-transparent focus-within:bg-white focus-within:border-indigo-200 rounded-[1.5rem] flex items-center px-4 py-2 transition-all">
                        <textarea 
                            value={inputText}
                            onChange={handleInputChange}
                            placeholder={t('chat_placeholder')}
                            className="w-full bg-transparent outline-none text-sm font-medium resize-none py-1.5 text-slate-800 placeholder:text-slate-400"
                            rows={1}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        />
                        <button onClick={() => setEmojiPickerOpen(!emojiPickerOpen)} className={`ml-2 transition-colors ${emojiPickerOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-amber-500'}`}><Smile size={20}/></button>
                    </div>

                    {inputText || attachment ? (
                        <button onClick={handleSendMessage} disabled={isSending} className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                            <Send size={18} className={lang === 'ar' ? 'rtl-flip' : ''} />
                        </button>
                    ) : (
                        <button onClick={startRecording} className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95">
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
