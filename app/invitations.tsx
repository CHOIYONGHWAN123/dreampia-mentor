import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type RequestRow = Database['public']['Views']['mentor_invitation_requests']['Row'];

type InvitationGroup = {
  invitationMentorId: string;
  invitationId: string;
  isAllApprovalRequired: boolean;
  invitationStatus: string;
  mentorStatus: string;
  expiresAt: string;
  rows: RequestRow[];
};

const days = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTimeRange(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return '-';
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start.toDateString() === end.toDateString()) {
    return `${formatDate(startIso)} ${formatTime(startIso)} ~ ${formatTime(endIso)}`;
  }
  return `${formatDate(startIso)} ${formatTime(startIso)} ~ ${formatDate(endIso)} ${formatTime(endIso)}`;
}

function formatRemaining(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return '마감 임박';
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

function formatFee(fee: number | null) {
  if (fee === null) return '-';
  return `${fee.toLocaleString('ko-KR')}원`;
}

const MENTOR_STATUS_LABEL: Record<string, string> = {
  대기: '응답 대기',
  수락: '수락함',
  거절: '거절함',
  마감: '마감됨',
  만료: '만료됨',
};

function groupRows(rows: RequestRow[]): InvitationGroup[] {
  const map = new Map<string, InvitationGroup>();
  for (const row of rows) {
    if (!row.invitation_mentor_id || !row.invitation_id) continue;
    let group = map.get(row.invitation_mentor_id);
    if (!group) {
      group = {
        invitationMentorId: row.invitation_mentor_id,
        invitationId: row.invitation_id,
        isAllApprovalRequired: !!row.is_all_approval_required,
        invitationStatus: row.invitation_status ?? '발송중',
        mentorStatus: row.mentor_status ?? '대기',
        expiresAt: row.expires_at ?? new Date().toISOString(),
        rows: [],
      };
      map.set(row.invitation_mentor_id, group);
    }
    group.rows.push(row);
  }

  const list = [...map.values()];
  for (const group of list) {
    group.rows.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
  }

  list.sort((a, b) => {
    const aPending = a.mentorStatus === '대기' && a.invitationStatus === '발송중';
    const bPending = b.mentorStatus === '대기' && b.invitationStatus === '발송중';
    if (aPending !== bPending) return aPending ? -1 : 1;
    if (aPending) return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
    return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
  });

  return list;
}

export default function InvitationsScreen() {
  const { session } = useAuth();
  const myMentorId = session?.user.id;
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const textMuted = useThemeColor({}, 'textMuted');
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const warningMuted = useThemeColor({}, 'warningMuted');
  const surface = useThemeColor({}, 'surface');
  const primary = useThemeColor({}, 'primary');

  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('mentor_invitation_requests')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setRows(data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const groups = useMemo(() => groupRows(rows), [rows]);

  const runAction = async (
    key: string,
    action: () => PromiseLike<{ error: { message: string } | null }>
  ) => {
    setActionError(null);
    setActingKey(key);
    const { error } = await action();
    setActingKey(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    load();
  };

  const acceptRow = (invitationMentorId: string, eventRowId: string) =>
    runAction(eventRowId, () =>
      supabase.rpc('accept_invitation_event_row', {
        p_invitation_mentor_id: invitationMentorId,
        p_event_row_id: eventRowId,
      })
    );

  const acceptAll = (invitationMentorId: string) =>
    runAction(`${invitationMentorId}-all`, () =>
      supabase.rpc('accept_invitation_all', { p_invitation_mentor_id: invitationMentorId })
    );

  const declineInvitation = (invitationMentorId: string) => {
    Alert.alert('요청을 거절하시겠습니까?', '거절하면 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절',
        style: 'destructive',
        onPress: () =>
          runAction(`${invitationMentorId}-decline`, () =>
            supabase.rpc('decline_invitation', { p_invitation_mentor_id: invitationMentorId })
          ),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.invitationMentorId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            <ThemedText type="title">강의요청</ThemedText>
            {loadError && <ThemedText style={[styles.errorText, { color: danger }]}>{loadError}</ThemedText>}
            {actionError && (
              <ThemedText style={[styles.errorText, { color: danger }]}>{actionError}</ThemedText>
            )}
          </ThemedView>
        }
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText style={[styles.emptyText, { color: textMuted }]}>받은 강의요청이 없습니다.</ThemedText>
          </ThemedView>
        }
        renderItem={({ item: group }) => {
          const isPending = group.mentorStatus === '대기' && group.invitationStatus === '발송중';

          return (
            <ThemedView style={[styles.card, { backgroundColor: card, boxShadow: Shadows.card }]}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View
                    style={[styles.badge, { backgroundColor: isPending ? warningMuted : surface }]}>
                    <ThemedText style={[styles.badgeText, { color: isPending ? warning : textMuted }]}>
                      {MENTOR_STATUS_LABEL[group.mentorStatus] ?? group.mentorStatus}
                    </ThemedText>
                  </View>
                  {group.isAllApprovalRequired && (
                    <View style={[styles.badge, { backgroundColor: primary + '1f' }]}>
                      <ThemedText style={[styles.badgeText, { color: primary }]}>모든수락</ThemedText>
                    </View>
                  )}
                </View>
                {isPending && (
                  <ThemedText style={[styles.remaining, { color: warning }]}>
                    {formatRemaining(group.expiresAt)}
                  </ThemedText>
                )}
              </View>

              {group.rows.map((row) => {
                const isTakenByOther =
                  !!row.assigned_mentor_id && row.assigned_mentor_id !== myMentorId;
                const isTakenByMe = row.assigned_mentor_id === myMentorId;
                const canAcceptRow = isPending && !group.isAllApprovalRequired && !row.assigned_mentor_id;
                const acting = actingKey === row.event_row_id;

                return (
                  <View key={row.event_row_id} style={[styles.rowBlock, { borderTopColor: border }]}>
                    <Field label="학교명" value={row.institution_name ?? '-'} textMuted={textMuted} />
                    <Field label="주소" value={row.institution_address ?? '-'} textMuted={textMuted} />
                    <Field
                      label="일자/시간"
                      value={formatTimeRange(row.start_time, row.end_time)}
                      textMuted={textMuted}
                    />
                    <Field label="행사 구분" value={row.experience_type ?? '-'} textMuted={textMuted} />
                    <Field
                      label="프로그램"
                      value={row.unit_title ?? row.program_name ?? row.occupation_name ?? '-'}
                      textMuted={textMuted}
                    />
                    <Field
                      label="강의료"
                      value={`${formatFee(row.lecture_fee)} (세후 ${formatFee(row.lecture_fee_after_tax)})`}
                      textMuted={textMuted}
                    />

                    {isTakenByMe && (
                      <ThemedText style={[styles.takenMe, { color: success }]}>✓ 수락 완료</ThemedText>
                    )}
                    {isTakenByOther && (
                      <ThemedText style={[styles.takenOther, { color: textMuted }]}>
                        다른 강사가 배정된 일정입니다
                      </ThemedText>
                    )}
                    {canAcceptRow && (
                      <Button
                        title="이 일정 수락"
                        size="sm"
                        loading={acting}
                        onPress={() => acceptRow(group.invitationMentorId, row.event_row_id!)}
                      />
                    )}
                  </View>
                );
              })}

              {isPending && group.isAllApprovalRequired && (
                <View style={styles.actionRow}>
                  <Button
                    title="전체 수락"
                    size="sm"
                    style={styles.flex1}
                    loading={actingKey === `${group.invitationMentorId}-all`}
                    onPress={() => acceptAll(group.invitationMentorId)}
                  />
                  <Button
                    title="거절"
                    size="sm"
                    variant="destructive"
                    style={styles.flex1}
                    disabled={actingKey === `${group.invitationMentorId}-decline`}
                    onPress={() => declineInvitation(group.invitationMentorId)}
                  />
                </View>
              )}

              {isPending && !group.isAllApprovalRequired && group.mentorStatus === '대기' && (
                <Button
                  title="전체 거절"
                  size="sm"
                  variant="destructive"
                  disabled={actingKey === `${group.invitationMentorId}-decline`}
                  onPress={() => declineInvitation(group.invitationMentorId)}
                />
              )}
            </ThemedView>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Field({ label, value, textMuted }: { label: string; value: string; textMuted: string }) {
  return (
    <View style={styles.field}>
      <ThemedText style={[styles.fieldLabel, { color: textMuted }]}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm + 4,
  },
  header: {
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {},
  errorText: {},
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm + 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  badge: {
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  remaining: {
    fontSize: 12,
  },
  rowBlock: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm + 4,
    gap: Spacing.xs + 2,
  },
  field: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fieldLabel: {
    width: 72,
    fontSize: 13,
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
  },
  takenMe: {
    fontSize: 13,
  },
  takenOther: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },
});
