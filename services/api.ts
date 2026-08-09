
import type { Podcast, Comment, Video, Post, Book, Author, PublishedBook, User } from '../types';

export const getApiBase = (): string => {
  const saved = localStorage.getItem('mahfel_server_url');
  if (saved) return saved;
  return '/api';
};

const API_BASE = getApiBase();

const getToken = (): string | null => localStorage.getItem('soha_token');

const headers = (includeAuth = true): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
};

const apiFetch = async <T>(endpoint: string, options?: RequestInit): Promise<T | null> => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers(), ...options?.headers },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'خطای سرور' }));
      if (err.banned) return { error: err.error, banned: true } as any;
      if (err.warnings) return { error: err.error, warnings: err.warnings } as any;
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return null;
  }
};

// --- Auth ---
export const register = async (name: string, email: string, password: string, phoneNumber: string): Promise<any> => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phoneNumber }),
  });
};

export const login = async (email: string, phoneNumber: string, password: string): Promise<any> => {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email || undefined, phoneNumber: phoneNumber || undefined, password }),
  });
};

export const sendOtp = async (phoneNumber: string): Promise<any> => {
  return apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
};

export const verifyOtp = async (phoneNumber: string, otp: string): Promise<any> => {
  return apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, otp }),
  });
};

export const completeProfile = async (data: { name?: string; avatar?: string; role?: string; securityKey?: string }): Promise<any> => {
  return apiFetch('/auth/complete-profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMe = async (): Promise<any> => {
  return apiFetch('/auth/me');
};

export const updateInterests = async (interests: string[]): Promise<any> => {
  return apiFetch('/auth/interests', {
    method: 'POST',
    body: JSON.stringify({ interests }),
  });
};

export const updateLibrary = async (library: any): Promise<any> => {
  return apiFetch('/auth/library', {
    method: 'PUT',
    body: JSON.stringify(library),
  });
};

export const updateProfile = async (data: { name?: string; avatar?: string }): Promise<any> => {
  return apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// --- Podcasts ---
export const getPodcasts = async (): Promise<Podcast[]> => {
  const data = await apiFetch<any[]>('/podcasts');
  if (!data) return [];
  return data.map((p: any) => ({
    ...p,
    id: p._id || p.id,
    speakerId: typeof p.speakerId === 'object' ? p.speakerId._id || p.speakerId.id : p.speakerId,
    episodes: (p.episodes || []).map((e: any) => ({
      ...e,
      id: e._id,
    })),
  }));
};

export const getPodcast = async (id: string): Promise<Podcast | null> => {
  const data = await apiFetch<any>(`/podcasts/${id}`);
  if (!data) return null;
  return {
    ...data,
    id: data._id || data.id,
    speakerId: typeof data.speakerId === 'object' ? data.speakerId._id || data.speakerId.id : data.speakerId,
  };
};

const sessionPlayed = new Set<string>();
const sessionViewed = new Set<string>();

export const recordPodcastPlay = async (podcastId: string, episodeIndex: number = 0): Promise<void> => {
  if (!podcastId) return;
  if (sessionPlayed.has(podcastId)) return;
  sessionPlayed.add(podcastId);
  try {
    await fetch(`${getApiBase()}/podcasts/${podcastId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episodeIndex }),
    });
  } catch (e) { /* non-blocking analytics */ }
};

export const recordVideoView = async (videoId: string): Promise<void> => {
  if (!videoId) return;
  if (sessionViewed.has(videoId)) return;
  sessionViewed.add(videoId);
  try {
    await fetch(`${getApiBase()}/videos/${videoId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) { /* non-blocking analytics */ }
};

export const getAICorpus = async (): Promise<any> => {
  return apiFetch('/ai/corpus');
};

// --- Books ---
export const getBooks = async (): Promise<Book[]> => {
  const data = await apiFetch<any[]>('/books');
  if (!data) return [];
  return data.map((b: any) => ({
    ...b,
    id: b._id || b.id,
    authorId: typeof b.authorId === 'object' ? b.authorId._id || b.authorId.id : b.authorId,
  }));
};

// --- Authors ---
export const getAuthors = async (): Promise<Author[]> => {
  const data = await apiFetch<any[]>('/authors');
  if (!data) return [];
  return data.map((a: any) => ({ ...a, id: a._id || a.id }));
};

// --- Videos ---
export const getVideos = async (): Promise<Video[]> => {
  const data = await apiFetch<any[]>('/videos');
  if (!data) return [];
  return data.map((v: any) => ({ ...v, id: v._id || v.id }));
};

export type VideoPlaylist = { id: string; name: string; slug: string; description: string; cover: string; count: number; order: number; visible?: boolean };

export const getVideoPlaylists = async (): Promise<VideoPlaylist[]> => {
  const data = await apiFetch<any[]>('/playlists');
  if (!data) return [];
  return data.map((p: any) => ({ id: p._id || p.id, name: p.name, slug: p.slug, description: p.description, cover: p.cover, count: p.count, order: p.order }));
};

export const getVideoPlaylist = async (slug: string): Promise<VideoPlaylist & { videos: Video[] } | null> => {
  const data = await apiFetch<any>(`/playlists/${encodeURIComponent(slug)}`);
  if (!data) return null;
  return {
    id: data._id || data.id, name: data.name, slug: data.slug, description: data.description,
    cover: data.cover, count: data.count, order: data.order,
    videos: (data.videos || []).map((v: any) => ({ ...v, id: v._id || v.id })),
  };
};

export const getAdminVideoPlaylists = async (): Promise<VideoPlaylist[]> => {
  const data = await apiFetch<any[]>('/playlists/admin/all');
  if (!data) return [];
  return data.map((p: any) => ({ id: p._id || p.id, name: p.name, slug: p.slug, description: p.description, cover: p.cover, count: p.count, order: p.order, visible: p.visible }));
};

export const createVideoPlaylist = async (input: { name: string; slug?: string; description?: string; cover?: string; videoIds?: string[]; order?: number; visible?: boolean }): Promise<any | null> => {
  return apiFetch('/playlists', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const updateVideoPlaylist = async (id: string, input: { name?: string; slug?: string; description?: string; cover?: string; videoIds?: string[]; order?: number; visible?: boolean; autoFill?: boolean }): Promise<any | null> => {
  return apiFetch(`/playlists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
};

export const deleteVideoPlaylist = async (id: string): Promise<boolean> => {
  const data = await apiFetch<any>(`/playlists/${id}`, { method: 'DELETE' });
  return !!data;
};

const streamCache = new Map<string, any>();

type StreamData = { defaultUrl: string; qualities: { profile: string; label: string; url: string; size: string }[] };

export const prefetchStream = (id: string) => {
  if (streamCache.has(id)) return;
  const promise = apiFetch<StreamData>(`/videos/${id}/stream`);
  streamCache.set(id, promise);
  promise.then(data => streamCache.set(id, data));
  promise.catch(() => streamCache.delete(id));
};

export const getVideoStream = async (id: string): Promise<StreamData | null> => {
  const cached = streamCache.get(id);
  if (cached) return cached;
  const promise = apiFetch<StreamData>(`/videos/${id}/stream`);
  streamCache.set(id, promise);
  promise.then(data => streamCache.set(id, data));
  promise.catch(() => streamCache.delete(id));
  return promise;
};

// --- Comments ---
export const getComments = async (filters?: { videoId?: string; type?: string }): Promise<Comment[]> => {
  const params = new URLSearchParams();
  if (filters?.videoId) params.set('videoId', filters.videoId);
  if (filters?.type) params.set('type', filters.type);
  const qs = params.toString();
  const data = await apiFetch<any[]>(`/comments${qs ? '?' + qs : ''}`);
  if (!data) return [];
  return data.map((c: any) => ({
    ...c,
    id: c._id || c.id,
    replies: (c.replies || []).map((r: any) => ({ ...r, id: r._id || r.id })),
  }));
};

export const addComment = async (comment: Partial<Comment>): Promise<Comment | null> => {
  return apiFetch<Comment>('/comments', {
    method: 'POST',
    body: JSON.stringify(comment),
  });
};

export const deleteComment = async (id: string): Promise<boolean> => {
  const res = await apiFetch<any>(`/comments/${id}`, { method: 'DELETE' });
  return !!res;
};

export const updateComment = async (id: string, text: string): Promise<string | null> => {
  const res = await apiFetch<any>(`/comments/${id}`, { method: 'PUT', body: JSON.stringify({ text }) });
  return res?.text ?? null;
};

export const deletePostComment = async (postId: string, commentId: string): Promise<boolean> => {
  const res = await apiFetch<any>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
  return !!res;
};

export const likeComment = async (id: string): Promise<number | null> => {
  const res = await apiFetch<any>(`/comments/${id}/like`, { method: 'POST' });
  return res?.likes ?? null;
};

export const likeVideo = async (id: string): Promise<number | null> => {
  const res = await apiFetch<any>(`/videos/${id}/like`, { method: 'POST' });
  return res?.likes ?? null;
};

export const likePodcast = async (id: string): Promise<number | null> => {
  const res = await apiFetch<any>(`/podcasts/${id}/like`, { method: 'POST' });
  return res?.likes ?? null;
};

// --- Posts ---
export const getPosts = async (): Promise<Post[]> => {
  const data = await apiFetch<any[]>('/posts');
  if (!data) return [];
  return data.map((p: any) => ({
    ...p,
    id: p._id || p.id,
    comments: (p.comments || []).map((c: any) => ({ ...c, id: c._id || c.id })),
  }));
};

export const createPost = async (post: Partial<Post>): Promise<Post | null> => {
  const data = await apiFetch<any>('/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
  if (!data) return null;
  return { ...data, id: data._id || data.id, comments: (data.comments || []).map((c: any) => ({ ...c, id: c._id || c.id })) };
};

export const shareToMahfel = async (type: 'video' | 'podcast' | 'book', id: string, text?: string, episodeIndex?: number): Promise<Post | null> => {
  const payload: any = { text: text || '', media: [] };
  if (type === 'video') payload.videoId = id;
  else if (type === 'podcast') { payload.podcastId = id; if (episodeIndex != null) payload.episodeIndex = episodeIndex; }
  else if (type === 'book') payload.bookId = id;
  return createPost(payload);
};

export const deletePost = async (id: string): Promise<boolean> => {
  const res = await apiFetch<any>(`/posts/${id}`, { method: 'DELETE' });
  return !!res;
};

export const updatePost = async (id: string, data: Partial<Post>): Promise<Post | null> => {
  const res = await apiFetch<any>(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res) return null;
  return { ...res, id: res._id || res.id, comments: (res.comments || []).map((c: any) => ({ ...c, id: c._id || c.id })) };
};

export const updatePostComment = async (postId: string, commentId: string, data: { text?: string; media?: { type: string; url: string }[] }): Promise<Post | null> => {
  const res = await apiFetch<any>(`/posts/${postId}/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res) return null;
  return { ...res, id: res._id || res.id, comments: (res.comments || []).map((c: any) => ({ ...c, id: c._id || c.id })) };
};

export const likePost = async (id: string): Promise<number | null> => {
  const res = await apiFetch<any>(`/posts/${id}/like`, { method: 'POST' });
  if (!res) return null;
  return typeof res.likes === 'number' ? res.likes : null;
};

export const addPostComment = async (postId: string, text: string, replyTo?: string, media?: { type: string; url: string }[], quotedText?: string, audioTimestamp?: number, videoTimestamp?: number): Promise<Post | null> => {
  const data = await apiFetch<any>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text, replyTo, media, quotedText, audioTimestamp, videoTimestamp }),
  });
  if (!data) return null;
  const comments = (data.comments || []).map((c: any) => ({ ...c, id: c._id || c.id }));
  if (audioTimestamp != null && comments.length > 0) {
    comments[comments.length - 1].audioTimestamp = audioTimestamp;
  }
  if (videoTimestamp != null && comments.length > 0) {
    comments[comments.length - 1].videoTimestamp = videoTimestamp;
  }
  return {
    ...data,
    id: data._id || data.id,
    comments,
  };
};

// --- Published Books ---
export const getPublishedBooks = async (): Promise<PublishedBook[]> => {
  const data = await apiFetch<any[]>('/published-books');
  if (!data) return [];
  return data.map((b: any) => ({
    ...b,
    id: b._id || b.id,
    relatedAudioIds: (b.relatedAudioIds || []).map((id: any) => typeof id === 'object' ? id._id || id.id : id),
  }));
};

const mapPublishedBook = (b: any): PublishedBook => ({
  ...b,
  id: b._id || b.id,
  relatedAudioIds: (b.relatedAudioIds || []).map((id: any) => typeof id === 'object' ? id._id || id.id : id),
});

// Author's own notes (drafts + published) — visible only to that author
export const getMyNotes = async (): Promise<PublishedBook[]> => {
  const data = await apiFetch<any[]>('/published-books/mine');
  if (!data) return [];
  return data.map(mapPublishedBook);
};

export const createPublishedBook = async (data: Partial<PublishedBook> & { isDraft?: boolean }): Promise<PublishedBook | null> => {
  const res = await apiFetch<any>('/published-books', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res) return null;
  return mapPublishedBook(res);
};

export const updatePublishedBook = async (id: string, data: Partial<PublishedBook> & { isDraft?: boolean }): Promise<PublishedBook | null> => {
  const res = await apiFetch<any>(`/published-books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res) return null;
  return mapPublishedBook(res);
};

export const deletePublishedBook = async (id: string): Promise<boolean> => {
  const res = await apiFetch<any>(`/published-books/${id}`, { method: 'DELETE' });
  return !!res;
};

// Public: get another author's published notes (public profile)
export const getAuthorNotes = async (authorId: string | undefined): Promise<PublishedBook[]> => {
  if (!authorId) return [];
  const data = await apiFetch<any[]>(`/published-books/author/${authorId}`);
  if (!data) return [];
  return data.map(mapPublishedBook);
};

// Admin: list all notes (incl. drafts)
export const adminGetNotes = async (params?: { search?: string; status?: string; authorName?: string; page?: number }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.authorName) qs.set('authorName', params.authorName);
  if (params?.page) qs.set('page', String(params.page));
  return apiFetch(`/admin/notes?${qs.toString()}`);
};

// Admin: create/update/delete any note
export const adminCreateNote = async (data: any): Promise<PublishedBook | null> => {
  const res = await apiFetch<any>('/admin/notes', { method: 'POST', body: JSON.stringify(data) });
  if (!res) return null;
  return mapPublishedBook(res);
};

export const adminUpdateNote = async (id: string, data: any): Promise<PublishedBook | null> => {
  const res = await apiFetch<any>(`/admin/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res) return null;
  return mapPublishedBook(res);
};

export const adminDeleteNote = async (id: string): Promise<boolean> => {
  const res = await apiFetch<any>(`/admin/notes/${id}`, { method: 'DELETE' });
  return !!res;
};

// Admin: authors management (role author/admin + note counts)
export const adminGetAuthors = async (): Promise<any[]> => {
  const res = await apiFetch<any[]>('/admin/authors');
  return res || [];
};

// --- File Upload (mock for now) ---
export const uploadFile = async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
  return new Promise((resolve) => {
    let pct = 0;
    const interval = setInterval(() => {
      pct += 25;
      if (onProgress) onProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        resolve(URL.createObjectURL(file));
      }
    }, 200);
  });
};

// --- Admin ---
export const getAdminStats = async (): Promise<any> => {
  return apiFetch('/admin/stats');
};

export const getAdminUsers = async (params?: { search?: string; role?: string; page?: number }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.role) qs.set('role', params.role);
  if (params?.page) qs.set('page', String(params.page));
  return apiFetch(`/admin/users?${qs.toString()}`);
};

export const updateUserRole = async (userId: string, role: string): Promise<any> => {
  return apiFetch(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
};

export const updateUser = async (userId: string, data: { name?: string; avatar?: string; role?: string }): Promise<any> => {
  return apiFetch(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteUser = async (userId: string): Promise<any> => {
  return apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
};

export const getAdminPosts = async (params?: { search?: string; page?: number }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  return apiFetch(`/admin/posts?${qs.toString()}`);
};

export const adminDeletePost = async (postId: string): Promise<any> => {
  return apiFetch(`/admin/posts/${postId}`, { method: 'DELETE' });
};

export const adminUpdatePost = async (postId: string, data: { text?: string; isPinned?: boolean }): Promise<any> => {
  return apiFetch(`/admin/posts/${postId}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const getAdminComments = async (params?: { type?: string; search?: string; page?: number }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  return apiFetch(`/admin/comments?${qs.toString()}`);
};

export const adminDeleteComment = async (commentId: string): Promise<any> => {
  return apiFetch(`/admin/comments/${commentId}`, { method: 'DELETE' });
};

export const adminUpdateComment = async (commentId: string, data: { text?: string; isFeatured?: boolean }): Promise<any> => {
  return apiFetch(`/admin/comments/${commentId}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const getAdminAnalytics = async (params?: { period?: string }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.period) qs.set('period', params.period);
  return apiFetch(`/admin/analytics?${qs.toString()}`);
};

export const getAdminAnalyticsSegments = async (params?: { period?: string }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.period) qs.set('period', params.period);
  return apiFetch(`/admin/analytics/segments?${qs.toString()}`);
};

export const getAdminInsights = async (params?: { period?: string }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.period) qs.set('period', params.period);
  return apiFetch(`/admin/insights?${qs.toString()}`);
};

export const getAdminActivity = async (params?: { limit?: number }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  return apiFetch(`/admin/activity?${qs.toString()}`);
};

export const adminExportData = async (type: string): Promise<any> => {
  const token = getToken();
  const response = await fetch(`${API_BASE}/admin/export?type=${type}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) return null;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-export.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

export const adminSearchGlobal = async (q: string): Promise<any> => {
  const qs = new URLSearchParams();
  qs.set('q', q);
  return apiFetch(`/admin/search?${qs.toString()}`);
};

export const adminBulkUsers = async (ids: string[], action: string, value?: string): Promise<any> => {
  return apiFetch('/admin/users/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids, action, value }),
  });
};

export const adminBulkPosts = async (ids: string[], action: string): Promise<any> => {
  return apiFetch('/admin/posts/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids, action }),
  });
};

export const adminBulkComments = async (ids: string[], action: string): Promise<any> => {
  return apiFetch('/admin/comments/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids, action }),
  });
};

// --- Admin Moderation ---
export const muteUser = async (userId: string, minutes?: number, reason?: string): Promise<any> => {
  return apiFetch(`/admin/users/${userId}/mute`, {
    method: 'POST',
    body: JSON.stringify({ minutes, reason }),
  });
};

export const unmuteUser = async (userId: string): Promise<any> => {
  return apiFetch(`/admin/users/${userId}/unmute`, { method: 'POST' });
};

export const unbanUser = async (userId: string): Promise<any> => {
  return apiFetch(`/admin/users/${userId}/unban`, { method: 'POST' });
};

export const resetUserWarnings = async (userId: string): Promise<any> => {
  return apiFetch(`/admin/users/${userId}/reset-warnings`, { method: 'POST' });
};

// --- Notifications ---
export const getNotifications = async (): Promise<any[] | null> => {
  return apiFetch<any[]>('/notifications');
};

export const adminSendNotification = async (title: string, body: string, target: string = 'all'): Promise<any> => {
  return apiFetch('/notifications', {
    method: 'POST',
    body: JSON.stringify({ title, body, target }),
  });
};

export const adminDeleteNotification = async (id: string): Promise<any> => {
  return apiFetch(`/notifications/${id}`, { method: 'DELETE' });
};

// --- Web Push ---
export const getPushPublicKey = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/push/vapid-public-key', { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.publicKey || null;
  } catch { return null; }
};

export const subscribeToPush = async (subscription: PushSubscription): Promise<boolean> => {
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    return res.ok;
  } catch { return false; }
};

export const unsubscribeFromPush = async (subscription: PushSubscription): Promise<boolean> => {
  try {
    const res = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    return res.ok;
  } catch { return false; }
};

// --- Save All (legacy compatibility) ---
export const saveAllData = async (data: any): Promise<void> => {
  console.warn('saveAllData is deprecated. Use individual API calls instead.');
};
