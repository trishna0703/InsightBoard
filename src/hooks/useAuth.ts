import { useState } from "react";
import { supabase } from "../services/supabase";

interface AuthState {
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: false,
    error: null,
  });

  const signIn = async (email: string, password: string) => {
    setState({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setState({ loading: false, error: error.message });
    } else {
      setState({ loading: false, error: null });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signIn, signOut };
}