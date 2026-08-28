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
  // 반환값: 이메일 인증이 필요해 세션이 바로 생기지 않은 경우(현재 기본값) true.
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    termsVersionId: string;
    identityVerificationCi: string | null;
  }) => Promise<{ requiresEmailConfirmation: boolean }>;
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
      .then(async ({ data }) => {
        if (isCancelled) return;

        // 드물게 on_mentor_signup 트리거가 mentors 행을 못 만드는 경우가 있다(예: 미확인
        // 이메일로 회원가입을 재시도하면 auth.users가 insert가 아니라 update되어 트리거가
        // 안 걸림). 이 경우 로그인 시점에 본인 행을 셀프로 채워 넣어 복구한다 — mentors
        // 테이블의 "본인 mentors 셀프 등록" RLS 정책(관리자 겸직용으로 추가됐지만 조건이
        // 일반적이라 그대로 재사용 가능)을 그대로 이용한다.
        if (!data && session.user.user_metadata?.account_type === 'mentor') {
          const meta = session.user.user_metadata;
          const { data: healed } = await supabase
            .from('mentors')
            .insert({
              id: session.user.id,
              mentor_unique_code: '',
              name: typeof meta.name === 'string' && meta.name ? meta.name : '미입력',
              phone: typeof meta.phone === 'string' ? meta.phone : null,
              is_authenticated: false,
              terms_agreed_at: new Date().toISOString(),
              terms_version_id: typeof meta.terms_version_id === 'string' ? meta.terms_version_id : null,
            })
            .select('id, name, phone, is_authenticated, mentor_unique_code')
            .single();
          data = healed ?? null;
        }

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
    // admin과 auth.users를 공유하므로, 입력한 이메일이 이미 관리자로 가입된 계정일 수 있다.
    // 이 경우 로그인이 먼저 성공한다 — mentors 행만 없는 것이므로 새로 만들어 멘토를 겸직시킨다.
    // (admin 저장소 app/(auth)/signup/page.tsx의 반대 방향 로직과 동일한 패턴.)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData.user) {
      const { data: existingMentor } = await supabase
        .from('mentors')
        .select('id')
        .eq('id', signInData.user.id)
        .maybeSingle();

      if (existingMentor) {
        // 이미 멘토로도 가입되어 있음 — 그냥 로그인된 것으로 처리한다.
        return { requiresEmailConfirmation: false };
      }

      const { error: insertError } = await supabase.from('mentors').insert({
        id: signInData.user.id,
        // mentors_assign_unique_code 트리거가 빈 값을 실제 코드로 채워준다.
        mentor_unique_code: '',
        name,
        phone,
        is_authenticated: false,
        terms_agreed_at: new Date().toISOString(),
        terms_version_id: termsVersionId,
        identity_verified_at: identityVerificationCi ? new Date().toISOString() : null,
        identity_verification_ci: identityVerificationCi,
      });
      if (insertError) throw new Error(insertError.message);

      return { requiresEmailConfirmation: false };
    }

    // 본인인증(PortOne) 심사가 끝나기 전까지는 이메일 인증으로 대체한다. Supabase 프로젝트의
    // "Confirm email"이 켜져 있으면 이 시점엔 세션이 안 생기고 확인 메일만 발송된다 —
    // 사용자가 메일의 링크를 눌러야 로그인 가능한 상태가 된다.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://dreampia-mentor.vercel.app/login',
        data: {
          name,
          phone,
          terms_version_id: termsVersionId,
          account_type: 'mentor',
          identity_verification_ci: identityVerificationCi,
        },
      },
    });
    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('이미 사용 중인 이메일입니다. 비밀번호가 다르다면 로그인 페이지에서 비밀번호를 재설정해주세요.');
      }
      throw error;
    }

    // 이메일 확인이 켜져 있으면 이미 가입된 이메일이어도 signUp()이 에러 없이
    // "빈 identities"를 담아 응답한다(보안상 계정 존재 여부를 숨기기 위함) — 이 경우도 감지해야 한다.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('이미 사용 중인 이메일입니다. 비밀번호가 다르다면 로그인 페이지에서 비밀번호를 재설정해주세요.');
    }

    return { requiresEmailConfirmation: !data.session };
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
