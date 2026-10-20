import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDetox } from '@/lib/context';
import { formatHMS, todayKey } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { DetoxSession } from '@/lib/types';
import { Clock, TrendingUp, Calendar, Infinity as InfinityIcon } from 'lucide-react-native';
import { getIcon } from '@/lib/iconMap';

export default function UsageScreen() {
  const detox = useDetox();
  const [sessions, setSessions] = useState<DetoxSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const limit = detox.config?.daily_limit_seconds ?? 10800;
  const remaining = Math.max(0, limit - detox.usedSeconds);
  const pct = Math.min(100, (detox.usedSeconds / limit) * 100);

  async function loadSessions() {
    const today = todayKey();
    const { data } = await supabase
      .from('detox_sessions')
      .select('*')
      .eq('date', today)
      .order('started_at', { ascending: false });
    setSessions((data as DetoxSession[]) ?? []);
  }

  useEffect(() => {
    loadSessions();
  }, [detox.usedSeconds, detox.activeSession]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([detox.refresh(), loadSessions()]);
    setRefreshing(false);
  }

  const restrictedSessions = sessions.filter((s) => s.restricted);
  const allowedSessions = sessions.filter((s) => !s.restricted);
  const restrictedTotal = restrictedSessions.reduce((a, s) => a + s.duration_seconds, 0);
  const allowedTotal = allowedSessions.reduce((a, s) => a + s.duration_seconds, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5b8def" />}
      >
        <Text style={styles.pageTitle}>Today's Usage</Text>
        <Text style={styles.pageSub}>{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

        {/* Main budget ring-ish card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardTop}>
            <View>
              <Text style={styles.mainLabel}>Restricted budget used</Text>
              <Text style={styles.mainValue}>{formatHMS(detox.usedSeconds)}</Text>
              <Text style={styles.mainSub}>of {formatHMS(limit)} daily limit</Text>
            </View>
            <View style={styles.ringWrap}>
              <View style={styles.ringOuter}>
                <View style={[styles.ringFill, { height: `${pct}%` }]} />
              </View>
              <Text style={styles.ringPct}>{Math.round(pct)}%</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Clock color="#5b8def" size={16} strokeWidth={2.2} />
              <Text style={styles.statValue}>{formatHMS(remaining)}</Text>
              <Text style={styles.statLabel}>remaining</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <TrendingUp color="#f59e0b" size={16} strokeWidth={2.2} />
              <Text style={styles.statValue}>{restrictedSessions.length}</Text>
              <Text style={styles.statLabel}>restricted opens</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <InfinityIcon color="#34c759" size={16} strokeWidth={2.2} />
              <Text style={styles.statValue}>{formatHMS(allowedTotal)}</Text>
              <Text style={styles.statLabel}>unlimited used</Text>
            </View>
          </View>
        </View>

        {/* Reset info */}
        <View style={styles.resetCard}>
          <Calendar color="#8a8a9a" size={18} strokeWidth={2} />
          <Text style={styles.resetText}>
            Budget resets to 0 at 12:00 AM every night automatically.
          </Text>
        </View>

        {/* Session history */}
        <Text style={styles.sectionTitle}>App Sessions Today</Text>
        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No apps opened yet today.</Text>
          </View>
        ) : (
          <View style={styles.sessionList}>
            {sessions.map((s) => {
              const app = s.app_key;
              const Icon = getIcon(getCatalogIcon(app));
              return (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={[styles.sessionIcon, { backgroundColor: s.restricted ? '#3a2a1a' : '#1a2a3a' }]}>
                    <Icon color={s.restricted ? '#f59e0b' : '#5b8def'} size={18} strokeWidth={2} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>{s.app_name}</Text>
                    <Text style={styles.sessionMeta}>
                      {s.restricted ? 'Restricted' : 'Unlimited'} · {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.sessionDur}>{formatHMS(s.duration_seconds)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getCatalogIcon(key: string): string {
  // lightweight lookup without importing full catalog
  const map: Record<string, string> = {
    whatsapp: 'MessageCircle', phonepe: 'Wallet', gpay: 'CreditCard', paytm: 'Banknote',
    phone: 'Phone', messages: 'MessagesSquare', gemini: 'Sparkles',
    instagram: 'Instagram', youtube: 'Youtube', facebook: 'Facebook', x: 'Twitter',
    tiktok: 'Music', snapchat: 'Camera', telegram: 'Send', chrome: 'Globe',
    netflix: 'Film', spotify: 'Music', reddit: 'MessageSquare', gmail: 'Mail', maps: 'Map',
  };
  return map[key] ?? 'MessageCircle';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d16' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  pageTitle: { fontFamily: 'Inter-Bold', fontSize: 28, color: '#fff' },
  pageSub: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#8a8a9a', marginTop: 4, marginBottom: 22 },
  mainCard: {
    backgroundColor: '#161623',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#22223a',
    marginBottom: 16,
  },
  mainCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 0.5 },
  mainValue: { fontFamily: 'Inter-Bold', fontSize: 32, color: '#fff', marginTop: 6 },
  mainSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6b6b80', marginTop: 2 },
  ringWrap: { alignItems: 'center', gap: 6 },
  ringOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22223a',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  ringFill: { width: '100%', backgroundColor: '#5b8def' },
  ringPct: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#5b8def' },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 4 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: '#22223a' },
  statValue: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#e8e8f0' },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: '#6b6b80' },
  resetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#12121e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#1c1c2e',
  },
  resetText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: '#9a9aaa', lineHeight: 19 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },
  empty: { backgroundColor: '#161623', borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#22223a' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6b6b80' },
  sessionList: { gap: 10 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161623',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f1f30',
  },
  sessionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1, marginLeft: 14 },
  sessionName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#e8e8f0' },
  sessionMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6b6b80', marginTop: 2 },
  sessionDur: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#a0a0b0' },
});
