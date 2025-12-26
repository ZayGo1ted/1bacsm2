
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, User, AcademicItem, TimetableEntry, Resource, UserRole } from '../types';

const SUPABASE_URL = 'https://lbfdweyzaqmlkcfgixmn.supabase.co';

/**
 * Resilient API Key Retrieval
 * Checks process.env, import.meta (for Vite/Vercel), and window fallbacks.
 */
const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  // Fallback for different build environments (Vite/Vercel client-side)
  const metaEnv = (import.meta as any).env;
  if (metaEnv?.API_KEY) return metaEnv.API_KEY;
  if (metaEnv?.VITE_API_KEY) return metaEnv.VITE_API_KEY;
  
  return (window as any).API_KEY || '';
};

const API_KEY = getApiKey();

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!API_KEY) {
    throw new Error("The API_KEY environment variable is not set. Please ensure it is configured in your environment.");
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, API_KEY);
  }
  return supabaseInstance;
};

export const supabaseService = {
  isConfigured: () => API_KEY.length > 0,

  fetchFullState: async () => {
    const client = getSupabase();
    
    const [
      { data: users, error: uErr },
      { data: items, error: iErr },
      { data: timetable, error: tErr },
      { data: resources, error: rErr }
    ] = await Promise.all([
      client.from('users').select('*'),
      client.from('academic_items').select('*'),
      client.from('timetable').select('*'),
      client.from('resources').select('*')
    ]);

    if (uErr) console.warn("Fetch users error:", uErr);
    if (iErr) console.warn("Fetch items error:", iErr);

    const mappedItems = (items || []).map(item => ({
      id: item.id,
      title: item.title,
      subjectId: item.subject_id,
      type: item.type,
      date: item.date,
      time: item.time || '08:00', // Default if missing
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
      timetable: (timetable || []).map(entry => ({
        id: entry.id,
        day: entry.day,
        startHour: entry.start_hour,
        endHour: entry.end_hour,
        subjectId: entry.subject_id,
        color: entry.color,
        room: entry.room
      }))
    };
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
    return await getSupabase().from('users').insert([dbUser]);
  },

  updateUser: async (user: User) => {
    return await getSupabase()
      .from('users')
      .update({
        name: user.name,
        role: user.role,
        student_number: user.studentNumber
      })
      .eq('id', user.id);
  },

  deleteUser: async (id: string) => {
    return await getSupabase().from('users').delete().eq('id', id);
  },

  getUserByEmail: async (email: string) => {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
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
    return { data: null, error };
  },

  createAcademicItem: async (item: AcademicItem) => {
    const client = getSupabase();
    const { data: newItem, error: itemError } = await client
      .from('academic_items')
      .insert([{
        id: item.id,
        title: item.title,
        subject_id: item.subjectId,
        type: item.type,
        date: item.date,
        time: item.time,
        location: item.location,
        notes: item.notes
      }])
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

  updateAcademicItem: async (item: AcademicItem) => {
    const client = getSupabase();
    const { error: itemError } = await client
      .from('academic_items')
      .update({
        title: item.title,
        subject_id: item.subjectId,
        type: item.type,
        date: item.date,
        time: item.time,
        location: item.location,
        notes: item.notes
      })
      .eq('id', item.id);
    
    if (itemError) throw itemError;

    // Refresh resources
    await client.from('resources').delete().eq('item_id', item.id);
    if (item.resources.length > 0) {
      const resourceData = item.resources.map(r => ({
        id: r.id,
        item_id: item.id,
        title: r.title,
        type: r.type,
        url: r.url
      }));
      await client.from('resources').insert(resourceData);
    }
  },

  deleteAcademicItem: async (id: string) => {
    return await getSupabase().from('academic_items').delete().eq('id', id);
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
    const fileName = `${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const { error } = await client.storage.from('resources').upload(`uploads/${fileName}`, file);
    if (error) throw error;
    const { data: urlData } = client.storage.from('resources').getPublicUrl(`uploads/${fileName}`);
    return urlData.publicUrl;
  }
};
