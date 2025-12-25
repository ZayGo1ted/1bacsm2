
import { createClient } from '@supabase/supabase-js';
import { AppState, User, AcademicItem, TimetableEntry, Resource } from '../types';

// These should be set in your Vercel/Environment variables
// Since this is a specialized request, I'm using the Project ID from your connection string
const SUPABASE_URL = `https://lbfdweyzaqmlkcfgixmn.supabase.co`;
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // You MUST get this from your Supabase Dashboard Settings > API

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseService = {
  // Sync Entire State
  fetchFullState: async () => {
    const [usersRes, itemsRes, timetableRes, resourcesRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('academic_items').select('*'),
      supabase.from('timetable').select('*'),
      supabase.from('resources').select('*')
    ]);

    // Attach resources to items
    const items = (itemsRes.data || []).map(item => ({
      ...item,
      resources: (resourcesRes.data || []).filter(r => r.item_id === item.id)
    }));

    return {
      users: usersRes.data || [],
      items: items || [],
      timetable: timetableRes.data || []
    };
  },

  // Auth Operations
  registerUser: async (user: User) => {
    const { data, error } = await supabase.from('users').insert([user]).select();
    return { data, error };
  },

  getUserByEmail: async (email: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
    return { data, error };
  },

  // Academic Item Operations
  createAcademicItem: async (item: AcademicItem) => {
    // 1. Insert item
    const { resources, ...itemData } = item;
    const { data: newItem, error: itemError } = await supabase.from('academic_items').insert([itemData]).select().single();
    
    if (itemError) throw itemError;

    // 2. Insert resources
    if (resources.length > 0) {
      const resourceData = resources.map(r => ({ ...r, item_id: newItem.id }));
      await supabase.from('resources').insert(resourceData);
    }
    
    return newItem;
  },

  deleteAcademicItem: async (id: string) => {
    await supabase.from('academic_items').delete().eq('id', id);
  },

  // Timetable
  updateTimetable: async (entries: TimetableEntry[]) => {
    // Basic approach: delete and re-insert for sync (or perform diff)
    await supabase.from('timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (entries.length > 0) {
      await supabase.from('timetable').insert(entries);
    }
  },

  // Storage
  uploadFile: async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
      .from('resources')
      .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }
};
