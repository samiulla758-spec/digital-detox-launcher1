import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDetox } from '@/lib/context';
import { APP_CATALOG, effectiveCategory, getCatalogByKey } from '@/lib/apps';
import { getIcon } from '@/lib/iconMap';
import { formatHMS } from '@/lib/store';
import { Lock, Shield, X, Clock } from 'lucide-react-native';
import PinGate from '@/components/PinGate';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

export default function HomeScreen() {
  const detox = useDetox();
  const now = useClock();
  const [lockedApp, setLockedApp] = useState<string | null>(null);
  const [bypassPin, setBypassPin] = useState(false);

  const limit = detox.config?.daily_limit_seconds ?? 10800;
  const remaining = Math.max(0, limit - detox.usedSeconds);
  const allowedKeys = detox.config?.allowed_apps ?? [];

  const allowedApps = useMemo(
    () => APP_CATALOG.filter((a) => effectiveCategory(a, allowedKeys) === 'allowed'),
    [allowedKeys],
  );
  const restrictedApps = useMemo(
    () => APP_CATALOG.filter((a) => effectiveCategory(a, allowedKeys) === 'restricted'),
    [allowedKeys],
  );

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  async function handleOpen(appKey: string) {
    const res = await detox.openApp(appKey);
    if (res.locked) {
      setLockedApp(appKey);
    }
  }

  const active = detox.activeSession;
  const activeApp = active ? getCatalogByKey(active.appKey) : null;
  const activeElapsed = active ? Math.floor((Date.now() - active.startedAt) / 1000) : 0;

  const lockedAppName = lockedApp ? getCatalogByKey(lockedApp)?.name : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status / clock header */}
        <View style={styles.header}>
          <Text style={styles.clock}>{timeStr}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {/* Budget card */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetTop}>
            <View style={styles.budgetLeft}>
              <Text style={styles.budgetLabel}>Restricted App Budget</Text>
              <Text style={styles.budgetRemaining}>{formatHMS(remaining)}</Text>
              <Text style={styles.budgetSub}>remaining today</Text>
            </View>
            <View style={styles.budgetRight}>
              <Clock color="#5b8def" size={22} strokeWidth={2} />
              <Text style={styles.budgetUsed}>{formatHMS(detox.usedSeconds)} used</Text>
            </View>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, (detox.usedSeconds / limit) * 100)}%` },
                detox.usedSeconds / limit >= 1 && styles.barFillDone,
              ]}
            />
          </View>
          <Text style={styles.budgetFoot}>
            Resets at 12:00 AM · Limit {Math.floor(limit / 3600)}h
          </Text>
        </View>

        {/* Allowed apps */}
        <Text style={styles.sectionTitle}>
          <Shield color="#34c759" size={15} strokeWidth={2.4} />  Allowed Apps · Unlimited
        </Text>
        <View style={styles.grid}>
          {allowedApps.map((app) => {
            const Icon = getIcon(app.icon);
            const isActive = active?.appKey === app.key;
            return (
              <TouchableOpacity
                key={app.key}
                style={[styles.appTile, isActive && styles.appTileActive]}
                onPress={() => handleOpen(app.key)}
                activeOpacity={0.6}
              >
                <View style={[styles.appIcon, { backgroundColor: app.color }]}>
                  <Icon color="#fff" size={24} strokeWidth={2} absoluteStrokeWidth />
                </View>
                <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                <Text style={styles.appSub}>{app.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Restricted apps */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
          <Clock color="#f59e0b" size={15} strokeWidth={2.4} />  Restricted Apps · {formatHMS(remaining)} left
        </Text>
        <View style={styles.grid}>
          {restrictedApps.map((app) => {
            const Icon = getIcon(app.icon);
            const isLocked = detox.usedSeconds >= limit;
            const isActive = active?.appKey === app.key;
            return (
              <TouchableOpacity
                key={app.key}
                style={[styles.appTile, isActive && styles.appTileActive, isLocked && !isActive && styles.appTileLocked]}
                onPress={() => handleOpen(app.key)}
                activeOpacity={0.6}
              >
                <View style={[styles.appIcon, { backgroundColor: app.color }, isLocked && !isActive && styles.appIconLocked]}>
                  <Icon color="#fff" size={24} strokeWidth={2} absoluteStrokeWidth />
                  {isLocked && !isActive && (
                    <View style={styles.lockBadge}>
                      <Lock color="#fff" size={12} strokeWidth={2.5} />
                    </View>
                  )}
                </View>
                <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                <Text style={styles.appSub}>{app.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Active app overlay */}
      {active && activeApp && (
        <ActiveAppOverlay
          appName={activeApp.name}
          appColor={activeApp.color}
          icon={activeApp.icon}
          restricted={active.restricted}
          elapsed={activeElapsed}
          remaining={remaining}
          onClose={() => detox.closeActiveApp()}
        />
      )}

      {/* Locked modal */}
      <Modal visible={!!lockedApp} transparent animationType="fade" onRequestClose={() => setLockedApp(null)}>
        <View style={styles.lockBackdrop}>
          <View style={styles.lockSheet}>
            <View style={styles.lockIconWrap}>
              <Lock color="#fff" size={28} strokeWidth={2.2} />
            </View>
            <Text style={styles.lockTitle}>{lockedAppName} is locked</Text>
            <Text style={styles.lockSub}>
              You've used your full {Math.floor(limit / 3600)}-hour daily budget for restricted apps.
              The timer resets at midnight, or a parent can bypass the limit with the PIN.
            </Text>
            <View style={styles.lockActions}>
              <TouchableOpacity style={styles.lockDismiss} onPress={() => setLockedApp(null)}>
                <Text style={styles.lockDismissText}>Go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.lockBypass}
                onPress={() => {
                  setBypassPin(true);
                }}
              >
                <Shield color="#fff" size={16} strokeWidth={2.2} />
                <Text style={styles.lockBypassText}>Parent bypass</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bypass PIN gate */}
      <PinGate
        visible={bypassPin}
        title="Parent Bypass"
        subtitle="Enter PIN to reset the daily budget and open the app."
        verifyPin={detox.verifyPin}
        onCancel={() => setBypassPin(false)}
        onSuccess={async () => {
          setBypassPin(false);
          await detox.resetUsage();
          const key = lockedApp;
          setLockedApp(null);
          if (key) await handleOpen(key);
        }}
      />
    </SafeAreaView>
  );
}

function ActiveAppOverlay({
  appName,
  appColor,
  icon,
  restricted,
  elapsed,
  remaining,
  onClose,
}: {
  appName: string;
  appColor: string;
  icon: string;
  restricted: boolean;
  elapsed: number;
  remaining: number;
  onClose: () => void;
}) {
  const Icon = getIcon(icon);
  return (
    <View style={styles.overlayWrap}>
      <View style={styles.overlayCard}>
        <View style={[styles.overlayIcon, { backgroundColor: appColor }]}>
          <Icon color="#fff" size={30} strokeWidth={2} absoluteStrokeWidth />
        </View>
        <Text style={styles.overlayName}>{appName}</Text>
        <Text style={styles.overlayStatus}>
          {restricted ? 'Restricted · using budget' : 'Unlimited access'}
        </Text>
        <Text style={styles.overlayTimer}>{formatHMS(elapsed)}</Text>
        {restricted && (
          <Text style={styles.overlayRemaining}>{formatHMS(remaining)} budget remaining</Text>
        )}
        <TouchableOpacity style={styles.overlayClose} onPress={onClose} activeOpacity={0.6}>
          <X color="#fff" size={18} strokeWidth={2.4} />
          <Text style={styles.overlayCloseText}>Close app</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d16' },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  header: { alignItems: 'center', marginBottom: 18 },
  clock: { fontFamily: 'Inter-Bold', fontSize: 48, color: '#ffffff', letterSpacing: 1 },
  dateText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#8a8a9a', marginTop: 2 },
  budgetCard: {
    backgroundColor: '#161623',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#22223a',
  },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  budgetLeft: { flex: 1 },
  budgetLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 0.5 },
  budgetRemaining: { fontFamily: 'Inter-Bold', fontSize: 30, color: '#ffffff', marginTop: 6 },
  budgetSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6b6b80', marginTop: 2 },
  budgetRight: { alignItems: 'center', gap: 4 },
  budgetUsed: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#5b8def' },
  barTrack: { height: 6, backgroundColor: '#22223a', borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#5b8def', borderRadius: 3 },
  barFillDone: { backgroundColor: '#ef4444' },
  budgetFoot: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6b6b80', marginTop: 10 },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#a0a0b0',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  appTile: { width: '30.5%', alignItems: 'center', marginBottom: 6, paddingVertical: 10, borderRadius: 16 },
  appTileActive: { backgroundColor: 'rgba(91,141,239,0.12)', borderWidth: 1, borderColor: '#5b8def' },
  appTileLocked: { opacity: 0.55 },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  appIconLocked: {},
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0d0d16',
  },
  appName: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#e8e8f0' },
  appSub: { fontFamily: 'Inter-Regular', fontSize: 10, color: '#6b6b80', marginTop: 1 },
  // Overlay
  overlayWrap: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayCard: {
    backgroundColor: '#161623',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#22223a',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  overlayIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  overlayName: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#fff' },
  overlayStatus: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#8a8a9a', marginTop: 4 },
  overlayTimer: { fontFamily: 'Inter-Bold', fontSize: 34, color: '#5b8def', marginTop: 10 },
  overlayRemaining: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#6b6b80', marginTop: 2 },
  overlayClose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 16,
  },
  overlayCloseText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  // Locked modal
  lockBackdrop: { flex: 1, backgroundColor: 'rgba(8,8,16,0.8)', justifyContent: 'center', padding: 28 },
  lockSheet: {
    backgroundColor: '#161623',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22223a',
  },
  lockIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  lockTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#fff' },
  lockSub: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#9a9aaa', textAlign: 'center', marginTop: 10, lineHeight: 21 },
  lockActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  lockDismiss: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#22223a' },
  lockDismissText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#c0c0d0' },
  lockBypass: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#5b8def' },
  lockBypassText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
});
