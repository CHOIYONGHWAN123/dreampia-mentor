import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

export type MentorProfile = {
  id: string;
  name: string;
  phone: string | null;
  is_authenticated: boolean;
};

type AuthContextValue = {
  session: Session | null;
  mentor: MentorProfile | null;
  isLoading: boolean;
  isMentorLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    termsVersionId: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMentorLoading, setIsMentorLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setMentor(null);
      setIsMentorLoading(false);
      return;
    }

    let isCancelled = false;
    setIsMentorLoading(true);
    supabase
      .from('mentors')
      .select('id, name, phone, is_authenticated')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!isCancelled) {
          setMentor(data);
          setIsMentorLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async ({
    email,
    password,
    name,
    phone,
    termsVersionId,
  }: {
    email: string;
    password: string;
    name: string;
    phone: string;
    termsVersionId: string;
  }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone, terms_version_id: termsVersionId, account_type: 'mentor' },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ session, mentor, isLoading, isMentorLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
}
