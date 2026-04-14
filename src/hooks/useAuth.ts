import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export function useAuth() {
  const { user, profile, role, isLoading, setAuth, logout, setSettings } = useAppStore();

  useEffect(() => {
    let mounted = true;

    const fetchSessionAndProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          await handleUserLogin(session.user, mounted);
        } else {
          if (mounted) logout();
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        if (mounted) logout();
      }
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleUserLogin(session.user, mounted);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) logout();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setAuth, logout, setSettings]);

  const handleUserLogin = async (authUser: any, mounted: boolean) => {
    try {
      // Fetch user profile from 'teachers' table
      const { data: profileData, error: profileError } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch system settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*');

      let settingsMap: Record<string, any> = {};
      if (!settingsError && settingsData) {
        settingsData.forEach(s => {
          settingsMap[s.key] = s.value;
        });
        if (mounted) setSettings(settingsMap);
      }

      const userRole = profileData?.role || 'مشاهد للمنصة';
      
      if (mounted) {
        setAuth(authUser, profileData, userRole);
      }
    } catch (error) {
      console.error('Login handler error:', error);
      if (mounted) logout();
    }
  };

  return { user, profile, role, isLoading };
}
