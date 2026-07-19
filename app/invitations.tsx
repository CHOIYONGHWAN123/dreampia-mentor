import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
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
            {loadError && <ThemedText style={styles.errorText}>{loadError}</ThemedText>}
            {actionError && <ThemedText style={styles.errorText}>{actionError}</ThemedText>}
          </ThemedView>
        }
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyText}>받은 강의요청이 없습니다.</ThemedText>
          </ThemedView>
        }
        renderItem={({ item: group }) => {
          const isPending = group.mentorStatus === '대기' && group.invitationStatus === '발송중';

          return (
            <ThemedView style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, isPending ? styles.badgePending : styles.badgeClosed]}>
                    <ThemedText style={styles.badgeText}>
                      {MENTOR_STATUS_LABEL[group.mentorStatus] ?? group.mentorStatus}
                    </ThemedText>
                  </View>
                  {group.isAllApprovalRequired && (
                    <View style={[styles.badge, styles.badgeAll]}>
                      <ThemedText style={styles.badgeText}>모든수락</ThemedText>
                    </View>
                  )}
                </View>
                {isPending && (
                  <ThemedText style={styles.remaining}>{formatRemaining(group.expiresAt)}</ThemedText>
                )}
              </View>

              {group.rows.map((row) => {
                const isTakenByOther =
                  !!row.assigned_mentor_id && row.assigned_mentor_id !== myMentorId;
                const isTakenByMe = row.assigned_mentor_id === myMentorId;
                const canAcceptRow = isPending && !group.isAllApprovalRequired && !row.assigned_mentor_id;
                const acting = actingKey === row.event_row_id;

                return (
                  <View key={row.event_row_id} style={styles.rowBlock}>
                    <Field label="학교명" value={row.institution_name ?? '-'} />
                    <Field label="주소" value={row.institution_address ?? '-'} />
                    <Field label="일자/시간" value={formatTimeRange(row.start_time, row.end_time)} />
                    <Field label="행사 구분" value={row.experience_type ?? '-'} />
                    <Field
                      label="프로그램"
                      value={row.unit_title ?? row.program_name ?? row.occupation_name ?? '-'}
                    />
                    <Field
                      label="강의료"
                      value={`${formatFee(row.lecture_fee)} (세후 ${formatFee(row.lecture_fee_after_tax)})`}
                    />

                    {isTakenByMe && <ThemedText style={styles.takenMe}>✓ 수락 완료</ThemedText>}
                    {isTakenByOther && (
                      <ThemedText style={styles.takenOther}>다른 강사가 배정된 일정입니다</ThemedText>
                    )}
                    {canAcceptRow && (
                      <TouchableOpacity
                        style={[styles.button, styles.acceptButton]}
                        disabled={acting}
                        onPress={() => acceptRow(group.invitationMentorId, row.event_row_id!)}>
                        {acting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <ThemedText style={styles.buttonTextLight}>이 일정 수락</ThemedText>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {isPending && group.isAllApprovalRequired && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton, styles.flex1]}
                    disabled={actingKey === `${group.invitationMentorId}-all`}
                    onPress={() => acceptAll(group.invitationMentorId)}>
                    {actingKey === `${group.invitationMentorId}-all` ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={styles.buttonTextLight}>전체 수락</ThemedText>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.declineButton, styles.flex1]}
                    disabled={actingKey === `${group.invitationMentorId}-decline`}
                    onPress={() => declineInvitation(group.invitationMentorId)}>
                    <ThemedText style={styles.buttonTextDark}>거절</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {isPending && !group.isAllApprovalRequired && group.mentorStatus === '대기' && (
                <TouchableOpacity
                  style={[styles.button, styles.declineButton]}
                  disabled={actingKey === `${group.invitationMentorId}-decline`}
                  onPress={() => declineInvitation(group.invitationMentorId)}>
                  <ThemedText style={styles.buttonTextDark}>전체 거절</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  header: {
    marginBottom: 8,
    gap: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#687076',
  },
  errorText: {
    color: '#c0392b',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgePending: {
    backgroundColor: '#fff3e0',
  },
  badgeClosed: {
    backgroundColor: '#eceff1',
  },
  badgeAll: {
    backgroundColor: '#e3f2fd',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  remaining: {
    fontSize: 12,
    color: '#c77700',
  },
  rowBlock: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 6,
  },
  field: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLabel: {
    width: 72,
    fontSize: 13,
    color: '#687076',
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
  },
  takenMe: {
    color: '#2e7d32',
    fontSize: 13,
  },
  takenOther: {
    color: '#9e9e9e',
    fontSize: 13,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#0a7ea4',
  },
  declineButton: {
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  buttonTextLight: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonTextDark: {
    color: '#c0392b',
    fontWeight: '600',
  },
});
