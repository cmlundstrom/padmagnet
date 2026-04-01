import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../components/ui';
import { signOut } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function DeleteAccountScreen() {
  const { role } = useAuth();
  const alert = useAlert();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isOwner = role === 'owner';
  const canDelete = confirmation.toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await apiFetch('/api/profiles/delete-account', { method: 'DELETE' });
      await signOut();
      router.replace('/welcome');
    } catch (err) {
      alert('Deletion Failed', err.message);
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 360 }} keyboardShouldPersistTaps="handled">
          <View style={styles.backButton}>
            <BackButton />
            <Text style={styles.backText}>Delete Account</Text>
          </View>

          {/* Warning icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="warning" size={48} color={COLORS.danger} />
          </View>

          <Text style={styles.title}>This cannot be undone</Text>

          <Text style={styles.body}>
            Deleting your account will permanently remove:
          </Text>

          <View style={styles.list}>
            <Text style={styles.listItem}>• Your profile and personal information</Text>
            <Text style={styles.listItem}>• Your saved preferences and search zones</Text>
            <Text style={styles.listItem}>• Your swipe history and saved listings</Text>
            {isOwner && <Text style={styles.listItem}>• All your property listings (archived immediately)</Text>}
            {isOwner && <Text style={styles.listItem}>• Your listing photos</Text>}
            {isOwner && <Text style={styles.listItem}>• Any active paid plan (no refund)</Text>}
            <Text style={styles.listItem}>• Your message history will be anonymized</Text>
          </View>

          {isOwner && (
            <View style={styles.ownerWarning}>
              <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
              <Text style={styles.ownerWarningText}>
                Your active listings will be removed from the tenant feed immediately. Any paid plan time remaining will be forfeited.
              </Text>
            </View>
          )}

          <Text style={styles.confirmLabel}>
            Type <Text style={styles.confirmWord}>DELETE</Text> to confirm
          </Text>

          <TextInput
            style={styles.input}
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Type DELETE"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.deleteBtn, !canDelete && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.deleteBtnText}>Permanently Delete My Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel — Keep My Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: LAYOUT.padding.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.lg,
    gap: 8,
  },
  backText: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  body: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.sm,
  },
  list: {
    marginBottom: LAYOUT.padding.lg,
  },
  listItem: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  ownerWarning: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.warning + '1A',
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
  },
  ownerWarningText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    flex: 1,
    lineHeight: 20,
  },
  confirmLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.sm,
  },
  confirmWord: {
    fontFamily: FONTS.body.bold,
    color: COLORS.danger,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 14,
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.lg,
    letterSpacing: 2,
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  deleteBtnDisabled: {
    opacity: 0.4,
  },
  deleteBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  cancelBtn: {
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});
