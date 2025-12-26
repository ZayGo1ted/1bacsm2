
/**
 * SUPABASE SQL SETUP (Run this in your Supabase SQL Editor to fix RLS errors):
 * 
 * -- 1. Create Tables
 * CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email TEXT UNIQUE, name TEXT, role TEXT, student_number TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
 * CREATE TABLE IF NOT EXISTS academic_items (id UUID PRIMARY KEY, title TEXT, subject_id TEXT, type TEXT, date TEXT, time TEXT, location TEXT, notes TEXT);
 * CREATE TABLE IF NOT EXISTS timetable (id UUID PRIMARY KEY, day INT, start_hour INT, end_hour INT, subject_id TEXT, color TEXT, room TEXT);
 * CREATE TABLE IF NOT EXISTS resources (id UUID PRIMARY KEY, item_id UUID REFERENCES academic_items(id) ON DELETE CASCADE, title TEXT, type TEXT, url TEXT);
 * 
 * -- 2. Enable RLS
 * ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE academic_items ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
 * 
 * -- 3. Create Basic Policies (Allow all for anonymous users with API Key)
 * CREATE POLICY "public_select_users" ON users FOR SELECT TO anon USING (true);
 * CREATE POLICY "public_insert_users" ON users FOR INSERT TO anon WITH CHECK (true);
 * CREATE POLICY "public_select_items" ON academic_items FOR SELECT TO anon USING (true);
 * CREATE POLICY "public_insert_items" ON academic_items FOR INSERT TO anon WITH CHECK (true);
 * CREATE POLICY "public_delete_items" ON academic_items FOR DELETE TO anon USING (true);
 * CREATE POLICY "public_all_timetable" ON timetable FOR ALL TO anon USING (true);
 * CREATE POLICY "public_all_resources" ON resources FOR ALL TO anon USING (true);
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, User, AcademicItem, TimetableEntry, Resource, UserRole } from '../types';

const SUPABASE_URL = 'https://lbfdweyzaqmlkcfgixmn.supabase.co';

const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  return (import.meta as any).env?.VITE_API_KEY || (window as any).API_KEY || '';
};

const API_KEY = getApiKey();

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!API_KEY) {
    throw new Error("Cloud connection key is missing. Please ensure the API_KEY environment variable is set.");
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
    
    // Fetch each table individually to prevent one RLS error from killing the whole app load
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

    // Log warnings instead of throwing immediately
    if (uErr) console.warn("Supabase RLS: Error fetching 'users'.", uErr);
    if (iErr) console.warn("Supabase RLS: Error fetching 'academic_items'.", iErr);
    if (tErr) console.warn("Supabase RLS: Error fetching 'timetable'.", tErr);
    if (rErr) console.warn("Supabase RLS: Error fetching 'resources'.", rErr);

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
    
    if (error) {
      console.error("Supabase Login Error:", error);
      throw new Error("Access denied by database. Check RLS policies.");
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
