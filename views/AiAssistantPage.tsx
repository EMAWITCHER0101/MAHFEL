
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Podcast, Video, Post, PublishedBook, Author } from '../types';
import { aiAssistant, smartSearch, summarizePodcast, summarizeVideo, summarizeBook } from '../services/ai';

interface AiAssistantPageProps {
  podcasts: Podcast[];
  videos: Video[];
  posts: Post[];
  books: PublishedBook[];
  authors: Author[];
  onPlayPodcast: (podcast: Podcast, episodeIndex: number) => void;
  onPlayVideo: (video: Video) => void;
  onShowBook: (book: PublishedBook) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  copied?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface SelectedContext {
  type: 'podcast' | 'video' | 'book';
  id: string;
  title: string;
  cover?: string;
  description?: string;
  details?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `سلام! 👋 من **محفل AI** هستم، دستیار هوشمند پادکست، کتاب و ویدیو.

میتونم:

🎙️ **جستجو** پادکست‌ها و ویدیوها و کتاب‌ها
📋 **خلاصه‌سازی** هر محتوایی
🔍 **پاسخ** به سوالاتت درباره محتوا
💡 **پیشنهاد** محتوای مناسب

یکی از گزینه‌های زیر رو انتخاب کن یا هر سوالی داری بپرس:`,
  timestamp: Date.now()
};

const QUICK_ACTIONS = [
  { icon: 'fa-list-ul', label: 'پادکست‌ها', query: 'لیست پادکست‌های موجود رو با توضیح کوتاه بگو', color: '#8b5cf6' },
  { icon: 'fa-video', label: 'ویدیوها', query: 'ویدیوهای موجود رو لیست کن', color: '#ec4899' },
  { icon: 'fa-book', label: 'کتاب‌ها', query: 'کتاب‌های موجود رو معرفی کن', color: '#f59e0b' },
  { icon: 'fa-lightbulb', label: 'پیشنهاد', query: 'بر اساس محتوای موجود بهترین‌ها رو پیشنهاد بده', color: '#10b981' },
];

const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ podcasts, videos, posts, books, authors, onPlayPodcast, onPlayVideo, onShowBook }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const updateMessages = useCallback((sessionId: string, updater: (msgs: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, messages: updater(s.messages) } : s
    ));
  }, []);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'گفتگوی جدید',
      messages: [WELCOME_MESSAGE],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSelectedContext(null);
    setShowSidebar(false);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const next = sessions.find(s => s.id !== id);
      setActiveSessionId(next?.id || null);
      setSelectedContext(null);
    }
  };

  const handleSelectItem = (ctx: SelectedContext) => {
    setSelectedContext(ctx);
    const typeLabel = ctx.type === 'podcast' ? '🎙️ پادکست' : ctx.type === 'video' ? '📹 ویدیو' : '📚 کتاب';
    const confirmMsg: Message = {
      id: generateId(),
      role: 'user',
      content: `میخوام درباره ${typeLabel} "${ctx.title}" صحبت کنم`,
      timestamp: Date.now()
    };

    let sessionId = activeSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: ctx.title,
        messages: [WELCOME_MESSAGE, confirmMsg],
        createdAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      sessionId = newSession.id;
      setActiveSessionId(sessionId);
    } else {
      updateMessages(sessionId, prev => [...prev, confirmMsg]);
    }

    setLoading(true);
    const contextInfo = `کاربر میخواد درباره "${ctx.title}" صحبت کنه. اطلاعات کامل:\n${ctx.details || ctx.description || 'بدون توضیح'}`;

    aiAssistant(`کاربر "${ctx.title}" رو انتخاب کرده و میخواد دربارش صحبت کنه. لطفاً معرفی کوتاهی بکن و بگو چطور میتونی کمکش کنی.\n\n${contextInfo}`, { podcasts, videos, posts, books, authors })
      .then(response => {
        updateMessages(sessionId!, prev => [...prev, { id: generateId(), role: 'assistant', content: response, timestamp: Date.now() }]);
      })
      .catch((e: any) => {
        updateMessages(sessionId!, prev => [...prev, { id: generateId(), role: 'assistant', content: `❌ خطا: ${e.message}`, timestamp: Date.now() }]);
      })
      .finally(() => setLoading(false));
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: msg.slice(0, 30) + (msg.length > 30 ? '...' : ''),
        messages: [WELCOME_MESSAGE],
        createdAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      sessionId = newSession.id;
      setActiveSessionId(sessionId);
    }

    setInput('');
    const userMsg: Message = { id: generateId(), role: 'user', content: msg, timestamp: Date.now() };
    updateMessages(sessionId, prev => [...prev, userMsg]);
    setLoading(true);

    try {
      let finalMsg = msg;
      if (selectedContext) {
        finalMsg = `[در حال صحبت درباره ${selectedContext.type === 'podcast' ? 'پادکست' : selectedContext.type === 'video' ? 'ویدیو' : 'کتاب'} "${selectedContext.title}"]\n\n${msg}`;
      }

      let response: string;
      if (msg.includes('جستجو') || msg.includes('سرچ') || msg.includes('پیدا کن') || msg.includes('جستجوی')) {
        response = await smartSearch(msg, { podcasts, videos, posts, books });
      } else if (msg.includes('خلاصه') || msg.includes(' summary')) {
        const podcastMatch = podcasts.find(p => msg.includes(p.title));
        const videoMatch = videos.find(v => msg.includes(v.title));
        const bookMatch = books.find(b => msg.includes(b.title));
        if (podcastMatch) response = await summarizePodcast(podcastMatch);
        else if (videoMatch) response = await summarizeVideo(videoMatch);
        else if (bookMatch) response = await summarizeBook(bookMatch);
        else response = await aiAssistant(finalMsg, { podcasts, videos, posts, books, authors });
      } else {
        response = await aiAssistant(finalMsg, { podcasts, videos, posts, books, authors });
      }

      updateMessages(sessionId, prev => [...prev, { id: generateId(), role: 'assistant', content: response, timestamp: Date.now() }]);
    } catch (e: any) {
      updateMessages(sessionId, prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `❌ **خطا در ارتباط با هوش مصنوعی**\n\nمشکلی پیش اومد: ${e.message}\n\n**راه‌حل‌ها:**\n- اتصال اینترنت رو چک کن\n- VPN خاموش کن\n- دوباره تلاش کن`,
        timestamp: Date.now()
      }]);
    }
    setLoading(false);
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setSessions(prev => prev.map(s => ({
      ...s,
      messages: s.messages.map(m => m.id === id ? { ...m, copied: true } : m)
    })));
    setTimeout(() => {
      setSessions(prev => prev.map(s => ({
        ...s,
        messages: s.messages.map(m => m.id === id ? { ...m, copied: false } : m)
      })));
    }, 2000);
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent = '';

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${i}`} className="bg-gray-900 text-gray-100 rounded-xl p-3 my-2 text-[11px] overflow-x-auto font-mono" dir="ltr">
              <code>{codeContent.trim()}</code>
            </pre>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }
      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      if (line.trim() === '') {
        elements.push(<br key={i} />);
        return;
      }

      const podcastMatch = line.match(/\[PODCAST:([^\]]+)\]/);
      const episodeMatch = line.match(/\[EPISODE:([^\]]+):(\d+)\]/);
      const videoMatch = line.match(/\[VIDEO:([^\]]+)\]/);
      const bookMatch = line.match(/\[BOOK:([^\]]+)\]/);

      if (episodeMatch) {
        const podcastId = episodeMatch[1];
        const epIdx = parseInt(episodeMatch[2]) - 1;
        const podcast = podcasts.find(p => String(p.id || (p as any)._id) === podcastId);
        const episode = podcast?.episodes[epIdx];
        if (podcast && episode) {
          const epDetails = `پادکست: ${podcast.title}\nجلسه ${epIdx + 1}: ${episode.title}\nتوضیحات جلسه: ${episode.description || 'ندارد'}\nمدت: ${episode.duration || 'نامشخص'}\n\nتوضیحات کلی پادکست: ${podcast.description || 'ندارد'}`;
          elements.push(
            <div key={`btn-ep-${i}`} className="flex items-center gap-1.5 my-1.5 p-2 rounded-xl" style={{ background: isDark ? '#2a1f3d' : '#f5f3ff', border: `1px solid ${isDark ? '#3b2d5c' : '#e0d4f5'}` }}>
              <img src={podcast.cover} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] opacity-60 truncate" style={{ color: isDark ? '#c4b5fd' : '#7c3aed' }}>{podcast.title}</p>
                <p className="text-[11px] font-black truncate" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{episode.title}</p>
                <p className="text-[8px] opacity-50">{episode.duration || 'نامشخص'}</p>
              </div>
              <button onClick={() => handleSelectItem({ type: 'podcast', id: String(podcast.id || (podcast as any)._id), title: podcast.title, cover: podcast.cover, description: podcast.description, details: epDetails })}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#8b5cf6', color: 'white' }}>
                انتخاب
              </button>
              <button onClick={() => { handleSelectItem({ type: 'podcast', id: String(podcast.id || (podcast as any)._id), title: podcast.title, cover: podcast.cover, description: podcast.description, details: epDetails }); onPlayPodcast(podcast, epIdx); }}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#6366f1', color: 'white' }}>
                <i className="fas fa-play ml-0.5"></i> پخش
              </button>
            </div>
          );
        }
        return;
      }

      if (podcastMatch) {
        const podcastId = podcastMatch[1];
        const podcast = podcasts.find(p => String(p.id || (p as any)._id) === podcastId);
        if (podcast) {
          const pDetails = `پادکست: ${podcast.title}\nتعداد جلسات: ${podcast.episodes.length}\nتوضیحات: ${podcast.description || 'ندارد'}\nجلسات:\n${podcast.episodes.map((e, j) => `${j + 1}. ${e.title} - ${e.description || ''}`).join('\n')}`;
          elements.push(
            <div key={`btn-p-${i}`} className="flex items-center gap-1.5 my-2 p-2 rounded-xl" style={{ background: isDark ? '#1e1b4b' : '#eef2ff', border: `1px solid ${isDark ? '#312e81' : '#c7d2fe'}` }}>
              <img src={podcast.cover} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black truncate" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{podcast.title}</p>
                <p className="text-[9px] opacity-70">{podcast.episodes.length} جلسه</p>
              </div>
              <button onClick={() => handleSelectItem({ type: 'podcast', id: String(podcast.id || (podcast as any)._id), title: podcast.title, cover: podcast.cover, description: podcast.description, details: pDetails })}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#8b5cf6', color: 'white' }}>
                انتخاب
              </button>
              <button onClick={() => onPlayPodcast(podcast, 0)}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#6366f1', color: 'white' }}>
                <i className="fas fa-play ml-0.5"></i> پخش
              </button>
            </div>
          );
        }
        return;
      }

      if (videoMatch) {
        const videoId = videoMatch[1];
        const video = videos.find(v => String(v.id || (v as any)._id) === videoId);
        if (video) {
          const vDetails = `ویدیو: ${video.title}\nتوضیحات: ${video.description || 'ندارد'}\nمدت: ${video.duration || 'نامشخص'}`;
          elements.push(
            <div key={`btn-v-${i}`} className="flex items-center gap-1.5 my-2 p-2 rounded-xl" style={{ background: isDark ? '#3b1a2e' : '#fdf2f8', border: `1px solid ${isDark ? '#6b2150' : '#fbcfe8'}` }}>
              <img src={video.thumbnailUrl} className="w-12 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black truncate" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{video.title}</p>
                <p className="text-[9px] opacity-70">{video.duration || 'ویدیو'}</p>
              </div>
              <button onClick={() => handleSelectItem({ type: 'video', id: String(video.id || (video as any)._id), title: video.title, cover: video.thumbnailUrl, description: video.description, details: vDetails })}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#ec4899', color: 'white' }}>
                انتخاب
              </button>
              <button onClick={() => onPlayVideo(video)}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#f43f5e', color: 'white' }}>
                <i className="fas fa-play ml-0.5"></i> پخش
              </button>
            </div>
          );
        }
        return;
      }

      if (bookMatch) {
        const bookId = bookMatch[1];
        const book = books.find(b => String(b.id || (b as any)._id) === bookId);
        if (book) {
          const bDetails = `کتاب: ${book.title}\nنویسنده: ${book.author || 'ناشناس'}\nتوضیحات: ${book.description || 'ندارد'}`;
          elements.push(
            <div key={`btn-b-${i}`} className="flex items-center gap-1.5 my-2 p-2 rounded-xl" style={{ background: isDark ? '#422006' : '#fffbeb', border: `1px solid ${isDark ? '#78350f' : '#fde68a'}` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                <i className="fas fa-book text-white text-sm"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black truncate" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{book.title}</p>
                <p className="text-[9px] opacity-70">{book.author || 'کتاب'}</p>
              </div>
              <button onClick={() => handleSelectItem({ type: 'book', id: String(book.id || (book as any)._id), title: book.title, description: book.description, details: bDetails })}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#f59e0b', color: 'white' }}>
                انتخاب
              </button>
              <button onClick={() => onShowBook(book)}
                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95" style={{ background: '#f97316', color: 'white' }}>
                <i className="fas fa-book-open ml-0.5"></i> باز
              </button>
            </div>
          );
        }
        return;
      }

      let processed = line;
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-lg text-[11px] font-mono" style="background:var(--primary);color:white;opacity:0.9">$1</code>');

      if (line.match(/^\s*[-•]\s/)) {
        processed = processed.replace(/^(\s*[-•]\s)/, '');
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1 mr-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
            <span className="text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        );
        return;
      }

      if (line.match(/^\s*\d+\.\s/)) {
        const num = line.match(/^\s*(\d+)\.\s/)?.[1];
        processed = processed.replace(/^\s*\d+\.\s/, '');
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1 mr-2">
            <span className="text-[11px] font-black mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }}>{num}.</span>
            <span className="text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        );
        return;
      }

      if (line.startsWith('### ') || line.startsWith('## ')) {
        elements.push(
          <p key={i} className="text-[13px] font-black mt-3 mb-1" dangerouslySetInnerHTML={{ __html: processed.replace(/^#+\s/, '') }} />
        );
        return;
      }

      elements.push(
        <p key={i} className="text-[12px] leading-relaxed my-0.5" dangerouslySetInnerHTML={{ __html: processed }} />
      );
    });

    return elements;
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <div className="flex h-dvh relative overflow-hidden" style={{ background: 'var(--surface)' }}>

      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-[100] lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <div className={`
        fixed lg:relative inset-y-0 right-0 z-[101]
        w-72 lg:w-72 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        flex flex-col
      `} style={{ background: isDark ? '#171717' : '#f9fafb', borderLeft: `1px solid ${isDark ? '#262626' : '#e5e7eb'}` }}>

        <div className="p-3">
          <button onClick={createNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
            style={{ border: `1px solid ${isDark ? '#404040' : '#d1d5db'}`, color: isDark ? '#e5e7eb' : '#374151', background: isDark ? '#262626' : 'white' }}>
            <i className="fas fa-plus text-[10px]"></i>
            گفتگوی جدید
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {sessions.map(session => (
            <div key={session.id} onClick={() => { setActiveSessionId(session.id); setSelectedContext(null); setShowSidebar(false); }}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-[11px] font-medium ${
                session.id === activeSessionId
                  ? (isDark ? 'bg-[#2f2f2f]' : 'bg-white shadow-sm')
                  : (isDark ? 'hover:bg-[#212121]' : 'hover:bg-gray-100')
              }`} style={{ color: isDark ? '#d1d5db' : '#374151' }}>
              <i className="fas fa-message text-[9px] opacity-40"></i>
              <span className="flex-1 truncate">{session.title}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10">
                <i className="fas fa-trash text-[8px] text-red-400"></i>
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-8 opacity-40">
              <i className="fas fa-comments text-2xl mb-2 block"></i>
              <p className="text-[10px] font-bold">گفتگویی وجود ندارد</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t" style={{ borderColor: isDark ? '#262626' : '#e5e7eb' }}>
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-[10px]`}></i>
            {isDark ? 'حالت روشن' : 'حالت تاریک'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">

        <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${isDark ? '#262626' : '#e5e7eb'}` }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ color: isDark ? '#d1d5db' : '#374151' }}>
              <i className="fas fa-bars text-sm"></i>
            </button>
            <button onClick={() => setShowSidebar(!showSidebar)}
              className="hidden lg:flex w-8 h-8 rounded-xl items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: isDark ? '#d1d5db' : '#6b7280' }}>
              <i className="fas fa-bars-staggered text-sm"></i>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                <i className="fas fa-robot text-white text-[10px]"></i>
              </div>
              <span className="text-[13px] font-black" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>محفل AI</span>
            </div>
          </div>
          <button onClick={createNewChat}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: isDark ? '#d1d5db' : '#6b7280' }}>
            <i className="fas fa-pen-to-square text-sm"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 || (!activeSession && messages.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full px-4 pb-20">
              <div className="w-14 h-14 rounded-3xl flex items-center justify-center mb-2 shadow-xl"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                <i className="fas fa-robot text-white text-2xl"></i>
              </div>
              <h2 className="text-lg font-black mb-0.5" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>محفل AI</h2>
              <p className="text-[10px] font-medium mb-3 text-center" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                دستیار هوشمند پادکست، کتاب و ویدیو
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {QUICK_ACTIONS.map((action, i) => (
                  <button key={i} onClick={() => handleSend(action.query)}
                    className="p-2.5 rounded-2xl text-right transition-all active:scale-95 hover:shadow-md"
                    style={{
                      background: isDark ? '#1f1f1f' : 'white',
                      border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                    }}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5"
                      style={{ background: action.color + '15' }}>
                      <i className={`fas ${action.icon} text-[10px]`} style={{ color: action.color }}></i>
                    </div>
                    <span className="text-[9px] font-bold block" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-6">
              {selectedContext && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mx-4"
                  style={{ background: isDark ? '#1f1f1f' : '#f3f4f6', border: `1px solid ${isDark ? '#333' : '#e5e7eb'}` }}>
                  {selectedContext.cover && <img src={selectedContext.cover} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                  {!selectedContext.cover && (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                      <i className="fas fa-book text-white text-[10px]"></i>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-[10px] font-bold" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {selectedContext.type === 'podcast' ? '🎙️ پادکست' : selectedContext.type === 'video' ? '📹 ویدیو' : '📚 کتاب'} انتخاب شده
                    </p>
                    <p className="text-[11px] font-black" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{selectedContext.title}</p>
                  </div>
                  <button onClick={() => {
                    if (selectedContext.type === 'podcast') {
                      const p = podcasts.find(pp => String(pp.id || (pp as any)._id) === selectedContext.id);
                      if (p) onPlayPodcast(p, 0);
                    } else if (selectedContext.type === 'video') {
                      const v = videos.find(vv => String(vv.id || (vv as any)._id) === selectedContext.id);
                      if (v) onPlayVideo(v);
                    } else {
                      const b = books.find(bb => String(bb.id || (bb as any)._id) === selectedContext.id);
                      if (b) onShowBook(b);
                    }
                  }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)', color: 'white' }}>
                    <i className="fas fa-play text-[10px]"></i>
                  </button>
                  <button onClick={() => setSelectedContext(null)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ color: isDark ? '#666' : '#9ca3af' }}>
                    <i className="fas fa-times text-[10px]"></i>
                  </button>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="group">
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] lg:max-w-[70%] rounded-2xl rounded-br-md px-4 py-3"
                        style={{ background: isDark ? '#2f2f2f' : '#f3f4f6' }}>
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{msg.content}</p>
                        <div className="flex items-center justify-end gap-2 mt-1.5">
                          <span className="text-[9px] opacity-40" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                        <i className="fas fa-robot text-white text-[9px]"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] leading-relaxed" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>
                          {renderMarkdown(msg.content)}
                        </div>
                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] opacity-40" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{formatTime(msg.timestamp)}</span>
                          <button onClick={() => copyMessage(msg.content, msg.id)}
                            className="px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                            <i className={`fas ${msg.copied ? 'fa-check text-green-500' : 'fa-copy'} ml-1`}></i>
                            {msg.copied ? 'کپی شد' : 'کپی'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                    <i className="fas fa-robot text-white text-[9px]"></i>
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-20 lg:h-4" />
            </div>
          )}
        </div>

        <div className="px-3 pb-3 pt-1 flex-shrink-0 fixed bottom-16 left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto z-40" style={{ background: isDark ? '#171717' : 'white' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl px-3 py-2 transition-all"
              style={{
                border: `1.5px solid ${inputFocused ? '#14b8a6' : (isDark ? '#404040' : '#d1d5db')}`,
                background: isDark ? '#1f1f1f' : 'white',
              }}>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={selectedContext ? `درباره "${selectedContext.title}" دستور بده...` : "دستور ات رو بنویس..."}
                rows={1}
                className="flex-1 bg-transparent text-[13px] font-medium resize-none py-1.5 max-h-[120px]"
                style={{ color: isDark ? '#e5e7eb' : '#1f2937', direction: 'rtl', border: 'none', outline: 'none', boxShadow: 'none', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }} />
              <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30"
                style={{
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : (isDark ? '#333' : '#e5e7eb'),
                  color: input.trim() && !loading ? 'white' : (isDark ? '#666' : '#9ca3af')
                }}>
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-arrow-up'} text-sm`}></i>
              </button>
            </div>
            <p className="text-center text-[8px] mt-1.5 font-medium" style={{ color: isDark ? '#525252' : '#9ca3af' }}>
              محفل AI ممکنه اشتباه کنه. اطلاعات مهم رو تایید کنید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
