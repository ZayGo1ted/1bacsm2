
import { createClient } from '@supabase/supabase-js';
import { AppState, User, AcademicItem, TimetableEntry, Resource, UserRole } from '../types';

// Standard Vercel environment variables or defaults
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lbfdweyzaqmlkcfgixmn.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.warn("SUPABASE_ANON_KEY is missing. Database features will not work until set in Vercel/Environment.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseService = {
  fetchFullState: async () => {
    try {
      const [usersRes, itemsRes, timetableRes, resourcesRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('academic_items').select('*'),
        supabase.from('timetable').select('*'),
        supabase.from('resources').select('*')
      ]);

      if (usersRes.error) throw usersRes.error;

      const items = (itemsRes.data || []).map(item => ({
        id: item.id,
        title: item.title,
        subjectId: item.subject_id,
        type: item.type,
        date: item.date,
        time: item.time,
        location: item.location,
        notes: item.notes,
        resources: (resourcesRes.data || [])
          .filter(r => r.item_id === item.id)
          .map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            url: r.url
          }))
      }));

      const timetable = (timetableRes.data || []).map(entry => ({
        id: entry.id,
        day: entry.day,
        startHour: entry.start_hour,
        endHour: entry.end_hour,
        subjectId: entry.subject_id,
        color: entry.color,
        room: entry.room
      }));

      return {
        users: (usersRes.data || []).map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role as UserRole,
          studentNumber: u.student_number,
          createdAt: u.created_at
        })),
        items: items || [],
        timetable: timetable || []
      };
    } catch (err) {
      console.error("Supabase fetch error:", err);
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
    const { data, error } = await supabase.from('users').insert([dbUser]).select();
    if (error) console.error("Supabase registration error:", error);
    return { data, error };
  },

  getUserByEmail: async (email: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    if (error) {
      console.error("Supabase login error:", error);
      return { data: null, error };
    }

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
    return { data: null, error: new Error("User not found") };
  },

  createAcademicItem: async (item: AcademicItem) => {
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
    
    const { data: newItem, error: itemError } = await supabase
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
      await supabase.from('resources').insert(resourceData);
    }
    
    return newItem;
  },

  deleteAcademicItem: async (id: string) => {
    await supabase.from('academic_items').delete().eq('id', id);
  },

  updateTimetable: async (entries: TimetableEntry[]) => {
    await supabase.from('timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
      await supabase.from('timetable').insert(dbEntries);
    }
  },

  uploadFile: async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from('resources')
      .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }
};
