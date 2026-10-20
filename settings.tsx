import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDetox } from '@/lib/context';
import { APP_CATALOG, effectiveCategory } from '@/lib/apps';
import { getIcon } from '@/lib/iconMap';
import { formatHMS } from '@/lib/store';
import {
  Lock, Shield, Clock, RotateCcw, Check, ChevronRight, KeyRound, Hourglass,
} from 'lucide-react-native';
import PinGate from '@/components/PinGate';

const LIMIT_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '2 hours', seconds: 7200 },
  { label: '3 hours', seconds: 10800 },
  { label: '4 hours', seconds: 14400 },
  { label: '5 hours', seconds: 18000 },
];

export default function SettingsScreen() {
  const detox = useDetox();
  const [pinGate, setPinGate] = useState(false);
  const [pinGatePurpose, setPinGatePurpose] = useState<'unlock' | 'changePin'>('unlock');
  const [editingLimit, setEditingLimit] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'new'>('enter');

  const allowedKeys = detox.config?.allowed_apps ?? [];
  const limit = detox.config?.daily_limit_seconds ?? 10800;

  if (detox.loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading settings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detox.pinned) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSub}>Parental controls are PIN-protected.</Text>

          <View style={styles.lockedCard}>
            <View style={styles.lockedIcon}>
              <Lock color="#5b8def" size={30} strokeWidth={2} />
            </View>
            <Text style={styles.lockedTitle}>PIN Required</Text>
            <Text style={styles.lockedSub}>
              Enter your 4-digit parental PIN to view and change launcher settings,
              bypass limits, or manage allowed apps.
            </Text>
            <TouchableOpacity
              style={styles.unlockBtn}
              onPress={() => {
                setPinGatePurpose('unlock');
                setPinStep('enter');
                setPinGate(true);
              }}
            >
              <KeyRound color="#fff" size={18} strokeWidth={2.2} />
              <Text style={styles.unlockBtnText}>Enter PIN</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <PinGate
          visible={pinGate}
          verifyPin={detox.verifyPin}
          onCancel={() => setPinGate(false)}
          onSuccess={() => setPinGate(false)}
        />
      </SafeAreaView>
    );
  }

  async function toggleAllowed(key: string) {
    const current = detox.config?.allowed_apps ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    await detox.updateAllowedApps(next);
  }

  function startChangePin() {
    setPinGatePurpose('changePin');
    setPinStep('new');
    setNewPin('');
    setPinGate(true);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSub}>Manage parental controls and limits.</Text>

        {/* Daily limit */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Hourglass color="#5b8def" size={18} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Daily Restricted Limit</Text>
          </View>
          <Text style={styles.cardDesc}>
            Cumulative time allowed across all restricted apps before they lock.
            Resets at midnight.
          </Text>
          {editingLimit ? (
            <View style={styles.limitOptions}>
              {LIMIT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.seconds}
                  style={[styles.limitOpt, limit === opt.seconds && styles.limitOptActive]}
                  onPress={() => {
                    void detox.updateDailyLimit(opt.seconds);
                    setEditingLimit(false);
                  }}
                >
                  <Text style={[styles.limitOptText, limit === opt.seconds && styles.limitOptTextActive]}>
                    {opt.label}
                  </Text>
                  {limit === opt.seconds && <Check color="#5b8def" size={16} strokeWidth={2.4} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelEdit} onPress={() => setEditingLimit(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.rowButton} onPress={() => setEditingLimit(true)}>
              <Text style={styles.rowValue}>{Math.floor(limit / 3600)}h {Math.floor((limit % 3600) / 60)}m</Text>
              <ChevronRight color="#6b6b80" size={18} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Allowed apps manager */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield color="#34c759" size={18} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Allowed Apps (Unlimited)</Text>
          </View>
          <Text style={styles.cardDesc}>
            Toggle apps to grant unlimited access. Turn off to move an app into the restricted budget.
          </Text>
          <View style={styles.toggleList}>
            {APP_CATALOG.map((app) => {
              const Icon = getIcon(app.icon);
              const allowed = effectiveCategory(app, allowedKeys) === 'allowed';
              return (
                <View key={app.key} style={styles.toggleRow}>
                  <View style={[styles.toggleIcon, { backgroundColor: app.color }]}>
                    <Icon color="#fff" size={16} strokeWidth={2} />
                  </View>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleName}>{app.name}</Text>
                    <Text style={styles.toggleSub}>{app.subtitle}</Text>
                  </View>
                  <Switch
                    value={allowed}
                    onValueChange={() => toggleAllowed(app.key)}
                    trackColor={{ false: '#2a2a3e', true: '#34c759' }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Change PIN */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <KeyRound color="#f59e0b" size={18} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Parental PIN</Text>
          </View>
          <Text style={styles.cardDesc}>
            The 4-digit PIN protects settings, limit bypasses, and uninstall attempts.
          </Text>
          <TouchableOpacity style={styles.rowButton} onPress={startChangePin}>
            <Text style={styles.rowValue}>Change PIN</Text>
            <ChevronRight color="#6b6b80" size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Reset usage */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <RotateCcw color="#ef4444" size={18} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Reset Today's Budget</Text>
          </View>
          <Text style={styles.cardDesc}>
            Manually reset the restricted-app timer to zero. This also happens automatically at midnight.
          </Text>
          <Text style={styles.currentUsageText}>
            Currently used: {formatHMS(detox.usedSeconds)}
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              Alert.alert('Reset budget?', 'This will set today\'s restricted usage back to 0.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => detox.resetUsage() },
              ]);
            }}
          >
            <RotateCcw color="#fff" size={16} strokeWidth={2.2} />
            <Text style={styles.resetBtnText}>Reset to 0</Text>
          </TouchableOpacity>
        </View>

        {/* Uninstall protection notice */}
        <View style={styles.noticeCard}>
          <Lock color="#8a8a9a" size={16} strokeWidth={2} />
          <Text style={styles.noticeText}>
            To uninstall this launcher, the parental PIN is required. This prevents
            bypassing the digital detox by simply removing the app.
          </Text>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Change PIN flow */}
      <PinGate
        visible={pinGate && pinGatePurpose === 'changePin' && pinStep === 'new'}
        title="Enter New PIN"
        subtitle="Choose a new 4-digit parental PIN."
        verifyPin={async (pin) => {
          // Reuse the gate UI as a free-form entry by accepting any 4 digits
          await detox.updatePin(pin);
          setPinGate(false);
          Alert.alert('PIN updated', 'Your parental PIN has been changed.');
          return true;
        }}
        onCancel={() => setPinGate(false)}
        onSuccess={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d16' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#6b6b80' },
  pageTitle: { fontFamily: 'Inter-Bold', fontSize: 28, color: '#fff' },
  pageSub: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#8a8a9a', marginTop: 4, marginBottom: 22 },
  lockedCard: {
    backgroundColor: '#161623',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22223a',
    marginTop: 10,
  },
  lockedIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(91,141,239,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  lockedTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#fff' },
  lockedSub: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#9a9aaa', textAlign: 'center', marginTop: 10, lineHeight: 21 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#5b8def', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, marginTop: 24 },
  unlockBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  card: {
    backgroundColor: '#161623',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#22223a',
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#e8e8f0' },
  cardDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#7a7a8a', lineHeight: 19, marginBottom: 14 },
  rowButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowValue: { fontFamily: 'Inter-Medium', fontSize: 15, color: '#c0c0d0' },
  limitOptions: { gap: 8 },
  limitOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#1c1c2e' },
  limitOptActive: { backgroundColor: 'rgba(91,141,239,0.15)', borderWidth: 1, borderColor: '#5b8def' },
  limitOptText: { fontFamily: 'Inter-Medium', fontSize: 15, color: '#c0c0d0' },
  limitOptTextActive: { color: '#5b8def', fontFamily: 'Inter-SemiBold' },
  cancelEdit: { paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  cancelEditText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#6b6b80' },
  toggleList: { gap: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleInfo: { flex: 1, marginLeft: 12 },
  toggleName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#e8e8f0' },
  toggleSub: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6b6b80', marginTop: 1 },
  currentUsageText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#c0c0d0', marginBottom: 12 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12, alignSelf: 'flex-start' },
  resetBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#12121e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1c1c2e', marginTop: 4 },
  noticeText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#7a7a8a', lineHeight: 18 },
});
