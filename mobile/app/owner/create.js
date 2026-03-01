import { useState } from 'react';
import { ScrollView, View, Text, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Header, Button, Input } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const STEPS = ['Address', 'Details', 'Lease', 'Features', 'Photos', 'Review'];

const PROPERTY_TYPES = ['Apartment', 'Condo', 'Townhouse', 'Single Family', 'Duplex'];

const INITIAL_FORM = {
  street_number: '',
  street_name: '',
  city: '',
  postal_code: '',
  property_sub_type: '',
  list_price: '',
  bedrooms_total: '',
  bathrooms_total: '',
  living_area: '',
  year_built: '',
  lease_term: '',
  available_date: '',
  pets_allowed: null,
  fenced_yard: false,
  furnished: false,
  hoa_fee: '',
  parking_spaces: '',
  pool: false,
  photos: [],
  listing_agent_name: '',
  listing_agent_phone: '',
  listing_agent_email: '',
};

export default function CreateListingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const nextStep = () => {
    if (step === 0 && (!form.street_name || !form.city)) {
      Alert.alert('Required', 'Street name and city are required.');
      return;
    }
    if (step === 1 && !form.list_price) {
      Alert.alert('Required', 'Monthly rent is required.');
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((asset, i) => ({
        url: asset.uri,
        caption: '',
        order: form.photos.length + i,
      }));
      update('photos', [...form.photos, ...newPhotos]);
    }
  };

  const removePhoto = (index) => {
    update('photos', form.photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        street_number: form.street_number || null,
        street_name: form.street_name,
        city: form.city,
        postal_code: form.postal_code || null,
        state_or_province: 'FL',
        property_sub_type: form.property_sub_type || null,
        list_price: parseFloat(form.list_price),
        bedrooms_total: form.bedrooms_total ? parseInt(form.bedrooms_total, 10) : null,
        bathrooms_total: form.bathrooms_total ? parseFloat(form.bathrooms_total) : null,
        living_area: form.living_area ? parseFloat(form.living_area) : null,
        year_built: form.year_built ? parseInt(form.year_built, 10) : null,
        lease_term: form.lease_term || null,
        available_date: form.available_date || null,
        pets_allowed: form.pets_allowed,
        fenced_yard: form.fenced_yard,
        furnished: form.furnished,
        hoa_fee: form.hoa_fee ? parseFloat(form.hoa_fee) : null,
        parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces, 10) : null,
        pool: form.pool,
        photos: form.photos,
        listing_agent_name: form.listing_agent_name || null,
        listing_agent_phone: form.listing_agent_phone || null,
        listing_agent_email: form.listing_agent_email || null,
      };

      await apiFetch('/api/owner/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      Alert.alert('Success', 'Your listing has been created!', [
        { text: 'OK', onPress: () => router.replace('/owner/listings') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const address = [form.street_number, form.street_name].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Create Listing" showBack />

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]} />
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Step 0: Address */}
        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>Property Address</Text>
            <View style={styles.row}>
              <Input label="Number" value={form.street_number} onChangeText={v => update('street_number', v)} placeholder="123" style={styles.shortInput} />
              <Input label="Street Name *" value={form.street_name} onChangeText={v => update('street_name', v)} placeholder="Main St" style={styles.flexInput} />
            </View>
            <View style={styles.row}>
              <Input label="City *" value={form.city} onChangeText={v => update('city', v)} placeholder="Stuart" style={styles.flexInput} />
              <Input label="Zip" value={form.postal_code} onChangeText={v => update('postal_code', v)} placeholder="34994" keyboardType="numeric" style={styles.shortInput} />
            </View>
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
                  style={[styles.chip, form.property_sub_type === type && styles.chipActive]}
                  onPress={() => update('property_sub_type', form.property_sub_type === type ? '' : type)}
                >
                  <Text style={[styles.chipText, form.property_sub_type === type && styles.chipTextActive]}>{type}</Text>
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

        {/* Step 2: Lease */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Lease Details</Text>
            <Input label="Lease Term (months)" value={form.lease_term} onChangeText={v => update('lease_term', v)} keyboardType="numeric" placeholder="12" />
            <Input label="Available Date" value={form.available_date} onChangeText={v => update('available_date', v)} placeholder="YYYY-MM-DD" />
            <Input label="HOA Fee ($/mo)" value={form.hoa_fee} onChangeText={v => update('hoa_fee', v)} keyboardType="numeric" placeholder="0" />
          </>
        )}

        {/* Step 3: Features */}
        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Features</Text>
            <Text style={styles.label}>Pets Allowed</Text>
            <View style={styles.chipRow}>
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }, { label: 'Unknown', value: null }].map(opt => (
                <Pressable
                  key={String(opt.value)}
                  style={[styles.chip, form.pets_allowed === opt.value && styles.chipActive]}
                  onPress={() => update('pets_allowed', opt.value)}
                >
                  <Text style={[styles.chipText, form.pets_allowed === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Fenced Yard</Text>
              <Switch value={form.fenced_yard} onValueChange={v => update('fenced_yard', v)} trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }} thumbColor={form.fenced_yard ? COLORS.accent : COLORS.slate} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Furnished</Text>
              <Switch value={form.furnished} onValueChange={v => update('furnished', v)} trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }} thumbColor={form.furnished ? COLORS.accent : COLORS.slate} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Pool</Text>
              <Switch value={form.pool} onValueChange={v => update('pool', v)} trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }} thumbColor={form.pool ? COLORS.accent : COLORS.slate} />
            </View>
            <Input label="Parking Spaces" value={form.parking_spaces} onChangeText={v => update('parking_spaces', v)} keyboardType="numeric" placeholder="2" />
          </>
        )}

        {/* Step 4: Photos */}
        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.hint}>Add up to 10 photos of your property.</Text>
            <View style={styles.photoGrid}>
              {form.photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo.url }} style={styles.photoImage} contentFit="cover" />
                  <Pressable style={styles.photoRemove} onPress={() => removePhoto(index)}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {form.photos.length < 10 && (
                <Pressable style={styles.addPhotoBtn} onPress={pickImages}>
                  <Text style={styles.addPhotoText}>+</Text>
                  <Text style={styles.addPhotoLabel}>Add</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <>
            <Text style={styles.sectionTitle}>Review Your Listing</Text>
            <View style={styles.reviewCard}>
              <ReviewRow label="Address" value={`${address}, ${form.city}, FL ${form.postal_code}`} />
              <ReviewRow label="Rent" value={form.list_price ? `$${form.list_price}/mo` : '—'} />
              <ReviewRow label="Type" value={form.property_sub_type || '—'} />
              <ReviewRow label="Beds / Baths" value={`${form.bedrooms_total || '—'} / ${form.bathrooms_total || '—'}`} />
              <ReviewRow label="Sqft" value={form.living_area || '—'} />
              <ReviewRow label="Lease" value={form.lease_term ? `${form.lease_term} months` : '—'} />
              <ReviewRow label="Pets" value={form.pets_allowed === true ? 'Yes' : form.pets_allowed === false ? 'No' : 'Unknown'} />
              <ReviewRow label="Furnished" value={form.furnished ? 'Yes' : 'No'} />
              <ReviewRow label="Photos" value={`${form.photos.length} photo${form.photos.length !== 1 ? 's' : ''}`} />
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
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.accent,
  },
  stepLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
  },
  stepLabelActive: {
    color: COLORS.accent,
    fontFamily: FONTS.body.semiBold,
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
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  chipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.accent,
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
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
  },
  navBar: {
    flexDirection: 'row',
    padding: LAYOUT.padding.md,
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
