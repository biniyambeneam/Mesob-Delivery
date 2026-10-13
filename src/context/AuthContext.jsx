import { useCallback, useEffect, useState } from 'react';
import { fakeEmailFromPhone, normalizePhoneNumber, phoneFromFakeEmail } from '../lib/auth.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { AuthContext } from './AuthContextObject.js';

function getStoredPhone(user) {
  return user?.user_metadata?.phone ?? user?.phone ?? phoneFromFakeEmail(user?.email);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const ensureProfileRow = useCallback(async (user) => {
    if (!supabase || !user?.id) {
      return null;
    }

    const phone = normalizePhoneNumber(getStoredPhone(user) || '');

    if (!phone) {
      return null;
    }

    await supabase.from('users').upsert(
      {
        id: user.id,
        phone,
      },
      { onConflict: 'id' },
    );

    return phone;
  }, []);

  const loadProfile = useCallback(async (user) => {
    if (!supabase || !user?.id) {
      setProfile(null);
      setIsProfileLoading(false);
      return null;
    }

    setIsProfileLoading(true);

    try {
      await ensureProfileRow(user);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(data ?? null);
      return data;
    } finally {
      setIsProfileLoading(false);
    }
  }, [ensureProfileRow]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    let subscription;

    const initialize = async () => {
      try {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        setSession(activeSession);

        if (activeSession?.user) {
          await loadProfile(activeSession.user);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const handleSessionChange = async (nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);

      if (nextSession?.user) {
        await loadProfile(nextSession.user);
      } else {
        setProfile(null);
        setIsProfileLoading(false);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    initialize();

    const authStateListener = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void handleSessionChange(nextSession);
    });
    subscription = authStateListener.data.subscription;

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async ({ phone, password }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const email = fakeEmailFromPhone(normalizedPhone);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone: normalizedPhone,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await ensureProfileRow({
        ...data.user,
        user_metadata: {
          ...data.user.user_metadata,
          phone: normalizedPhone,
        },
      });
      await loadProfile(data.user);
    }

    return data;
  }, [ensureProfileRow, loadProfile]);

  const signIn = useCallback(async ({ phone, password }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const email = fakeEmailFromPhone(phone);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await loadProfile(data.user);
    }

    return data;
  }, [loadProfile]);

  const completeOnboarding = useCallback(async ({ name, identityNumber, pickupPoint }) => {
    if (!supabase || !session?.user) {
      throw new Error('You must be logged in.');
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        name,
        identity_number: identityNumber,
        pickup_point: pickupPoint,
        onboarding_complete: true,
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    setProfile(data);
    return data;
  }, [session?.user]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return null;
    }

    return loadProfile(session.user);
  }, [loadProfile, session?.user]);

  const signOut = useCallback(async () => {
    const resetClientState = () => {
      setSession(null);
      setProfile(null);
      setIsProfileLoading(false);
      setLoading(false);
    };

    const clearSupabaseStorage = () => {
      const localStorageKeys = Object.keys(window.localStorage);
      localStorageKeys.forEach((key) => {
        if (key.startsWith('sb-')) {
          window.localStorage.removeItem(key);
        }
      });
    };

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      window.localStorage.clear();
    } finally {
      clearSupabaseStorage();
      resetClientState();
      window.location.replace('/auth');
    }
  }, []);

  const value = {
    session,
    profile,
    loading,
    isProfileLoading,
    isManager: Boolean(profile?.is_manager),
    isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    completeOnboarding,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
