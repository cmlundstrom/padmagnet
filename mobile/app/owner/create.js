import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { Header, Button, Input, Toggle } from '../../components/ui';
import StepProgress from '../../components/ui/StepProgress';
import AddressAutocomplete from '../../components/owner/AddressAutocomplete';
import { apiFetch } from '../../lib/api';
import { toTitleCase, toSentenceCase } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../providers/AlertProvider';
import { getDraftStep, saveDraftStep, clearDraftStep } from '../../lib/storage';
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
  const { draft_id } = useLocalSearchParams();
  const alert = useAlert();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftId, setDraftId] = useState(draft_id || null);

  const [loadingDraft, setLoadingDraft] = useState(!!draft_id);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUploadConfig, setPhotoUploadConfig] = useState(null);

  // Fetch photo upload feature config
  useEffect(() => {
    apiFetch('/api/products?audience=owner')
      .then(products => {
        const cfg = products?.find(p => p.feature_key === 'photo_upload_link' && p.is_active);
        if (cfg) setPhotoUploadConfig(cfg);
      })
      .catch(() => {});
  }, []);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Load existing draft data on mount
  useEffect(() => {
    if (!draft_id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(`/api/listings/${draft_id}`);
        if (cancelled) return;
        setForm({
          street_number: data.street_number || '',
          street_name: data.street_name || '',
          city: data.city || '',
          state_or_province: data.state_or_province || 'FL',
          postal_code: data.postal_code || '',
          property_sub_type: data.property_sub_type || '',
          list_price: data.list_price ? String(data.list_price) : '',
          bedrooms_total: data.bedrooms_total ? String(data.bedrooms_total) : '',
          bathrooms_total: data.bathrooms_total ? String(data.bathrooms_total) : '',
          living_area: data.living_area ? String(data.living_area) : '',
          year_built: data.year_built ? String(data.year_built) : '',
          public_remarks: data.public_remarks || '',
          lease_term: data.lease_term || '',
          available_date: data.available_date || '',
          pets_allowed: data.pets_allowed,
          fenced_yard: data.fenced_yard || false,
          furnished: data.furnished || false,
          hoa_fee: data.hoa_fee > 0 ? 'yes' : data.hoa_fee === 0 ? 'no' : '',
          parking_spaces: data.parking_spaces ? String(data.parking_spaces) : '',
          pool: data.pool || false,
          photos: data.photos || [],
          tenant_contact_instructions: data.tenant_contact_instructions || '',
          listing_agent_name: data.listing_agent_name || '',
          listing_agent_phone: data.listing_agent_phone || '',
          listing_agent_email: data.listing_agent_email || '',
        });
        // Restore saved step
        const savedStep = await getDraftStep(draft_id);
        if (!cancelled) setStep(savedStep);
      } catch {
        alert('Error', 'Could not load draft. Starting fresh.');
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => { cancelled = true; };
  }, [draft_id]);

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
    hoa_fee: form.hoa_fee === 'yes' ? 1 : form.hoa_fee === 'no' ? 0 : null,
    parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces, 10) : null,
    pool: form.pool,
    photos: form.photos.filter(p => p.url.startsWith('http')),
    tenant_contact_instructions: toSentenceCase(form.tenant_contact_instructions) || null,
    listing_agent_name: toTitleCase(form.listing_agent_name) || null,
    listing_agent_phone: form.listing_agent_phone || null,
    listing_agent_email: form.listing_agent_email?.trim()?.toLowerCase() || null,
    ...(statusOverride ? { status: statusOverride } : {}),
  }), [form]);


  // Create draft on first next from step 0
  const createDraft = async () => {
    if (draftId) return;
    try {
      const data = await apiFetch('/api/owner/listings', {
        method: 'POST',
        body: JSON.stringify({ ...buildPayload('draft'), status: 'draft' }),
      });
      setDraftId(data.id);
      saveDraftStep(data.id, 1); // Moving from step 0 to 1
    } catch { /* non-blocking — draft creation is optional */ }
  };

  const nextStep = async () => {
    if (step === 0) {
      const missing = [];
      if (!form.street_name) missing.push('Street Name');
      if (!form.city) missing.push('City');
      if (!form.state_or_province) missing.push('State');
      if (!form.postal_code) missing.push('Zip');
      if (missing.length) {
        alert('Required', `Please fill in: ${missing.join(', ')}`);
        return;
      }
    }
    if (step === 1) {
      const missing = [];
      if (!form.list_price) missing.push('Monthly Rent');
      if (!form.property_sub_type) missing.push('Property Type');
      if (!form.bedrooms_total) missing.push('Beds');
      if (!form.bathrooms_total) missing.push('Baths');
      if (!form.year_built) missing.push('Year Built');
      if (!form.living_area) missing.push('Sq/Ft');
      if (missing.length) {
        alert('Required', `Please fill in: ${missing.join(', ')}`);
        return;
      }
    }
    // Create draft on leaving step 0
    if (step === 0) await createDraft();
    if (step < STEPS.length - 1) {
      const newStep = step + 1;
      setStep(newStep);
      // Save draft immediately on every step change
      if (draftId) {
        saveDraftStep(draftId, newStep);
        apiFetch(`/api/owner/listings/${draftId}`, {
          method: 'PUT',
          body: JSON.stringify(buildPayload()),
        }).catch(() => {});
      }
    }
  };

  const prevStep = () => {
    if (step > 0) {
      const newStep = step - 1;
      setStep(newStep);
      if (draftId) {
        saveDraftStep(draftId, newStep);
        apiFetch(`/api/owner/listings/${draftId}`, {
          method: 'PUT',
          body: JSON.stringify(buildPayload()),
        }).catch(() => {});
      }
    }
  };

  // Upload photos to Supabase Storage via API
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 15 - form.photos.length,
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
        thumb_url: p.thumb_url,
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

  // Send desktop photo upload link via email
  const [linkSent, setLinkSent] = useState(false);
  const handleSendUploadLink = async () => {
    // Save current form state first
    if (draftId) {
      await apiFetch(`/api/owner/listings/${draftId}`, {
        method: 'PUT',
        body: JSON.stringify(buildPayload()),
      }).catch(() => {});
    }

    const { data: { user } } = await supabase.auth.getUser();
    alert(
      'Upload from Desktop',
      `Send a secure photo upload link to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            try {
              await apiFetch(`/api/owner/listings/${draftId}/upload-link`, {
                method: 'POST',
              });
              setLinkSent(true);
              alert('Link Sent!', 'Check your email. The link expires in 15 minutes.');
            } catch (err) {
              alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Realtime subscription for photos synced from desktop upload
  useEffect(() => {
    if (!draftId || step !== 5) return;
    const channel = supabase
      .channel(`listing-photos-${draftId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'listings',
        filter: `id=eq.${draftId}`,
      }, (payload) => {
        if (payload.new?.photos) {
          setForm(f => ({ ...f, photos: payload.new.photos }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [draftId, step]);

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

      if (draftId) clearDraftStep(draftId);
      alert('Success', 'Your listing has been created!', [
        { text: 'OK', onPress: () => router.replace('/(owner)/listings') },
      ]);
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const address = [form.street_number, form.street_name].filter(Boolean).join(' ');

  if (loadingDraft) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Create Listing" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={draft_id ? 'Edit Draft' : 'Create Listing'} showBack />

      {/* Step indicator */}
      <StepProgress current={step} steps={STEPS} />



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
              <Input label="State *" value={form.state_or_province} onChangeText={v => update('state_or_province', v)} placeholder="FL" autoCapitalize="characters" style={styles.shortInput} />
            </View>
            <Input label="Zip *" value={form.postal_code} onChangeText={v => update('postal_code', v)} placeholder="34994" keyboardType="numeric" />
          </>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <Input label="Monthly Rent *" value={form.list_price} onChangeText={v => update('list_price', v)} keyboardType="numeric" placeholder="2000" />
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
          </>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.hint}>Pitch the pad. What cool features in your rental or nearby hot spots really make it shine?</Text>
            <Input
              label="Describe Your Rental Property"
              labelStyle={{ color: COLORS.white }}
              value={form.public_remarks}
              onChangeText={v => update('public_remarks', v.slice(0, 500))}
              autoCapitalize="sentences"
              placeholder="Spacious 3-bed home with updated kitchen, close to downtown..."
              placeholderTextColor={COLORS.slate}
              multiline
              numberOfLines={6}
              maxLength={500}
              style={styles.textArea}
            />
            <Text style={styles.charCounter}><Text style={{ color: form.public_remarks.length > 500 ? COLORS.danger : COLORS.success, fontFamily: FONTS.body.regular, fontSize: FONT_SIZES.xs }}>{form.public_remarks.length}</Text>/500</Text>
          </>
        )}

        {/* Step 3: Lease */}
        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Lease Details</Text>
            <Text style={styles.fieldLabel}>Minimum Lease Term you will offer a Tenant?</Text>
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
            <Text style={styles.fieldLabel}>Is your Rental located in an Owner Association which will subject your Tenant to Association Application or Association Rules?</Text>
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
          </>
        )}

        {/* Step 4: Features */}
        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>Features</Text>
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
          </>
        )}

        {/* Step 5: Photos */}
        {step === 5 && (
          <>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.hint}>Add up to 15 photos of your property. Photos are uploaded immediately.</Text>
            <View style={styles.photoActionRow}>
              <Pressable style={styles.photoActionBtn} onPress={pickImages} disabled={form.photos.length >= 15 || uploading}>
                <FontAwesome name="mobile-phone" size={22} color={COLORS.white} />
                <Text style={styles.photoActionBtnText}>Add Photos from Phone</Text>
              </Pressable>
              <Pressable
                style={[styles.photoActionBtn, !draftId && { opacity: 0.4 }]}
                onPress={draftId ? handleSendUploadLink : null}
                disabled={!draftId}
              >
                <FontAwesome name="laptop" size={18} color={COLORS.white} />
                <Text style={styles.photoActionBtnText}>
                  {linkSent ? 'Resend Upload Link' : (photoUploadConfig?.metadata?.button_text || 'Upload Photos from Desktop/Laptop')}
                </Text>
              </Pressable>
            </View>
            {uploading && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
            {form.photos.length > 0 && (
              <Text style={styles.photoCount}>{form.photos.length} of 15 photos</Text>
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
  fieldLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  datePickerBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
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
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  photoActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.radius.md,
  },
  photoActionBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textAlign: 'center',
  },
  photoCount: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginBottom: 8,
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
  charCounter: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 8,
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
