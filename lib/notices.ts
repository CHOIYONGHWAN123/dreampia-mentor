import { supabase } from '@/lib/supabase';

// 전체 공지(announcements)와 행사별 공지(event_notices, RLS로 내가 배정된 행사만 보임)를
// 합쳐서 하나의 목록으로 보여준다. 행사명은 event_notices.event_id로 events를 따로 조회해
// Map으로 붙인다(이 코드베이스는 embed select 대신 이 방식을 일관되게 쓴다).
export type NoticeItem = {
  id: string;
  kind: 'global' | 'event';
  title: string;
  content: string;
  createdAt: string;
  eventName: string | null;
};

export async function fetchNotices(): Promise<{ items: NoticeItem[]; error: string | null }> {
  const [announcementsRes, eventNoticesRes] = await Promise.all([
    supabase.from('announcements').select('id, title, content, created_at').order('created_at', { ascending: false }),
    supabase
      .from('event_notices')
      .select('id, event_id, title, content, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const eventIds = [...new Set((eventNoticesRes.data ?? []).map((n) => n.event_id))];
  const eventsRes = eventIds.length
    ? await supabase.from('events').select('id, name').in('id', eventIds)
    : { data: [] as { id: string; name: string }[], error: null };

  const error =
    announcementsRes.error?.message ?? eventNoticesRes.error?.message ?? eventsRes.error?.message ?? null;
  const eventNameById = new Map((eventsRes.data ?? []).map((e) => [e.id, e.name]));

  const globalItems: NoticeItem[] = (announcementsRes.data ?? []).map((a) => ({
    id: a.id,
    kind: 'global' as const,
    title: a.title,
    content: a.content,
    createdAt: a.created_at,
    eventName: null,
  }));

  const eventItems: NoticeItem[] = (eventNoticesRes.data ?? []).map((n) => ({
    id: n.id,
    kind: 'event' as const,
    title: n.title,
    content: n.content,
    createdAt: n.created_at,
    eventName: eventNameById.get(n.event_id) ?? null,
  }));

  const items = [...globalItems, ...eventItems].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { items, error };
}

export async function fetchUnseenNoticeCount(since: string): Promise<number> {
  const [globalRes, eventRes] = await Promise.all([
    supabase.from('announcements').select('id', { count: 'exact', head: true }).gt('created_at', since),
    supabase.from('event_notices').select('id', { count: 'exact', head: true }).gt('created_at', since),
  ]);
  return (globalRes.count ?? 0) + (eventRes.count ?? 0);
}
