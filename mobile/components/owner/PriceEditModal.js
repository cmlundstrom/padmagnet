import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DragHandle from '../ui/DragHandle';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import useKeyboardLift from '../../hooks/useKeyboardLift';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Reusable price edit modal — used from:
 * 1. Owner listings tab (pencil icon)
 * 2. Nearby Rentals screen (floating "Edit My Price" button)
 * 3. Listing detail screen (owner context)
 */
export default function PriceEditModal({ visible, onClose, listing, onPriceUpdated }) {
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { style: liftStyle } = useKeyboardLift('popup');

  const currentPrice = listing?.list_price;

  // Reset field when modal opens
  useEffect(() => {
    if (visible) {
      setPrice('');
      setError(null);
    }
  }, [visible]);

  const handleSave = async () => {
    const newPrice = parseFloat(price);
    if (!newPrice || newPrice <= 0 || isNaN(newPrice)) {
      setError('Enter a valid price');
      return;
    }
    if (newPrice > 999999) {
      setError('Price exceeds maximum ($999,999)');
      return;
    }
    if (newPrice === parseFloat(currentPrice)) {
      setError('New price is the same as current price');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch(`/api/owner/listings/${listing.id}/price`, {
        method: 'PUT',
        body: JSON.stringify({ price: newPrice }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onPriceUpdated) onPriceUpdated(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={liftStyle}>
          <Pressable style={styles.card} onPress={() => {}}>
            <DragHandle light />
            <Text style={styles.title}>Edit My Price</Text>

            {currentPrice && (
              <Text style={styles.currentPrice}>
                Current: {formatCurrency(currentPrice)}/mo
              </Text>
            )}

            <View style={styles.inputRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.slate}
                autoFocus
                maxLength={7}
              />
              <Text style={styles.perMonth}>/mo</Text>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.scrimDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '92%',
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  currentPrice: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dollar: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  perMonth: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  error: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: LAYOUT.padding.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: LAYOUT.padding.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
