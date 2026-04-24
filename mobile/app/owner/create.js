import { useRef, useState, useEffect } from 'react';
import useAndroidBack from '../../hooks/useAndroidBack';
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Input, Toggle, EqualHousingBadge } from '../../components/ui';
import AddressAutocomplete from '../../components/owner/AddressAutocomplete';
import NotificationPreferences from '../../components/owner/NotificationPreferences';
import SmartCard from '../../components/owner/studio/SmartCard';
import StudioHeader from '../../components/owner/studio/StudioHeader';
import PreviewPill from '../../components/owner/studio/PreviewPill';
import ListingPreviewSheet from '../../components/owner/studio/ListingPreviewSheet';
import AskPadOrbOwner from '../../components/owner/studio/AskPadOrbOwner';
import NearbyRentalsCard from '../../components/owner/studio/NearbyRentalsCard';
import ConfettiOverlay from '../../components/owner/studio/ConfettiOverlay';
import StudioOnboardingTooltip from '../../components/owner/studio/StudioOnboardingTooltip';
import useListingStudio from '../../hooks/useListingStudio';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../constants/layout';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com';
const PROPERTY_TYPES = ['Single Family', 'Apartment', 'Condo', 'Townhouse', 'Duplex', 'Villa', 'Mobile Home'];

export default function MagicListingStudio() {
  useAndroidBack();
  const router = useRouter();
  const { draft_id } = useLocalSearchParams();
  const alert = useAlert();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const notifPrefsRef = useRef(null);
  const scrollRef = useRef(null);

  // Card refs for scroll-to on validation error
  const cardRefs = useRef({});

  const studio = useListingStudio(draft_id);
  const { form, update, updatePhone, updateMany, completionMap, completionPercent,
    contactPref, setContactPref, aiLoading, loading, submitting,
    createDraft, generateDescription, generateFromPhotos,
    suggestAmenities, publish, buildPayload, draftId, coords, setCoords } = studio;

  // ── Local UI state ──
  const [uploading, setUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiDescUses, setAiDescUses] = useState(0);
  const AI_DESC_LIMIT = 8;

  // Persist AI description usage with 24-hour reset
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('padmagnet_ai_desc_usage');
        if (raw) {
          const { count, resetDate } = JSON.parse(raw);
          const now = new Date();
          if (new Date(resetDate) > now) {
            setAiDescUses(count);
          } else {
            // 24 hours expired — reset
            await AsyncStorage.removeItem('padmagnet_ai_desc_usage');
          }
        }
      } catch {}
    })();
  }, []);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showComps, setShowComps] = useState(false);

  // ── Photo upload ──
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - form.photos.length,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const formData = new FormData();
      result.assets.forEach((asset) => {
        const ext = asset.uri.split('.').pop() || 'jpg';
        formData.append('photos', {
          uri: asset.uri,
          type: asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          name: `photo.${ext}`,
        });
      });
      const res = await fetch(`${API_BASE}/api/owner/photos`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      const uploaded = await res.json();
      const newPhotos = uploaded.map((p, i) => ({
        url: p.url, thumb_url: p.thumb_url, caption: '', order: form.photos.length + i,
      }));
      update('photos', [...form.photos, ...newPhotos]);
    } catch (err) {
      alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (index) => {
    const photo = form.photos[index];
    if (photo.url.startsWith('http')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        await fetch(`${API_BASE}/api/owner/photos`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ urls: [photo.url] }),
        });
      } catch {}
    }
    update('photos', form.photos.filter((_, i) => i !== index));
  };

  // ── Desktop upload link ──
  // Show the confirm dialog immediately using the in-memory auth email.
  // The draft creation + upload-link API call are deferred behind the
  // user's tap on "Send Link" — previously both roundtrips ran on press,
  // producing a 3s lag before the dialog even opened.
  const handleSendUploadLink = () => {
    const emailLabel = user?.email || 'your email';
    alert('Upload from Desktop', `Send a secure photo upload link to ${emailLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Link',
        onPress: async () => {
          try {
            let id = draftId;
            if (!id) id = await createDraft();
            if (!id) { alert('Error', 'Please fill in an address first.'); return; }
            await apiFetch(`/api/owner/listings/${id}/upload-link`, { method: 'POST' });
            setLinkSent(true);
            alert('Link Sent!', 'Check your email. The link expires in 45 minutes.');
          } catch (err) { alert('Error', err.message); }
        },
      },
    ]);
  };

  // ── Realtime photo sync from desktop ──
  useEffect(() => {
    if (!draftId) return;
    const channel = supabase
      .channel(`listing-photos-${draftId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'listings', filter: `id=eq.${draftId}`,
      }, (payload) => {
        if (payload.new?.photos) update('photos', payload.new.photos);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [draftId]);

  // ── Publish ──
  const handlePublish = async () => {
    // Ensure a draft row exists, then pass its id explicitly into publish().
    // createDraft()'s setDraftId has not flushed to the publish closure yet
    // at this point, so relying on the hook's memoized draftId would POST a
    // second row. See useListingStudio.publish idOverride comment.
    let id = draftId;
    if (!id) id = await createDraft();

    const result = await publish(id, notifPrefsRef, alert, router.replace);
    if (result.success) {
      setShowConfetti(true);
    } else if (result.firstErrorCard) {
      // Scroll to first error card - the validation alert is already shown by publish()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StudioHeader title="Listing Studio" completionPercent={0} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header with progress ring ── */}
      <StudioHeader
        title={draft_id ? 'Edit Draft' : 'Listing Studio'}
        completionPercent={completionPercent}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Address Card ── */}
          <SmartCard
            title="Property Address"
            icon="location"
            completion={completionMap.address}
            defaultOpen
            cardRef={r => { cardRefs.current.address = r; }}
          >
            <AddressAutocomplete
              onSelect={(addr) => {
                updateMany({
                  street_number: addr.street_number || '',
                  street_name: addr.street_name || '',
                  city: addr.city || '',
                  state_or_province: addr.state_or_province || 'FL',
                  postal_code: addr.postal_code || '',
                });
                if (addr.latitude && addr.longitude) {
                  setCoords({ latitude: addr.latitude, longitude: addr.longitude });
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            />
            <View style={styles.row}>
              <Input label="Number" value={form.street_number} onChangeText={v => update('street_number', v)} placeholder="123" style={styles.shortInput} />
              <Input testID="owner-create-address-input" label="Street Name *" value={form.street_name} onChangeText={v => update('street_name', v)} placeholder="Main St" autoCapitalize="words" style={styles.flexInput} />
            </View>
            <View style={styles.row}>
              <Input label="City *" value={form.city} onChangeText={v => update('city', v)} placeholder="Stuart" autoCapitalize="words" style={styles.flexInput} />
              <Input label="State *" value={form.state_or_province} onChangeText={v => update('state_or_province', v)} placeholder="FL" autoCapitalize="characters" style={styles.shortInput} />
            </View>
            <Input label="Zip *" value={form.postal_code} onChangeText={v => update('postal_code', v)} placeholder="34994" keyboardType="numeric" />
          </SmartCard>

          {/* ── 2. Details Card ── */}
          <SmartCard
            title="Property Details"
            icon="home"
            completion={completionMap.details}
            cardRef={r => { cardRefs.current.details = r; }}
          >
            <Input testID="owner-create-price-input" label="Monthly Rent *" value={form.list_price} onChangeText={v => update('list_price', v)} keyboardType="numeric" placeholder="2000" />
            <Text style={styles.label}>Property Type *</Text>
            <View style={styles.chipRow}>
              {PROPERTY_TYPES.map(type => (
                <Pressable
                  key={type}
                  style={[CHIP_STYLES.chip, form.property_sub_type === type && CHIP_STYLES.chipActive]}
                  onPress={() => update('property_sub_type', form.property_sub_type === type ? '' : type)}
                >
                  <Text style={[CHIP_STYLES.chipText, form.property_sub_type === type && CHIP_STYLES.chipTextActive]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <Input label="Beds *" value={form.bedrooms_total} onChangeText={v => update('bedrooms_total', v)} keyboardType="numeric" placeholder="3" style={styles.thirdInput} />
              <Input label="Baths *" value={form.bathrooms_total} onChangeText={v => update('bathrooms_total', v)} keyboardType="numeric" placeholder="2" style={styles.thirdInput} />
              <Input label="Sq/Ft *" value={form.living_area} onChangeText={v => update('living_area', v)} keyboardType="numeric" placeholder="1200" style={styles.thirdInput} />
            </View>
            <Input label="Year Built *" value={form.year_built} onChangeText={v => update('year_built', v)} keyboardType="numeric" placeholder="2005" />

            <Pressable style={styles.compsBtn} onPress={() => setShowComps(true)}>
              <LinearGradient
                colors={[COLORS.accent, '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.compsBtnGradient}
              >
                <Ionicons name="stats-chart" size={18} color={COLORS.white} />
                <Text style={styles.compsBtnText}>See what similar properties are renting for near your address</Text>
              </LinearGradient>
            </Pressable>
          </SmartCard>

          {/* ── 3. Description Card ── */}
          <SmartCard
            title="Description"
            icon="create"
            completion={completionMap.description}
            cardRef={r => { cardRefs.current.description = r; }}
          >
            <Text style={styles.hint}>Pitch the Pad. Pitch the Location. What makes it shine?!</Text>
            <View style={styles.aiRow}>
              <Pressable
                style={[styles.aiButton, aiDescUses >= AI_DESC_LIMIT && { opacity: 0.4 }, aiLoading && { opacity: 0.6 }]}
                onPress={async () => {
                  if (aiDescUses >= AI_DESC_LIMIT || aiLoading) return;
                  const result = await generateDescription();
                  if (result) {
                    const newCount = aiDescUses + 1;
                    setAiDescUses(newCount);
                    const resetDate = new Date();
                    resetDate.setHours(resetDate.getHours() + 24);
                    AsyncStorage.setItem('padmagnet_ai_desc_usage', JSON.stringify({ count: newCount, resetDate: resetDate.toISOString() }));
                  }
                }}
                disabled={aiLoading || aiDescUses >= AI_DESC_LIMIT}
              >
                <Image source={require('../../assets/images/askpad-orb.png')} style={styles.aiOrbIcon} contentFit="contain" />
                <Text style={styles.aiButtonText}>
                  {aiDescUses >= AI_DESC_LIMIT ? 'Limit reached' : 'Let AskPad Write This'}
                </Text>
              </Pressable>
              {aiLoading && <ActivityIndicator size="small" color={COLORS.brandOrange} />}
              <Text style={styles.aiUseCounter}>{AI_DESC_LIMIT - aiDescUses} left</Text>
            </View>
            <Input
              label="Describe Your Rental Property"
              value={form.public_remarks}
              onChangeText={v => update('public_remarks', v.slice(0, 500))}
              autoCapitalize="sentences"
              placeholder="Spacious 3-bed home with updated kitchen..."
              multiline
              numberOfLines={7}
              maxLength={500}
              scrollEnabled={false}
              style={styles.textAreaGrow}
            />
            <Text style={styles.charCounter}>
              <Text style={{ color: form.public_remarks.length > 450 ? COLORS.warning : COLORS.success }}>{form.public_remarks.length}</Text>/500
            </Text>
          </SmartCard>

          {/* ── 4. Lease Card ── */}
          <SmartCard
            title="Lease Terms"
            icon="document-text"
            completion={completionMap.lease}
            cardRef={r => { cardRefs.current.lease = r; }}
          >
            <Text style={styles.fieldLabel}>Minimum Lease Term</Text>
            <View style={styles.chipRow}>
              {[{ label: '3 Months', value: '3' }, { label: '6 Months + 1 Day', value: '6' }, { label: '12 Months', value: '12' }].map(opt => (
                <Pressable
                  key={opt.value}
                  style={[CHIP_STYLES.chip, form.lease_term === opt.value && CHIP_STYLES.chipActive]}
                  onPress={() => update('lease_term', opt.value)}
                >
                  <Text style={[CHIP_STYLES.chipText, form.lease_term === opt.value && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Available Date</Text>
            <Pressable style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={form.available_date ? styles.datePickerText : styles.datePickerPlaceholder}>
                {form.available_date || 'Select a date'}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={form.available_date ? new Date(form.available_date + 'T00:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                themeVariant="dark"
                accentColor={COLORS.accent}
                textColor={COLORS.white}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    const yyyy = selectedDate.getFullYear();
                    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(selectedDate.getDate()).padStart(2, '0');
                    update('available_date', `${yyyy}-${mm}-${dd}`);
                  }
                }}
              />
            )}
            <Text style={styles.fieldLabel}>HOA / Owner Association?</Text>
            <View style={styles.chipRow}>
              {[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }].map(opt => (
                <Pressable
                  key={opt.value}
                  style={[CHIP_STYLES.chip, form.hoa_fee === opt.value && CHIP_STYLES.chipActive]}
                  onPress={() => update('hoa_fee', opt.value)}
                >
                  <Text style={[CHIP_STYLES.chipText, form.hoa_fee === opt.value && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </SmartCard>

          {/* ── 5. Features Card ── */}
          <SmartCard
            title="Features & Amenities"
            icon="options"
            completion={completionMap.features}
            cardRef={r => { cardRefs.current.features = r; }}
          >
            <Text style={styles.label}>Pets Allowed</Text>
            <View style={styles.chipRow}>
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                <Pressable
                  key={String(opt.value)}
                  style={[CHIP_STYLES.chip, form.pets_allowed === opt.value && CHIP_STYLES.chipActive]}
                  onPress={() => update('pets_allowed', opt.value)}
                >
                  <Text style={[CHIP_STYLES.chipText, form.pets_allowed === opt.value && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Toggle label="Fenced Yard" value={form.fenced_yard} onValueChange={v => update('fenced_yard', v)} />
            <Toggle label="Furnished" value={form.furnished} onValueChange={v => update('furnished', v)} />
            <Toggle label="Pool" value={form.pool} onValueChange={v => update('pool', v)} />
            <Input label="Parking Spaces" value={form.parking_spaces} onChangeText={v => update('parking_spaces', v)} keyboardType="numeric" placeholder="2" />
          </SmartCard>

          {/* ── 6. Photos Card ── */}
          <SmartCard
            title="Photos"
            icon="images"
            completion={completionMap.photos}
            cardRef={r => { cardRefs.current.photos = r; }}
          >
            <Text style={styles.hint}>Great photos get 3x more inquiries. Add up to 10.</Text>
            <View style={styles.photoActionRow}>
              <Pressable style={styles.photoActionBtn} onPress={pickImages} disabled={form.photos.length >= 10 || uploading}>
                <FontAwesome name="mobile-phone" size={22} color={COLORS.white} />
                <Text style={styles.photoActionBtnText}>Add from Phone</Text>
              </Pressable>
              <Pressable style={styles.photoActionBtn} onPress={handleSendUploadLink}>
                <FontAwesome name="laptop" size={18} color={COLORS.white} />
                <Text style={styles.photoActionBtnText}>{linkSent ? 'Resend Link' : 'Upload from Desktop'}</Text>
              </Pressable>
            </View>
            <Text style={styles.photoTip}>Listings without photos have near zero probability of renting. Ensure you upload your photos and make them amazing!</Text>
            {uploading && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
            {form.photos.length > 0 && (
              <Text style={styles.photoCount}>{form.photos.length} of 10 photos</Text>
            )}
            <View style={styles.photoGrid}>
              {form.photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo.url }} style={styles.photoImage} contentFit="cover" />
                  <Pressable style={styles.photoRemove} onPress={() => removePhoto(index)}>
                    <Text style={styles.photoRemoveText}>{'\u2715'}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </SmartCard>

          {/* ── 7. Contact Card ── */}
          <SmartCard
            title="Contact & Notifications"
            icon="call"
            completion={completionMap.contact}
            cardRef={r => { cardRefs.current.contact = r; }}
          >
            <Text style={styles.hint}>How renters will reach you. We pre-filled from your profile — edit any field to change it.</Text>
            <Input label="Your Name" value={form.listing_agent_name} onChangeText={v => update('listing_agent_name', v)} placeholder="Your full name" autoCapitalize="words" />
            <Text style={styles.chipLabel}>Preferred Contact Method *</Text>
            <View style={styles.chipRow}>
              {[{ key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'both', label: 'Both' }].map(opt => (
                <Pressable
                  key={opt.key}
                  style={[CHIP_STYLES.chip, contactPref === opt.key && CHIP_STYLES.chipActive]}
                  onPress={() => {
                    setContactPref(opt.key);
                    if (opt.key === 'email') update('listing_agent_phone', '');
                  }}
                >
                  <Text style={[CHIP_STYLES.chipText, contactPref === opt.key && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Input
              label="Email for Renters"
              value={form.listing_agent_email}
              onChangeText={v => update('listing_agent_email', v)}
              onBlur={() => update('listing_agent_email', form.listing_agent_email?.trim().toLowerCase())}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Inquiries route here. Change it to send them to a property manager or different agent.</Text>
            {(contactPref === 'phone' || contactPref === 'both') && (
              <Input
                label="Phone Number for Renters *"
                value={form.listing_agent_phone}
                onChangeText={v => updatePhone(v)}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            )}
            <Input
              label="Contact Instructions"
              value={form.tenant_contact_instructions}
              onChangeText={v => update('tenant_contact_instructions', v)}
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
            <View style={{ marginTop: 16 }}>
              <NotificationPreferences ref={notifPrefsRef} compact context="wizard" />
            </View>
          </SmartCard>

          <EqualHousingBadge style={{ marginTop: 8, marginBottom: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Floating action panel — rides above phone nav bar ── */}
      {!showPreview && (
      <View style={[styles.floatingPanel, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>
        <View style={styles.floatingProgress}>
          <View style={[styles.floatingProgressFill, { width: `${completionPercent}%` }]} />
        </View>
        <View style={styles.floatingActions}>
          <Pressable
            style={styles.floatingOrbBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              alert('AskPad', 'AskPad can help you write descriptions, suggest pricing, and fill in amenities. Try the orb buttons inside each card!');
            }}
          >
            <Image source={require('../../assets/images/askpad-orb.png')} style={styles.floatingOrbImg} contentFit="contain" />
          </Pressable>
          <PreviewPill
            firstPhoto={form.photos?.[0]?.url}
            completionPercent={completionPercent}
            onPress={() => { setShowPreview(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
          <Pressable testID="owner-create-submit-cta" style={styles.floatingPublishBtn} onPress={handlePublish} disabled={submitting}>
            <LinearGradient
              colors={['#F97316', COLORS.logoOrange, '#DC5A2C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingPublishGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.floatingPublishText}>Publish</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
      )}

      {/* ── Live Preview Sheet ── */}
      <ListingPreviewSheet
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        form={form}
      />

      {/* ── Nearby Rentals Comp Card ── */}
      <NearbyRentalsCard
        visible={showComps}
        onClose={() => setShowComps(false)}
        form={form}
        coords={coords}
      />

      {/* ── Confetti on publish ── */}
      <ConfettiOverlay
        visible={showConfetti}
        onFinish={() => {
          setShowConfetti(false);
          router.replace('/(owner)/listings');
        }}
      />

      {/* ── First-time onboarding ── */}
      <StudioOnboardingTooltip
        visible={!studio.hasOnboarded}
        onDismiss={studio.markOnboarded}
      />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────
// Reusing patterns from old wizard + new studio additions

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: 130,
  },
  // ── Shared field styles ──
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  shortInput: { width: 80 },
  flexInput: { flex: 1 },
  thirdInput: { flex: 1 },
  label: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  chipLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaGrow: {
    minHeight: 60,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  charCounter: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  // ── AI buttons ──
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 1,
  },
  aiButtonVision: {
    borderColor: COLORS.accent + '55',
  },
  aiOrbIcon: {
    width: 20,
    height: 20,
  },
  aiButtonText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
    flex: 1,
  },
  aiUseCounter: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
  },
  // ── Comps ──
  compsBtn: {
    marginTop: 12,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  compsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  compsBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    flexShrink: 1,
  },
  // ── Date picker ──
  datePickerBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  datePickerText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  datePickerPlaceholder: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.slate,
  },
  // ── Photos ──
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 70,
  },
  photoActionBtnText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 4,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  uploadingText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  photoTip: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
    lineHeight: 18,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  photoCount: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: 90,
    height: 90,
    borderRadius: LAYOUT.radius.sm,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  // ── Contact ──
  prefillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 8,
  },
  prefillBtnText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  // ── Floating action panel ──
  floatingPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11,29,58,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(52,100,160,0.4)',
    paddingTop: 6,
    paddingHorizontal: LAYOUT.padding.md,
  },
  floatingProgress: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  floatingProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  floatingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingOrbBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  floatingOrbImg: {
    width: 26,
    height: 26,
  },
  floatingPublishBtn: {
    flex: 1,
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingPublishGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPublishText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
