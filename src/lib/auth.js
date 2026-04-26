import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export async function ensureProfile(user) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (existing) return existing;

  const display_name = (user.email || 'player').split('@')[0];
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, display_name })
    .select()
    .single();
  if (error) throw error;
  return created;
}

export function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUp(email, password) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
