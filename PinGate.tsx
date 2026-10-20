import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Lock, Delete } from 'lucide-react-native';

interface PinGateProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
}

export default function PinGate({
  visible,
  title = 'Enter Parental PIN',
  subtitle = 'Enter your 4-digit PIN to continue.',
  onSuccess,
  onCancel,
  verifyPin,
}: PinGateProps) {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (visible) {
      setEntry('');
      setError(null);
      setChecking(false);
    }
  }, [visible]);

  function press(d: string) {
    if (entry.length >= 4) return;
    const next = entry + d;
    setEntry(next);
    setError(null);
    if (next.length === 4) {
      void submit(next);
    }
  }

  async function submit(pin: string) {
    setChecking(true);
    const ok = await verifyPin(pin);
    setChecking(false);
    if (ok) {
      onSuccess();
    } else {
      setError('Incorrect PIN. Try again.');
      setEntry('');
    }
  }

  function backspace() {
    setEntry((e) => e.slice(0, -1));
    setError(null);
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWrap}>
            <Lock color="#fff" size={22} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, i < entry.length && styles.dotFilled, error && styles.dotError]}
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.errorPlaceholder} />}

          <View style={styles.pad}>
            {keys.map((k, idx) => {
              if (k === '') return <View key={`empty-${idx}`} style={styles.keyCell} />;
              if (k === 'back') {
                return (
                  <TouchableOpacity
                    key="back"
                    style={styles.keyCell}
                    onPress={backspace}
                    activeOpacity={0.6}
                  >
                    <Delete color="#1a1a2e" size={26} strokeWidth={2} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={k}
                  style={styles.key}
                  onPress={() => press(k)}
                  activeOpacity={0.55}
                  disabled={checking}
                >
                  <Text style={styles.keyText}>{k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,20,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 34,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6b6b80',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d1da',
  },
  dotFilled: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1a1a2e',
  },
  dotError: {
    borderColor: '#ef4444',
  },
  error: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#ef4444',
    marginTop: 14,
    height: 18,
  },
  errorPlaceholder: {
    height: 18,
    marginTop: 14,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    gap: 14,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f4f4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCell: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 26,
    color: '#1a1a2e',
  },
  cancelBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#6b6b80',
  },
});
