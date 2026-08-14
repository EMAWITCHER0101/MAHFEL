
export type UserRole = 'user' | 'author' | 'admin';

export interface User {
  id?: string;
  _id?: string;
  email?: string;
  phoneNumber: string;
  name: string;
  avatar: string; // Base64 or URL
  role: UserRole;
  interests: string[];
  warnings?: number;
  banned?: boolean;
  muted?: boolean;
  mutedUntil?: string | null;
  mutedReason?: string;
  library?: {
    podcasts: string[];
    episodes: { podcastId: string; episodeIndex: number }[];
    videos: string[];
    books: number[];
    notes: number[];
  };
}

export interface Episode {
  title: string;
  subtitle?: string; 
  description: string;
  duration: string;
  audioUrl: string;
  date: string; 
  isNew: boolean;
  cover?: string;
  relatedFileUrl?: string;
  viewCount: number;
  fullText?: string;
}

export interface Podcast {
  id: number;
  title: string;
  description: string;
  cover: string;
  speakerId: number; 
  authorId?: number; 
  duration: string;
  episodes: Episode[];
  year: number; 
  categories: string[];
  isSquare?: boolean;
  likes?: number;
  likedBy?: string[];
}

export interface Author {
  id: number;
  name: string;
  avatar: string;
  bio: string;
  role: 'master' | 'secretary';
  coverImage?: string;
}

export interface Book {
  id: number;
  title: string;
  authorId: number; 
  cover: string;
  relatedEpisodes: Array<{ podcastId: number; episodeIndex: number; }>;
  categories: string[];
  addedDate?: string;
  description?: string;
}

export interface Video {
  id: string;
  embedId: string;
  title:string;
  description: string;
  thumbnailUrl: string;
  viewCount: number;
  uploadDate: string;
  duration: number;
  categories: string[];
  likes?: number;
  fullText?: string;
  authorId?: string;
}

export interface Comment {
    id: number;
    _id?: string;
    type: 'podcast' | 'video' | 'book';
    author: string;
    authorAvatarUrl?: string;
    userId?: string;
    text: string;
    date: string;
    isoDate: string;
    likes: number;
    isFeatured: boolean;
    isEdited?: boolean;
    podcastId?: number;
    episodeIndex?: number;
    podcastTitle?: string;
    episodeTitle?: string;
    timestamp?: number;
    videoId?: string;
    videoTitle?: string;
    bookId?: number;
    videoTimestamp?: number;
    audioTimestamp?: number;
    parentId?: string | null;
    quotedText?: string;
    replies?: Comment[];
    authorName?: string;
    media?: { type: 'image' | 'video' | 'audio'; url: string }[];
    likedBy?: string[];
}

export interface PostComment {
    id: number;
    _id?: string;
    author: string;
    authorAvatarUrl: string;
    userId?: string;
    text: string;
    date: string;
    isoDate: string;
    replyTo?: string;
    quotedText?: string;
    likes?: number;
    isEdited?: boolean;
    media?: { type: 'image' | 'video' | 'audio'; url: string }[];
    videoTimestamp?: number;
    audioTimestamp?: number;
}

export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
}

export interface Post {
    id: number;
    author: string;
    authorAvatarUrl: string;
    userId?: string;
    date: string;
    isoDate: string;
    text?: string;
    media?: MediaItem[];
    videoId?: string;
    podcastId?: number;
    episodeIndex?: number;
    bookId?: number;
    timestamp?: number;
    comments: PostComment[];
    likes: number;
    reactions?: { [key: string]: number };
    isPinned?: boolean;
    replyToId?: number;
    isEdited?: boolean;
    sourceText?: string;
    // فیلدهای جدید برای پخش زنده
    isLive?: boolean;
    liveStatus?: 'streaming' | 'ended';
}

export interface PublishedBook {
  id: number;
  cover: string;
  backCover?: string;
  title: string;
  subtitle: string;
  description: string;
  authorName: string;
  pdfUrl?: string;
  buyUrl?: string;
  isNew?: boolean;
  price?: string;
  contentHtml?: string;
  tableOfContents?: string;
  type?: 'book' | 'pamphlet' | 'note'; 
  date?: string;
  relatedAudioIds?: number[]; 
  authorId?: string;
  isDraft?: boolean;
}

export type Page = 'mahfel' | 'sowt' | 'matn' | 'videos' | 'library' | 'nashr';
