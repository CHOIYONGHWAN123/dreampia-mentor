import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { registerForPushNotificationsAsync } from '@/lib/register-push-token';
import { supabase } from '@/lib/supabase';

export type MentorProfile = {
  id: string;
  name: string;
  phone: string | null;
  is_authenticated: boolean;
  mentor_unique_code: string;
};

type AuthContextValue = {
  session: Session | null;
  mentor: MentorProfile | null;
  isLoading: boolean;
  isMentorLoading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    termsVersionId: string;
    identityVerificationCi: string | null;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // find-password 화면에서 verifyOtp(type: 'recovery')로 인증에 성공하면 세션이 생기면서
    // 'PASSWORD_RECOVERY' 이벤트가 발생한다. 이때는 일반 로그인으로 취급해 (tabs)로 보내지 않고
    // reset-password 화면에서 새 비밀번호를 설정하게 해야 한다.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
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
      .select('id, name, phone, is_authenticated, mentor_unique_code')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!isCancelled) {
          setMentor(data);
          setIsMentorLoading(false);
          if (data) registerForPushNotificationsAsync(data.id).catch(() => {});
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
    identityVerificationCi,
  }: {
    email: string;
    password: string;
    name: string;
    phone: string;
    termsVersionId: string;
    identityVerificationCi: string | null;
  }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          terms_version_id: termsVersionId,
          account_type: 'mentor',
          identity_verification_ci: identityVerificationCi,
        },
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
      value={{
        session,
        mentor,
        isLoading,
        isMentorLoading,
        isPasswordRecovery,
        signIn,
        signUp,
        signOut,
      }}>
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
