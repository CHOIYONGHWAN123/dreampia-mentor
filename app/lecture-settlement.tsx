import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type DetailRow = Database['public']['Views']['mentor_event_row_detail']['Row'];

const PAGE_SIZE = 10;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthStartString(year: number, month: number) {
  return `${year}-${pad2(month)}-01T00:00:00`;
}

function addMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function formatFee(fee: number | null) {
  return `₩${(fee ?? 0).toLocaleString('ko-KR')}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAY_LABELS[d.getDay()]})`;
}

// prep_by가 '강사'일 때만 강사가 재료비를 실제로 부담/정산받는다. '드림피아'는 드림피아가 부담하고,
// '모두가능'은 실제 준비 주체를 기록하는 컬럼이 아직 DB에 없어 확정 금액을 알 수 없으므로 0으로 둔다.
function materialCostOf(row: DetailRow) {
  if (row.prep_by === '강사') return row.mentor_material_cost ?? 0;
  return 0;
}

// 합계는 실제 입금액 기준(세후 강의료 + 재료비)으로 계산한다.
function totalOf(row: DetailRow) {
  return (row.lecture_fee_after_tax ?? 0) + materialCostOf(row);
}

export default function LectureSettlementScreen() {
  const { session } = useAuth();
  const mentorId = session?.user.id;
  const now = new Date();

  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);

  const [rows, setRows] = useState<DetailRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mentorId) return;
    const from = monthStartString(fromYear, fromMonth);
    const toBoundary = addMonth(toYear, toMonth);
    const to = monthStartString(toBoundary.year, toBoundary.month);

    const { data, error } = await supabase
      .from('mentor_event_row_detail')
      .select('*')
      .eq('mentor_id', mentorId)
      .gte('start_time', from)
      .lt('start_time', to)
      .order('start_time', { ascending: true });

    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setRows(data ?? []);
      setVisibleCount(PAGE_SIZE);
    }
    setLoading(false);
    setRefreshing(false);
  }, [mentorId, fromYear, fromMonth, toYear, toMonth]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const periodTotal = useMemo(() => rows.reduce((sum, r) => sum + totalOf(r), 0), [rows]);
  const visibleRows = rows.slice(0, visibleCount);

  const stepMonth = (which: 'from' | 'to', direction: -1 | 1) => {
    const year = which === 'from' ? fromYear : toYear;
    const month = which === 'from' ? fromMonth : toMonth;
    const d = new Date(year, month - 1 + direction, 1);
    if (which === 'from') {
      setFromYear(d.getFullYear());
      setFromMonth(d.getMonth() + 1);
    } else {
      setToYear(d.getFullYear());
      setToMonth(d.getMonth() + 1);
    }
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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ThemedText type="title" style={styles.title}>
          강의 정산
        </ThemedText>
        {loadError && <ThemedText style={styles.error}>{loadError}</ThemedText>}

        <ThemedView style={styles.periodCard}>
          <PeriodRow
            label="시작"
            year={fromYear}
            month={fromMonth}
            onPrev={() => stepMonth('from', -1)}
            onNext={() => stepMonth('from', 1)}
          />
          <PeriodRow
            label="종료"
            year={toYear}
            month={toMonth}
            onPrev={() => stepMonth('to', -1)}
            onNext={() => stepMonth('to', 1)}
          />

          <View style={styles.totalRow}>
            <ThemedText type="defaultSemiBold">선택한 기간 합계</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.totalValue}>
              {formatFee(periodTotal)}
            </ThemedText>
          </View>
        </ThemedView>

        {visibleRows.length === 0 && (
          <ThemedText style={styles.emptyText}>선택한 기간에 배정된 일정이 없습니다.</ThemedText>
        )}

        {visibleRows.map((row, index) => (
          <SettlementCard key={row.event_row_id ?? index} no={index + 1} row={row} />
        ))}

        {visibleCount < rows.length && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            <ThemedText style={styles.moreButtonText}>더보기</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PeriodRow({
  label,
  year,
  month,
  onPrev,
  onNext,
}: {
  label: string;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.periodRow}>
      <ThemedText style={styles.periodLabel}>{label}</ThemedText>
      <TouchableOpacity onPress={onPrev} style={styles.periodNavButton} hitSlop={8}>
        <IconSymbol name="chevron.left" size={16} color="#687076" />
      </TouchableOpacity>
      <ThemedText type="defaultSemiBold" style={styles.periodValue}>
        {year}년 {month}월
      </ThemedText>
      <TouchableOpacity onPress={onNext} style={styles.periodNavButton} hitSlop={8}>
        <IconSymbol name="chevron.right" size={16} color="#687076" />
      </TouchableOpacity>
    </View>
  );
}

function SettlementCard({ no, row }: { no: number; row: DetailRow }) {
  const materialCost = materialCostOf(row);
  const total = totalOf(row);
  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardNo}>{no}</ThemedText>
        <ThemedText type="defaultSemiBold">{row.institution_name ?? '-'}</ThemedText>
      </View>
      <ThemedText style={styles.cardDate}>{formatDate(row.start_time)}</ThemedText>

      <View style={styles.cardRow}>
        <ThemedText style={styles.cardFieldLabel}>강의료 (세전)</ThemedText>
        <ThemedText style={styles.cardFieldValue}>{formatFee(row.lecture_fee)}</ThemedText>
      </View>
      <View style={styles.cardRow}>
        <ThemedText style={styles.cardFieldLabel}>강의료 (세후)</ThemedText>
        <ThemedText style={styles.cardFieldValue}>{formatFee(row.lecture_fee_after_tax)}</ThemedText>
      </View>
      <View style={styles.cardRow}>
        <ThemedText style={styles.cardFieldLabel}>재료비</ThemedText>
        <ThemedText style={styles.cardFieldValue}>{formatFee(materialCost)}</ThemedText>
      </View>
      <View style={[styles.cardRow, styles.cardTotalRow]}>
        <ThemedText type="defaultSemiBold" style={styles.cardFieldLabel}>
          합계
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.cardFieldValue}>
          {formatFee(total)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 4,
  },
  error: {
    color: '#c0392b',
  },
  periodCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodLabel: {
    width: 40,
    fontSize: 13,
    color: '#687076',
  },
  periodNavButton: {
    padding: 4,
  },
  periodValue: {
    flex: 1,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  totalValue: {
    color: '#0a7ea4',
    fontSize: 17,
  },
  emptyText: {
    color: '#687076',
    textAlign: 'center',
    paddingVertical: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardNo: {
    fontSize: 12,
    color: '#687076',
    minWidth: 18,
  },
  cardDate: {
    fontSize: 12,
    color: '#687076',
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardFieldLabel: {
    fontSize: 13,
    color: '#687076',
  },
  cardFieldValue: {
    fontSize: 13,
  },
  cardTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
    paddingTop: 6,
  },
  moreButton: {
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  moreButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
});
