
export enum UserRole {
  DEV = 'DEV',
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export type Language = 'en' | 'fr' | 'ar';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentNumber?: string;
  createdAt: string;
  isOnline?: boolean;
}

export interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'link' | 'note' | 'exercise';
  url: string;
}

export interface AcademicItem {
  id: string;
  title: string;
  subjectId: string;
  type: 'exam' | 'homework' | 'event';
  date: string;
  time?: string;
  location?: string;
  notes: string;
  resources: Resource[];
}

export interface Subject {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  color: string;
  coefficient: number;
}

export interface TimetableEntry {
  id: string;
  day: number; // 1-6 (Mon-Sat)
  startHour: number; // 8-17
  endHour: number;
  subjectId: string;
  color: string;
  room?: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio';
  mediaUrl?: string;
  fileName?: string;
  createdAt: string;
  reactions: Reaction[];
}

export interface AppState {
  users: User[];
  subjects: Subject[];
  items: AcademicItem[];
  timetable: TimetableEntry[];
  language: Language;
}
