import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Header, Button, Input } from '../../components/ui';
import StepProgress from '../../components/ui/StepProgress';
import AddressAutocomplete from '../../components/owner/AddressAutocomplete';
import { apiFetch } from '../../lib/api';
import { toTitleCase, toSentenceCase } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../constants/layout';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com';

const STEPS = ['Address', 'Details', 'Description', 'Lease', 'Features', 'Photos', 'Contact', 'Review'];

const PROPERTY_TYPES = ['Single Family', 'Apartment', 'Condo', 'Townhouse', 'Duplex', 'Villa', 'Mobile Home'];

const INITIAL_FORM = {
  street_number: '',
  street_name: '',
  city: '',
  state_or_province: 'FL',
  postal_code: '',
  property_sub_type: '',
  list_price: '',
  bedrooms_total: '',
  bathrooms_total: '',
  living_area: '',
  year_built: '',
  public_remarks: '',
  lease_term: '',
  available_date: '',
  pets_allowed: null,
  fenced_yard: false,
  furnished: false,
  hoa_fee: '',
  parking_spaces: '',
  pool: false,
  photos: [],
  tenant_contact_instructions: '',
  listing_agent_name: '',
  listing_agent_phone: '',
  listing_agent_email: '',
};

export default function CreateListingScreen() {
  const router = useRouter();
  const alert = useAlert();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const autoSaveTimer = useRef(null);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Build payload from form state — normalizes text casing before save
  const buildPayload = useCallback((statusOverride) => ({
    street_number: form.street_number?.trim() || null,
    street_name: toTitleCase(form.street_name) || null,
    city: toTitleCase(form.city) || null,
    postal_code: form.postal_code?.trim() || null,
    state_or_province: form.state_or_province?.trim()?.toUpperCase() || 'FL',
    property_sub_type: form.property_sub_type || null,
    list_price: form.list_price ? parseFloat(form.list_price) : null,
    bedrooms_total: form.bedrooms_total ? parseInt(form.bedrooms_total, 10) : null,
    bathrooms_total: form.bathrooms_total ? parseFloat(form.bathrooms_total) : null,
    living_area: form.living_area ? parseFloat(form.living_area) : null,
    year_built: form.year_built ? parseInt(form.year_built, 10) : null,
    public_remarks: toSentenceCase(form.public_remarks) || null,
    lease_term: form.lease_term || null,
    available_date: form.available_date || null,
    pets_allowed: form.pets_allowed,
    fenced_yard: form.fenced_yard,
    furnished: form.furnished,
    hoa_fee: form.hoa_fee ? parseFloat(form.hoa_fee) : null,
    parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces, 10) : null,
    pool: form.pool,
    photos: form.photos.filter(p => p.url.startsWith('http')),
    tenant_contact_instructions: toSentenceCase(form.tenant_contact_instructions) || null,
    listing_agent_name: toTitleCase(form.listing_agent_name) || null,
    listing_agent_phone: form.listing_agent_phone || null,
    listing_agent_email: form.listing_agent_email?.trim()?.toLowerCase() || null,
    ...(statusOverride ? { status: statusOverride } : {}),
  }), [form]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!draftId) return;
    autoSaveTimer.current = setInterval(async () => {
      try {
        await apiFetch(`/api/owner/listings/${draftId}`, {
          method: 'PUT',
          body: JSON.stringify(buildPayload()),
        });
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      } catch { /* silent auto-save failure */ }
    }, 30000);
    return () => clearInterval(autoSaveTimer.current);
  }, [draftId, buildPayload]);

  // Create draft on first next from step 0
  const createDraft = async () => {
    if (draftId) return;
    try {
      const data = await apiFetch('/api/owner/listings', {
        method: 'POST',
        body: JSON.stringify({ ...buildPayload('draft'), status: 'draft' }),
      });
      setDraftId(data.id);
    } catch { /* non-blocking — draft creation is optional */ }
  };

  const nextStep = async () => {
    if (step === 0 && (!form.street_name || !form.city)) {
      alert('Required', 'Street name and city are required.');
      return;
    }
    if (step === 1 && !form.list_price) {
      alert('Required', 'Monthly rent is required.');
      return;
    }
    // Create draft on leaving step 0
    if (step === 0) await createDraft();
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  // Upload photos to Supabase Storage via API
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
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      const uploaded = await res.json();
      const newPhotos = uploaded.map((p, i) => ({
        url: p.url,
        caption: '',
        order: form.photos.length + i,
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
    // Delete from storage if it's a remote URL
    if (photo.url.startsWith('http')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        await fetch(`${API_BASE}/api/owner/photos`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ urls: [photo.url] }),
        });
      } catch { /* best-effort delete */ }
    }
    update('photos', form.photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload('pending_payment');

      if (draftId) {
        // Update existing draft → pending_payment
        await apiFetch(`/api/owner/listings/${draftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Create new listing directly
        await apiFetch('/api/owner/listings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      alert('Success', 'Your listing has been created!', [
        { text: 'OK', onPress: () => router.replace('/owner/listings') },
      ]);
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const address = [form.street_number, form.street_name].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Create Listing" showBack />

      {/* Step indicator */}
      <StepProgress current={step} steps={STEPS} />

      {/* Draft saved indicator */}
      {draftSaved && (
        <View style={styles.draftBanner}>
          <Text style={styles.draftBannerText}>Draft saved</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Step 0: Address */}
        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>Property Address</Text>
            <AddressAutocomplete
              onSelect={(addr) => {
                update('street_number', addr.street_number || '');
                update('street_name', addr.street_name || '');
                update('city', addr.city || '');
                update('state_or_province', addr.state_or_province || 'FL');
                update('postal_code', addr.postal_code || '');
              }}
            />
            <View style={styles.row}>
              <Input label="Number" value={form.street_number} onChangeText={v => update('street_number', v)} placeholder="123" style={styles.shortInput} />
              <Input label="Street Name *" value={form.street_name} onChangeText={v => update('street_name', v)} placeholder="Main St" autoCapitalize="words" style={styles.flexInput} />
            </View>
            <View style={styles.row}>
              <Input label="City *" value={form.city} onChangeText={v => update('city', v)} placeholder="Stuart" autoCapitalize="words" style={styles.flexInput} />
              <Input label="State" value={form.state_or_province} onChangeText={v => update('state_or_province', v)} placeholder="FL" autoCapitalize="characters" style={styles.shortInput} />
            </View>
            <Input label="Zip" value={form.postal_code} onChangeText={v => update('postal_code', v)} placeholder="34994" keyboardType="numeric" />
          </>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <Input label="Monthly Rent *" value={form.list_price} onChangeText={v => update('list_price', v)} keyboardType="numeric" placeholder="2000" />
            <Text style={styles.label}>Property Type</Text>
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
              <Input label="Beds" value={form.bedrooms_total} onChangeText={v => update('bedrooms_total', v)} keyboardType="numeric" placeholder="3" style={styles.thirdInput} />
              <Input label="Baths" value={form.bathrooms_total} onChangeText={v => update('bathrooms_total', v)} keyboardType="numeric" placeholder="2" style={styles.thirdInput} />
              <Input label="Sqft" value={form.living_area} onChangeText={v => update('living_area', v)} keyboardType="numeric" placeholder="1200" style={styles.thirdInput} />
            </View>
            <Input label="Year Built" value={form.year_built} onChangeText={v => update('year_built', v)} keyboardType="numeric" placeholder="2005" />
          </>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.hint}>Describe your property to potential tenants. Mention unique features, nearby amenities, or anything that makes your place special.</Text>
            <Input
              label="Property Description"
              value={form.public_remarks}
              onChangeText={v => update('public_remarks', v)}
              autoCapitalize="sentences"
              placeholder="Spacious 3-bed home with updated kitchen, close to downtown..."
              multiline
              numberOfLines={6}
              style={styles.textArea}
            />
          </>
        )}

        {/* Step 3: Lease */}
        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Lease Details</Text>
            <Input label="Lease Term (months)" value={form.lease_term} onChangeText={v => update('lease_term', v)} keyboardType="numeric" placeholder="12" />
            <Input label="Available Date" value={form.available_date} onChangeText={v => update('available_date', v)} placeholder="YYYY-MM-DD" />
            <Input label="HOA Fee ($/mo)" value={form.hoa_fee} onChangeText={v => update('hoa_fee', v)} keyboardType="numeric" placeholder="0" />
          </>
        )}

        {/* Step 4: Features */}
        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>Features</Text>
            <Text style={styles.label}>Pets Allowed</Text>
            <View style={styles.chipRow}>
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }, { label: 'Unknown', value: null }].map(opt => (
                <Pressable
                  key={String(opt.value)}
                  style={[CHIP_STYLES.chip, form.pets_allowed === opt.value && CHIP_STYLES.chipActive]}
                  onPress={() => update('pets_allowed', opt.value)}
                >
                  <Text style={[CHIP_STYLES.chipText, form.pets_allowed === opt.value && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Fenced Yard</Text>
              <Switch value={form.fenced_yard} onValueChange={v => update('fenced_yard', v)} trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }} thumbColor={form.fenced_yard ? COLORS.accent : COLORS.slate} style={LAYOUT.switch} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Furnished</Text>
              <Switch value={form.furnished} onValueChange={v => update('furnished', v)} trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }} thumbColor={form.furnished ? COLORS.accent : COLORS.slate} style={LAYOUT.switch} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Pool</Text>
              <Switch value={form.pool} onValueChange={v => update('pool', v)} trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }} thumbColor={form.pool ? COLORS.accent : COLORS.slate} style={LAYOUT.switch} />
            </View>
            <Input label="Parking Spaces" value={form.parking_spaces} onChangeText={v => update('parking_spaces', v)} keyboardType="numeric" placeholder="2" />
          </>
        )}

        {/* Step 5: Photos */}
        {step === 5 && (
          <>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.hint}>Add up to 10 photos of your property. Photos are uploaded immediately.</Text>
            {uploading && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
            <View style={styles.photoGrid}>
              {form.photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo.url }} style={styles.photoImage} contentFit="cover" />
                  <Pressable style={styles.photoRemove} onPress={() => removePhoto(index)}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {form.photos.length < 10 && !uploading && (
                <Pressable style={styles.addPhotoBtn} onPress={pickImages}>
                  <Text style={styles.addPhotoText}>+</Text>
                  <Text style={styles.addPhotoLabel}>Add</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* Step 6: Contact */}
        {step === 6 && (
          <>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <Text style={styles.hint}>How should tenants reach you? Add contact instructions, a phone number, or agent details.</Text>
            <Input
              label="Contact Instructions"
              value={form.tenant_contact_instructions}
              onChangeText={v => update('tenant_contact_instructions', v)}
              autoCapitalize="sentences"
              placeholder="Call or text 555-123-4567, or email me at owner@email.com"
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
            <Input label="Agent Name (optional)" value={form.listing_agent_name} onChangeText={v => update('listing_agent_name', v)} placeholder="Jane Smith" autoCapitalize="words" />
            <Input label="Agent Phone (optional)" value={form.listing_agent_phone} onChangeText={v => update('listing_agent_phone', v)} placeholder="555-123-4567" keyboardType="phone-pad" />
            <Input label="Agent Email (optional)" value={form.listing_agent_email} onChangeText={v => update('listing_agent_email', v)} placeholder="agent@email.com" keyboardType="email-address" />
          </>
        )}

        {/* Step 7: Review */}
        {step === 7 && (
          <>
            <Text style={styles.sectionTitle}>Review Your Listing</Text>
            <View style={styles.reviewCard}>
              <ReviewRow label="Address" value={`${address}, ${form.city}, FL ${form.postal_code}`} />
              <ReviewRow label="Rent" value={form.list_price ? `$${form.list_price}/mo` : '—'} />
              <ReviewRow label="Type" value={form.property_sub_type || '—'} />
              <ReviewRow label="Beds / Baths" value={`${form.bedrooms_total || '—'} / ${form.bathrooms_total || '—'}`} />
              <ReviewRow label="Sqft" value={form.living_area || '—'} />
              <ReviewRow label="Description" value={form.public_remarks ? `${form.public_remarks.slice(0, 60)}...` : '—'} />
              <ReviewRow label="Lease" value={form.lease_term ? `${form.lease_term} months` : '—'} />
              <ReviewRow label="Pets" value={form.pets_allowed === true ? 'Yes' : form.pets_allowed === false ? 'No' : 'Unknown'} />
              <ReviewRow label="Furnished" value={form.furnished ? 'Yes' : 'No'} />
              <ReviewRow label="Photos" value={`${form.photos.length} photo${form.photos.length !== 1 ? 's' : ''}`} />
              <ReviewRow label="Contact" value={form.tenant_contact_instructions ? 'Provided' : form.listing_agent_name || '—'} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navBar}>
        {step > 0 && (
          <Button title="Back" variant="secondary" onPress={prevStep} style={styles.navButton} />
        )}
        <View style={styles.navSpacer} />
        {step < STEPS.length - 1 ? (
          <Button title="Next" onPress={nextStep} style={styles.navButton} />
        ) : (
          <Button title="Submit Listing" onPress={handleSubmit} loading={submitting} style={styles.navButton} />
        )}
      </View>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value }) {
  return (
    <View style={reviewStyles.row}>
      <Text style={reviewStyles.label}>{label}</Text>
      <Text style={reviewStyles.value}>{value}</Text>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  value: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.md,
  },
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.md,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  shortInput: {
    width: 90,
  },
  flexInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: LAYOUT.padding.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: (LAYOUT.window.width - 32 - 20) / 3,
    height: (LAYOUT.window.width - 32 - 20) / 3,
    borderRadius: LAYOUT.radius.sm,
    overflow: 'hidden',
  },
  photoImage: {
    flex: 1,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.heading.bold,
  },
  addPhotoBtn: {
    width: (LAYOUT.window.width - 32 - 20) / 3,
    height: (LAYOUT.window.width - 32 - 20) / 3,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 28,
    color: COLORS.textSecondary,
  },
  addPhotoLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: LAYOUT.padding.md,
  },
  uploadingText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  draftBanner: {
    backgroundColor: COLORS.success + '22',
    paddingVertical: 4,
    alignItems: 'center',
  },
  draftBannerText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
  },
  navBar: {
    flexDirection: 'row',
    padding: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.md + 50,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  navSpacer: {
    flex: 1,
  },
  navButton: {
    minWidth: 100,
  },
});
