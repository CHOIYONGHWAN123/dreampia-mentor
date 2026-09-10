import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type EventRowDetail = Database['public']['Views']['mentor_event_row_detail']['Row'];

const LAST_SEEN_ANNOUNCEMENTS_KEY = 'mentor.lastSeenAnnouncementsAt';

export async function getLastSeenAnnouncementsAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SEEN_ANNOUNCEMENTS_KEY);
  } catch {
    return null;
  }
}

export async function markAnnouncementsSeenNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SEEN_ANNOUNCEMENTS_KEY, new Date().toISOString());
  } catch {
    // 로컬 저장 실패는 무시한다 — 다음에 공지사항 화면에 들어올 때 다시 시도된다.
  }
}

// 회보서(범죄경력조회 회보서)는 강의 시작 전에 등록해야 하므로, 강의가 이미 지났어도
// 여전히 미등록이면 계속 대상에 포함한다(시간 제한 없음).
export async function fetchMissingCriminalRecordRows(): Promise<EventRowDetail[]> {
  const { data, error } = await supabase
    .from('mentor_event_row_detail')
    .select('*')
    .is('criminal_background_check', null)
    .order('start_time', { ascending: true });
  if (error) return [];
  return data ?? [];
}

// 행사사진은 강의가 끝난 뒤에만 찍을 수 있으므로, 이미 종료된 강의 중 2장 미만인 것만 대상으로 한다.
export async function fetchMissingEventPhotoRows(): Promise<EventRowDetail[]> {
  const { data: eventRows, error } = await supabase
    .from('mentor_event_row_detail')
    .select('*')
    .lt('end_time', new Date().toISOString())
    .order('end_time', { ascending: false });
  if (error || !eventRows) return [];

  const ids = eventRows.map((r) => r.event_row_id).filter((v): v is string => !!v);
  if (ids.length === 0) return [];

  const { data: photos } = await supabase.from('event_photos').select('event_rows_id').in('event_rows_id', ids);
  const photoCounts = new Map<string, number>();
  for (const p of photos ?? []) {
    photoCounts.set(p.event_rows_id, (photoCounts.get(p.event_rows_id) ?? 0) + 1);
  }

  return eventRows.filter((r) => r.event_row_id && (photoCounts.get(r.event_row_id) ?? 0) < 2);
}

// invitations.tsx의 isPending 판정(대기 + 발송중)과 동일한 기준으로, 초대 건(invitation_mentor_id)
// 단위로 묶어서 셈 — 강의요청 화면의 카드 개수와 배지 숫자가 항상 일치해야 한다.
async function fetchPendingInvitationCount(): Promise<number> {
  const { data } = await supabase
    .from('mentor_invitation_requests')
    .select('invitation_mentor_id, mentor_status, invitation_status');

  const groups = new Map<string, { mentorStatus: string; invitationStatus: string }>();
  for (const row of data ?? []) {
    if (!row.invitation_mentor_id) continue;
    groups.set(row.invitation_mentor_id, {
      mentorStatus: row.mentor_status ?? '대기',
      invitationStatus: row.invitation_status ?? '발송중',
    });
  }

  let count = 0;
  for (const g of groups.values()) {
    if (g.mentorStatus === '대기' && g.invitationStatus === '발송중') count += 1;
  }
  return count;
}

// 마지막으로 공지사항 화면을 연 시각(로컬 저장) 이후 올라온 공지만 센다. 아직 한 번도 연 적이
// 없으면 가입일을 기준으로 삼아, 신규 멘토가 가입 이전의 과거 공지까지 안읽음으로 보지 않게 한다.
async function fetchUnseenAnnouncementCount(mentorCreatedAt: string): Promise<number> {
  const lastSeen = await getLastSeenAnnouncementsAt();
  const since = lastSeen ?? mentorCreatedAt;
  const { count } = await supabase
    .from('announcements')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', since);
  return count ?? 0;
}

export type MentorTodoCounts = {
  invitations: number;
  criminalRecord: number;
  eventPhotos: number;
  announcements: number;
};

const emptyCounts: MentorTodoCounts = { invitations: 0, criminalRecord: 0, eventPhotos: 0, announcements: 0 };

// 마이페이지 "할 일" 배지용 카운트 4종을 화면에 포커스될 때마다 새로고침한다.
export function useMentorTodoCounts() {
  const { session, mentor } = useAuth();
  const [counts, setCounts] = useState<MentorTodoCounts>(emptyCounts);

  const reload = useCallback(async () => {
    if (!session || !mentor) {
      setCounts(emptyCounts);
      return;
    }

    const [criminalRows, photoRows, invitations, announcements] = await Promise.all([
      fetchMissingCriminalRecordRows(),
      fetchMissingEventPhotoRows(),
      fetchPendingInvitationCount(),
      fetchUnseenAnnouncementCount(mentor.created_at),
    ]);

    setCounts({
      invitations,
      criminalRecord: criminalRows.length,
      eventPhotos: photoRows.length,
      announcements,
    });
  }, [session, mentor]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { counts, reload };
}
