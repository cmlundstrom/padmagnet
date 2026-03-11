import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { Header, Button, Input, Toggle } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { toTitleCase, toSentenceCase } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../constants/layout';

const PROPERTY_TYPES = ['Single Family', 'Apartment', 'Condo', 'Townhouse', 'Duplex', 'Villa', 'Mobile Home'];
const TABS = ['Details', 'Photos', 'Contact'];

// Phone formatter: (XXX) XXX-XXXX
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function EditListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const alert = useAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [contactPref, setContactPref] = useState('email');
  const [linkSent, setLinkSent] = useState(false);

  const [form, setForm] = useState({});
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Load listing data
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await apiFetch(`/api/owner/listings/${id}`);
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
        // Infer contact preference
        if (data.listing_agent_phone && data.listing_agent_email) setContactPref('both');
        else if (data.listing_agent_phone) setContactPref('phone');
        else setContactPref('email');
      } catch (err) {
        alert('Error', 'Could not load listing.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Realtime photo sync from desktop upload
  useEffect(() => {
    if (!id || tab !== 1) return;
    const channel = supabase
      .channel(`edit-photos-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'listings',
        filter: `id=eq.${id}`,
      }, (payload) => {
        if (payload.new?.photos) {
          setForm(f => ({ ...f, photos: payload.new.photos }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, tab]);

  // Build payload (same normalization as create)
  const buildPayload = useCallback(() => ({
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
    photos: form.photos?.filter(p => p.url?.startsWith('http')),
    tenant_contact_instructions: toSentenceCase(form.tenant_contact_instructions) || null,
    listing_agent_name: toTitleCase(form.listing_agent_name) || null,
    listing_agent_phone: form.listing_agent_phone || null,
    listing_agent_email: form.listing_agent_email?.trim()?.toLowerCase() || null,
  }), [form]);

  // Validate before save
  const validate = () => {
    const missing = [];
    if (!form.list_price) missing.push('Monthly Rent');
    if (!form.property_sub_type) missing.push('Property Type');
    if (!form.bedrooms_total) missing.push('Beds');
    if (!form.bathrooms_total) missing.push('Baths');
    if (!form.year_built) missing.push('Year Built');
    if (!form.living_area) missing.push('Sq/Ft');
    if (missing.length) {
      alert('Required', `Please fill in: ${missing.join(', ')}`);
      return false;
    }
    if (form.listing_agent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.listing_agent_email)) {
      alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if ((contactPref === 'phone' || contactPref === 'both') && (!form.listing_agent_phone || form.listing_agent_phone.replace(/\D/g, '').length < 10)) {
      alert('Invalid Phone', 'Please enter a complete 10-digit phone number.');
      return false;
    }
    return true;
  };

  // Save changes
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/owner/listings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(buildPayload()),
      });
      alert('Saved', 'Your listing has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Photo upload from phone
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 15 - (form.photos?.length || 0),
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
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com'}/api/owner/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(JSON.parse(text)?.error || 'Upload failed');
      }
      const uploaded = await res.json();
      const newPhotos = [...(form.photos || []), ...uploaded.map((u, i) => ({
        url: u.url,
        thumb_url: u.thumb_url,
        caption: '',
        order: (form.photos?.length || 0) + i,
      }))];
      update('photos', newPhotos);
      // Save photos to listing immediately
      await apiFetch(`/api/owner/listings/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ photos: newPhotos }),
      });
    } catch (err) {
      alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete photo
  const deletePhoto = async (index) => {
    const photo = form.photos[index];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com'}/api/owner/photos`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: [photo.url] }),
      });
    } catch { /* best effort */ }
    const newPhotos = form.photos.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i }));
    update('photos', newPhotos);
    await apiFetch(`/api/owner/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ photos: newPhotos }),
    }).catch(() => {});
  };

  // Set hero (move photo to position 0)
  const setHero = (index) => {
    if (index === 0) return;
    const photos = [...form.photos];
    const [hero] = photos.splice(index, 1);
    photos.unshift(hero);
    const reordered = photos.map((p, i) => ({ ...p, order: i }));
    update('photos', reordered);
    apiFetch(`/api/owner/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ photos: reordered }),
    }).catch(() => {});
  };

  // Drag reorder
  const handleDragEnd = ({ data }) => {
    const reordered = data.map((p, i) => ({ ...p, order: i }));
    update('photos', reordered);
    apiFetch(`/api/owner/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ photos: reordered }),
    }).catch(() => {});
  };

  // Replace all photos
  const handleReplaceAll = () => {
    alert('Replace All Photos', 'This will remove all current photos. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          // Delete all from storage
          const urls = form.photos.map(p => p.url);
          if (urls.length) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com'}/api/owner/photos`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${session?.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls }),
              });
            } catch { /* best effort */ }
          }
          update('photos', []);
          await apiFetch(`/api/owner/listings/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ photos: [] }),
          }).catch(() => {});
          // Open picker right away
          pickImages();
        },
      },
    ]);
  };

  // Send desktop upload link
  const handleSendUploadLink = async () => {
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
              await apiFetch(`/api/owner/listings/${id}/upload-link`, { method: 'POST' });
              setLinkSent(true);
              alert('Link Sent!', 'Check your email. The link expires in 45 minutes.');
            } catch (err) {
              alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const address = [form.street_number, form.street_name].filter(Boolean).join(' ');
  const fullAddress = [address, form.city, form.state_or_province, form.postal_code].filter(Boolean).join(', ');
  const descLen = form.public_remarks?.length || 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Edit Listing" showBack />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header title="Edit Listing" showBack />

      {/* Address banner */}
      <View style={styles.addressBanner}>
        <Text style={[styles.addressText, { paddingLeft: 4 }]} numberOfLines={1}>{address || 'No address'}</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((label, i) => (
          <Pressable key={label} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Details Tab */}
      {tab === 0 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>Property Details</Text>
          <Input label="Monthly Rent *" value={form.list_price} onChangeText={v => update('list_price', v)} placeholder="2500" keyboardType="numeric" />
          <Text style={styles.chipLabel}>Property Type *</Text>
          <View style={styles.chipRow}>
            {PROPERTY_TYPES.map(t => (
              <Pressable key={t} style={[CHIP_STYLES.chip, form.property_sub_type === t && CHIP_STYLES.chipActive]} onPress={() => update('property_sub_type', t)}>
                <Text style={[CHIP_STYLES.chipText, form.property_sub_type === t && CHIP_STYLES.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <Input label="Beds *" value={form.bedrooms_total} onChangeText={v => update('bedrooms_total', v)} placeholder="3" keyboardType="numeric" style={styles.flex1} />
            <Input label="Baths *" value={form.bathrooms_total} onChangeText={v => update('bathrooms_total', v)} placeholder="2" keyboardType="numeric" style={styles.flex1} />
          </View>
          <View style={styles.row}>
            <Input label="Sq/Ft *" value={form.living_area} onChangeText={v => update('living_area', v)} placeholder="1200" keyboardType="numeric" style={styles.flex1} />
            <Input label="Year Built *" value={form.year_built} onChangeText={v => update('year_built', v)} placeholder="2005" keyboardType="numeric" style={styles.flex1} />
          </View>

          <Text style={styles.sectionHeader}>Description</Text>
          <Input
            label="Describe Your Rental Property"
            labelStyle={{ color: COLORS.white }}
            value={form.public_remarks}
            onChangeText={v => update('public_remarks', v.slice(0, 500))}
            placeholder="Pitch the pad. What cool features in your rental or nearby hot spots really make it shine?"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            maxLength={500}
          />
          <Text style={styles.charCounter}>
            <Text style={{ color: descLen > 500 ? COLORS.danger : COLORS.success }}>{descLen}</Text>
            <Text style={{ color: COLORS.slate }}> / 500</Text>
          </Text>

          <Text style={styles.sectionHeader}>Lease Terms</Text>
          <Text style={styles.chipLabel}>Minimum Lease Term</Text>
          <View style={styles.chipRow}>
            {[{ key: '3', label: '3 Months' }, { key: '6', label: '6 Months' }, { key: '12', label: '12 Months' }].map(opt => (
              <Pressable key={opt.key} style={[CHIP_STYLES.chip, form.lease_term === opt.key && CHIP_STYLES.chipActive]} onPress={() => update('lease_term', form.lease_term === opt.key ? '' : opt.key)}>
                <Text style={[CHIP_STYLES.chipText, form.lease_term === opt.key && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.chipLabel}>Available Date</Text>
          <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <FontAwesome name="calendar" size={14} color={COLORS.accent} />
            <Text style={styles.dateBtnText}>{form.available_date || 'Select date'}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={form.available_date ? new Date(form.available_date + 'T00:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              themeVariant="dark"
              onChange={(e, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const d = String(date.getDate()).padStart(2, '0');
                  update('available_date', `${y}-${m}-${d}`);
                }
              }}
            />
          )}

          <Text style={styles.chipLabel}>Association (HOA)?</Text>
          <View style={styles.chipRow}>
            {[{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }].map(opt => (
              <Pressable key={opt.key} style={[CHIP_STYLES.chip, form.hoa_fee === opt.key && CHIP_STYLES.chipActive]} onPress={() => update('hoa_fee', form.hoa_fee === opt.key ? '' : opt.key)}>
                <Text style={[CHIP_STYLES.chipText, form.hoa_fee === opt.key && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionHeader}>Features</Text>
          <Text style={styles.chipLabel}>Pets Allowed</Text>
          <View style={styles.chipRow}>
            {[{ key: true, label: 'Yes' }, { key: false, label: 'No' }].map(opt => (
              <Pressable key={String(opt.key)} style={[CHIP_STYLES.chip, form.pets_allowed === opt.key && CHIP_STYLES.chipActive]} onPress={() => update('pets_allowed', form.pets_allowed === opt.key ? null : opt.key)}>
                <Text style={[CHIP_STYLES.chipText, form.pets_allowed === opt.key && CHIP_STYLES.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Toggle label="Fenced Yard" value={form.fenced_yard} onValueChange={v => update('fenced_yard', v)} />
          <Toggle label="Furnished" value={form.furnished} onValueChange={v => update('furnished', v)} />
          <Toggle label="Pool" value={form.pool} onValueChange={v => update('pool', v)} />
          <Input label="Parking Spaces" value={form.parking_spaces} onChangeText={v => update('parking_spaces', v)} placeholder="2" keyboardType="numeric" />

          <View style={styles.saveWrap}>
            <Button title="Save Changes" onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>
      )}

      {/* Photos Tab */}
      {tab === 1 && (
        <View style={styles.photosContainer}>
          <View style={styles.photoActionRow}>
            <Pressable style={styles.photoActionBtn} onPress={pickImages} disabled={uploading || (form.photos?.length || 0) >= 15}>
              <FontAwesome name="mobile-phone" size={22} color={COLORS.white} />
              <Text style={styles.photoActionBtnText}>Add Photos from Phone</Text>
            </Pressable>
            <Pressable style={styles.photoActionBtn} onPress={handleSendUploadLink}>
              <FontAwesome name="laptop" size={18} color={COLORS.white} />
              <Text style={styles.photoActionBtnText}>{linkSent ? 'Resend Upload Link' : 'Upload Photos from Desktop/Laptop'}</Text>
            </Pressable>
          </View>
          <Text style={styles.photoCount}>{form.photos?.length || 0} of 15 photos · Long-press to reorder · Tap <Text style={{ color: COLORS.warning }}>Star <FontAwesome name="star" size={11} color={COLORS.warning} /></Text> for Hero Image</Text>
          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
          <DraggableFlatList
            data={form.photos || []}
            keyExtractor={(item, index) => item.url || String(index)}
            onDragEnd={handleDragEnd}
            contentContainerStyle={styles.photoGrid}
            ListFooterComponent={
              (form.photos?.length || 0) > 0 ? (
                <Pressable style={styles.replaceAllBtn} onPress={handleReplaceAll}>
                  <Text style={styles.replaceAllText}>Replace All Photos</Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item, getIndex, drag, isActive }) => {
              const index = getIndex();
              return (
                <ScaleDecorator>
                  <Pressable onLongPress={drag} disabled={isActive} style={[styles.photoRow, isActive && styles.photoItemDragging]}>
                    <Image source={{ uri: item.thumb_url || item.url }} style={styles.photoRowImg} contentFit="cover" />
                    <View style={styles.photoRowInfo}>
                      <Text style={styles.photoRowLabel}>{index === 0 ? 'Hero Image' : `Photo ${index + 1}`}</Text>
                      <Text style={styles.photoRowHint}>Long-press to drag</Text>
                    </View>
                    <View style={styles.photoRowActions}>
                      <Pressable style={styles.heroBtn} onPress={() => setHero(index)}>
                        <FontAwesome name="star" size={18} color={index === 0 ? COLORS.warning : COLORS.slate} />
                      </Pressable>
                      <Pressable style={styles.deleteBtnRow} onPress={() => {
                        alert(
                          'Delete Photo',
                          'Did you want to Delete this Photo?',
                          [
                            { text: 'No', style: 'cancel' },
                            { text: 'Yes', style: 'destructive', onPress: () => deletePhoto(index) },
                          ]
                        );
                      }}>
                        <FontAwesome name="trash-o" size={16} color={COLORS.danger} />
                      </Pressable>
                    </View>
                  </Pressable>
                </ScaleDecorator>
              );
            }}
          />
        </View>
      )}

      {/* Contact Tab */}
      {tab === 2 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>Contact Information</Text>
          <Text style={styles.hint}>This is how tenants will reach you. Choose your preferred contact method.</Text>
          <Input
            label="Your Name (as shown to tenants)"
            value={form.listing_agent_name}
            onChangeText={v => update('listing_agent_name', v)}
            placeholder="Your full name"
            autoCapitalize="words"
          />
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
            label="Email for Tenants"
            value={form.listing_agent_email}
            onChangeText={v => update('listing_agent_email', v)}
            onBlur={() => update('listing_agent_email', form.listing_agent_email?.trim().toLowerCase())}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {(contactPref === 'phone' || contactPref === 'both') && (
            <Input
              label="Phone Number for Tenants *"
              value={form.listing_agent_phone}
              onChangeText={v => update('listing_agent_phone', formatPhone(v))}
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
          <View style={styles.saveWrap}>
            <Button title="Save Changes" onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  addressText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
  },
  tabTextActive: {
    color: COLORS.accent,
    fontFamily: FONTS.body.semiBold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginTop: 8,
    marginBottom: LAYOUT.padding.md,
  },
  chipLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: LAYOUT.padding.md,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  textArea: {
    minHeight: 80,
  },
  charCounter: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    textAlign: 'right',
    marginTop: -10,
    marginBottom: LAYOUT.padding.md,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: LAYOUT.padding.md,
  },
  dateBtnText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    marginBottom: LAYOUT.padding.md,
    lineHeight: 20,
  },
  saveWrap: {
    marginTop: 20,
    marginBottom: 20,
  },
  // Photos tab
  photosContainer: {
    flex: 1,
    marginBottom: 90,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
    padding: LAYOUT.padding.md,
    paddingBottom: 0,
  },
  photoActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: LAYOUT.radius.md,
  },
  photoActionBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textAlign: 'center',
  },
  replaceAllBtn: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 55,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: LAYOUT.radius.md,
  },
  replaceAllText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
  },
  photoCount: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: LAYOUT.padding.md,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  uploadingText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  photoGrid: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: 80,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  photoItemDragging: {
    opacity: 0.8,
    borderColor: COLORS.accent,
    transform: [{ scale: 1.02 }],
  },
  photoRowImg: {
    width: 70,
    height: 70,
    borderRadius: LAYOUT.radius.sm,
    margin: 8,
  },
  photoRowInfo: {
    flex: 1,
    paddingVertical: 8,
  },
  photoRowLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  photoRowHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 2,
  },
  photoRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 14,
  },
  heroBtn: {
    padding: 4,
  },
  deleteBtnRow: {
    padding: 4,
  },
});
