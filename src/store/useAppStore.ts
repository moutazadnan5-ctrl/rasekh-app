import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  profile: any | null;
  role: string;
  settings: Record<string, any>;
  isLoading: boolean;
  setAuth: (user: User | null, profile: any | null, role: string) => void;
  setSettings: (settings: Record<string, any>) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  profile: null,
  role: 'مشاهد للمنصة',
  settings: {},
  isLoading: true,
  setAuth: (user, profile, role) => set({ user, profile, role, isLoading: false }),
  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, profile: null, role: 'مشاهد للمنصة', isLoading: false }),
}));
