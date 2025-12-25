
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, User, AcademicItem, TimetableEntry, Resource, UserRole } from '../types';

const SUPABASE_URL = 'https://lbfdweyzaqmlkcfgixmn.supabase.co';

// Robust key detection for different environments
const getApiKey = (): string => {
  // 1. Try standard process.env (Node/Bundler)
  if (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) {
    return process.env.SUPABASE_ANON_KEY;
  }
  // 2. Try Vite style (very common)
  if ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY) {
    return (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  }
  // 3. Try global window variable (Fallback)
  if (typeof window !== 'undefined' && (window as any).SUPABASE_ANON_KEY) {
    return (window as any).SUPABASE_ANON_KEY;
  }
  return '';
};

const ANON_KEY = getApiKey();

// We initialize the client inside a getter to prevent the "supabaseKey is required" crash on boot
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY is missing. Please set it in your environment variables.");
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, ANON_KEY);
  }
  return supabaseInstance;
};

export const supabaseService = {
  isConfigured: () => ANON_KEY.length > 0,

  fetchFullState: async () => {
    try {
      const client = getSupabase();
      const { data: users, error: uErr } = await client.from('users').select('*');
      const { data: items, error: iErr } = await client.from('academic_items').select('*');
      const { data: timetable, error: tErr } = await client.from('timetable').select('*');
      const { data: resources, error: rErr } = await client.from('resources').select('*');

      if (uErr || iErr || tErr || rErr) {
        console.error("Database fetch error details:", { uErr, iErr, tErr, rErr });
        throw new Error("Could not fetch data. Check your Supabase RLS policies.");
      }

      const mappedItems = (items || []).map(item => ({
        id: item.id,
        title: item.title,
        subjectId: item.subject_id,
        type: item.type,
        date: item.date,
        time: item.time,
        location: item.location,
        notes: item.notes,
        resources: (resources || [])
          .filter(r => r.item_id === item.id)
          .map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            url: r.url
          }))
      }));

      const mappedTimetable = (timetable || []).map(entry => ({
        id: entry.id,
        day: entry.day,
        startHour: entry.start_hour,
        endHour: entry.end_hour,
        subjectId: entry.subject_id,
        color: entry.color,
        room: entry.room
      }));

      return {
        users: (users || []).map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role as UserRole,
          studentNumber: u.student_number,
          createdAt: u.created_at
        })),
        items: mappedItems,
        timetable: mappedTimetable
      };
    } catch (err) {
      console.error("Supabase service error:", err);
      throw err;
    }
  },

  registerUser: async (user: User) => {
    const dbUser = {
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      role: user.role,
      student_number: user.studentNumber,
      created_at: user.createdAt
    };
    const { data, error } = await getSupabase().from('users').insert([dbUser]).select();
    if (error) throw error;
    return { data, error };
  },

  getUserByEmail: async (email: string) => {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    if (error) throw error;

    if (data) {
      return {
        data: {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as UserRole,
          studentNumber: data.student_number,
          createdAt: data.created_at
        },
        error: null
      };
    }
    return { data: null, error: null };
  },

  createAcademicItem: async (item: AcademicItem) => {
    const client = getSupabase();
    const itemData = {
      id: item.id,
      title: item.title,
      subject_id: item.subjectId,
      type: item.type,
      date: item.date,
      time: item.time,
      location: item.location,
      notes: item.notes
    };
    
    const { data: newItem, error: itemError } = await client
      .from('academic_items')
      .insert([itemData])
      .select()
      .single();
    
    if (itemError) throw itemError;

    if (item.resources.length > 0) {
      const resourceData = item.resources.map(r => ({
        id: r.id,
        item_id: newItem.id,
        title: r.title,
        type: r.type,
        url: r.url
      }));
      await client.from('resources').insert(resourceData);
    }
    
    return newItem;
  },

  deleteAcademicItem: async (id: string) => {
    const { error } = await getSupabase().from('academic_items').delete().eq('id', id);
    if (error) throw error;
  },

  updateTimetable: async (entries: TimetableEntry[]) => {
    const client = getSupabase();
    await client.from('timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (entries.length > 0) {
      const dbEntries = entries.map(e => ({
        id: e.id,
        day: e.day,
        start_hour: e.startHour,
        end_hour: e.endHour,
        subject_id: e.subjectId,
        color: e.color,
        room: e.room
      }));
      await client.from('timetable').insert(dbEntries);
    }
  },

  uploadFile: async (file: File) => {
    const client = getSupabase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await client.storage
      .from('resources')
      .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = client.storage
      .from('resources')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }
};
