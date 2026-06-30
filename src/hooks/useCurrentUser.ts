import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const u = session.user;
      setUser({
        id: u.id,
        email: u.email ?? '',
        name:
          (u.user_metadata?.name as string | undefined) ??
          (u.user_metadata?.full_name as string | undefined) ??
          u.email ??
          'Unknown',
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) { setUser(null); return; }
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? '',
          name:
            (u.user_metadata?.name as string | undefined) ??
            (u.user_metadata?.full_name as string | undefined) ??
            u.email ??
            'Unknown',
        });
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return user;
}
