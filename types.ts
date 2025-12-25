
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

export interface AppState {
  users: User[];
  subjects: Subject[];
  items: AcademicItem[];
  timetable: TimetableEntry[];
  language: Language;
}
