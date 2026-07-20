import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type ScheduleRow = Database['public']['Views']['mentor_invitation_requests']['Row'];

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function todayKey() {
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

type GridCell = { key: string; day: number; inCurrentMonth: boolean };

function buildMonthGrid(year: number, month: number): GridCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: GridCell[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    cells.push({ key: dateKey(d.getFullYear(), d.getMonth(), d.getDate()), day, inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: dateKey(year, month, day), day, inCurrentMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, nextDay);
    cells.push({ key: dateKey(d.getFullYear(), d.getMonth(), d.getDate()), day: nextDay, inCurrentMonth: false });
    nextDay += 1;
  }
  return cells;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const DOT_COLORS = ['#0a7ea4', '#2e7d32', '#c77700', '#8e24aa'];

export default function LectureScheduleScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const mentorId = session?.user.id;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mentorId) return;
    const { data, error } = await supabase
      .from('mentor_invitation_requests')
      .select('*')
      .eq('assigned_mentor_id', mentorId)
      .order('start_time', { ascending: true });

    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setRows(data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [mentorId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const row of rows) {
      if (!row.start_time) continue;
      const key = row.start_time.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [rows]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const today = todayKey();

  const goToPrevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const goToNextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const goToToday = () => {
    const now2 = new Date();
    setYear(now2.getFullYear());
    setMonth(now2.getMonth());
    setSelectedDate(todayKey());
  };

  const openDetail = (row: ScheduleRow) => {
    router.push({ pathname: '/lecture-schedule-detail', params: { id: row.event_row_id ?? '' } });
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
          강의 일정
        </ThemedText>
        {loadError && <ThemedText style={styles.error}>{loadError}</ThemedText>}

        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <IconSymbol name="chevron.left" size={18} color="#687076" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
              {year}년 {month + 1}월
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <IconSymbol name="chevron.right" size={18} color="#687076" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label) => (
            <ThemedText key={label} style={styles.weekdayLabel}>
              {label}
            </ThemedText>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((cell) => {
            const events = eventsByDate.get(cell.key) ?? [];
            const isSelected = cell.key === selectedDate;
            const isToday = cell.key === today;
            return (
              <TouchableOpacity
                key={cell.key}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  !cell.inCurrentMonth && styles.dayCellDim,
                ]}
                onPress={() => setSelectedDate(cell.key)}>
                <ThemedText
                  style={[
                    styles.dayNumber,
                    !cell.inCurrentMonth && styles.dayNumberDim,
                    isToday && styles.dayNumberToday,
                  ]}>
                  {cell.day}
                </ThemedText>
                <View style={styles.dotRow}>
                  {events.slice(0, 3).map((e, i) => (
                    <View
                      key={e.event_row_id ?? i}
                      style={[styles.dot, { backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <ThemedView style={styles.agenda}>
          <ThemedText type="defaultSemiBold">{selectedDate} 확정 일정</ThemedText>
          {selectedEvents.length === 0 && (
            <ThemedText style={styles.emptyText}>이 날짜에 확정된 강의가 없습니다.</ThemedText>
          )}
          {selectedEvents.map((row) => (
            <TouchableOpacity
              key={row.event_row_id}
              style={styles.agendaItem}
              onPress={() => openDetail(row)}>
              <ThemedText style={styles.agendaTime}>
                {row.start_time && formatTime(row.start_time)}
                {row.end_time ? ` ~ ${formatTime(row.end_time)}` : ''}
              </ThemedText>
              <ThemedText type="defaultSemiBold">{row.institution_name ?? '-'}</ThemedText>
              <ThemedText style={styles.agendaSub}>
                {row.unit_title ?? row.program_name ?? '-'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  navButton: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 17,
    minWidth: 100,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#687076',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    gap: 4,
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#e3f2fd',
  },
  dayCellDim: {
    opacity: 0.35,
  },
  dayNumber: {
    fontSize: 13,
  },
  dayNumberDim: {
    color: '#687076',
  },
  dayNumberToday: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  agenda: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e2e2',
    paddingTop: 16,
  },
  emptyText: {
    color: '#687076',
  },
  agendaItem: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    padding: 12,
    gap: 2,
  },
  agendaTime: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  agendaSub: {
    fontSize: 13,
    color: '#687076',
  },
});
