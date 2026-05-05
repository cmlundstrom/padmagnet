import { memo, useState, useEffect, useCallback, useRef } from 'react';
import useAndroidBack from '../../hooks/useAndroidBack';
import { ScrollView, View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
// react-native-draggable-flatlist is loaded lazily inside the render body
// when tab === 1 so its reanimated + gesture-handler init cost is deferred
// until the user actually opens the Photos tab.
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

// Optional native dep — graceful fallback if the dev client / standalone APK
// wasn't rebuilt with expo-image-manipulator yet. Without it, uploads still
// go through (now one-at-a-time, so Vercel body limit isn't hit), they just
// skip the client-side resize.
let ImageManipulator = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImageManipulator = require('expo-image-manipulator');
  // Probe: on non-rebuilt builds the module loads but its methods are undefined
  if (typeof ImageManipulator.manipulateAsync !== 'function') {
    ImageManipulator = null;
  }
} catch { /* native module not present in this build */ }
import { FontAwesome } from '@expo/vector-icons';
import { Header, Button, Input, Toggle } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api';
import { getCachedListing, setCachedListing } from '../../lib/listingCache';
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

// Memoized photo row used by the FlatList in the Photos tab. Reorder is
// driven by ↑ / ↓ tap arrows — the long-press drag pattern was unreliable
// on Android (gesture timing fights JS-thread render work and scroll). All
// callbacks come in pre-stabilized via useCallback; isFirst / isLast are
// the only diff-drivers besides item/index.
const PhotoRow = memo(function PhotoRow({ item, index, isFirst, isLast, onMoveUp, onMoveDown, onSetHero, onDelete }) {
  return (
    <View style={styles.photoRow}>
      <Image source={{ uri: item.thumb_url || item.url }} style={styles.photoRowImg} contentFit="cover" />
      <View style={styles.photoRowInfo}>
        <Text style={styles.photoRowLabel}>{index === 0 ? 'Hero Image' : `Photo ${index + 1}`}</Text>
        <Text style={styles.photoRowHint}>Tap arrows to reorder</Text>
      </View>
      <View style={styles.photoRowActions}>
        <Pressable
          style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
          onPress={() => onMoveUp(index)}
          disabled={isFirst}
          hitSlop={8}
        >
          <FontAwesome name="chevron-up" size={14} color={isFirst ? COLORS.slate : COLORS.accent} />
        </Pressable>
        <Pressable
          style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
          onPress={() => onMoveDown(index)}
          disabled={isLast}
          hitSlop={8}
        >
          <FontAwesome name="chevron-down" size={14} color={isLast ? COLORS.slate : COLORS.accent} />
        </Pressable>
        <Pressable style={styles.heroBtn} onPress={() => onSetHero(index)} hitSlop={10}>
          <FontAwesome name="star" size={18} color={index === 0 ? COLORS.warning : COLORS.slate} />
        </Pressable>
        <Pressable style={styles.deleteBtnRow} onPress={() => onDelete(index)} hitSlop={10}>
          <FontAwesome name="trash-o" size={16} color={COLORS.danger} />
        </Pressable>
      </View>
    </View>
  );
});

export default function EditListingScreen() {
  useAndroidBack();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const alert = useAlert();
  const { user } = useAuth();

  // Seed from cache synchronously so the form has real data on first render.
  // Listings tab warms the cache on fetch/focus, so tapping Edit from there
  // is a cache hit and the screen hydrates instantly. Cache miss (deep-link,
  // stale navigation) falls back to the GET and blocks as before.
  const cached = id ? getCachedListing(id) : null;
  const hydrateForm = (data) => ({
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
  const inferContactPref = (data) => {
    if (data.listing_agent_phone && data.listing_agent_email) return 'both';
    if (data.listing_agent_phone) return 'phone';
    return 'email';
  };

  // Performance instrumentation — emits structured timing logs that a test
  // harness (adb logcat | grep EDIT_TIMING) can scrape to validate the
  // cache-hit path skips the blocking GET.
  const mountTimeRef = useRef(performance.now());
  useEffect(() => {
    const t = Math.round(performance.now() - mountTimeRef.current);
    console.log(`[EDIT_TIMING] mount cache_hit=${!!cached} elapsed=${t}ms`);
  }, []);

  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [tab, setTab] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [contactPref, setContactPref] = useState(cached ? inferContactPref(cached) : 'email');
  const [linkSent, setLinkSent] = useState(false);

  const [form, setForm] = useState(cached ? hydrateForm(cached) : {});
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Mutation queue — serializes photo side-effects (upload/delete/reorder)
  // so concurrent user actions can't race. UI updates optimistically; server
  // calls run one at a time in submission order. Last-write-wins on the
  // server matches the last optimistic update the user saw locally.
  const mutationQueue = useRef(Promise.resolve());
  const enqueueMutation = useCallback((fn) => {
    const next = mutationQueue.current.then(fn, fn);
    mutationQueue.current = next;
    return next;
  }, []);

  // Load listing data. Stale-while-revalidate: if we seeded from cache, this
  // still fires to pull the latest from server, but the user sees the form
  // immediately and the refresh happens in the background.
  useEffect(() => {
    if (!id) return;
    (async () => {
      const fetchStart = performance.now();
      try {
        const data = await apiFetch(`/api/owner/listings/${id}`);
        const fetchElapsed = Math.round(performance.now() - fetchStart);
        const totalElapsed = Math.round(performance.now() - mountTimeRef.current);
        console.log(`[EDIT_TIMING] fetch_complete cache_hit=${!!cached} fetch_ms=${fetchElapsed} total_ms=${totalElapsed}`);
        setForm(hydrateForm(data));
        setContactPref(inferContactPref(data));
        setCachedListing(data);
      } catch (err) {
        if (!cached) {
          alert('Error', 'Could not load listing.');
          router.back();
        }
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

  // Photo upload from phone.
  // Two-stage pipeline per file:
  //   1. Prepare: native-side resize to 2400px long-edge + JPEG q85 via
  //      expo-image-manipulator. Graceful fallback to the original asset
  //      if the native module isn't in the current build.
  //   2. Upload: POST one file at a time with listing_id, server atomically
  //      appends to listings.photos and returns the full updated array.
  // Per-file loop means one bad file (network blip, server 400) doesn't
  // take down the whole batch.
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 15 - (form.photos?.length || 0),
    });
    if (result.canceled || !result.assets?.length) return;
    const assets = result.assets;
    setUploading(true);
    const failures = [];
    try {
      await enqueueMutation(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiBase = process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com';

        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i];
          const label = `photo ${i + 1} of ${assets.length}`;

          // Stage 1: resize (if available)
          let uri = asset.uri;
          let mime = asset.mimeType || 'image/jpeg';
          if (ImageManipulator) {
            setUploadStatus(`Preparing ${label}…`);
            try {
              const resized = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 2400 } }],
                { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
              );
              uri = resized.uri;
              mime = 'image/jpeg';
            } catch (err) {
              // Non-fatal — continue with original asset
              console.warn('[pickImages] resize failed, uploading original:', err?.message);
            }
          }

          // Stage 2: upload this one file
          setUploadStatus(`Uploading ${label}…`);
          try {
            const formData = new FormData();
            const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
            formData.append('photos', { uri, type: mime, name: `photo.${ext}` });
            formData.append('listing_id', id);

            const res = await fetch(`${apiBase}/api/owner/photos`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });

            if (!res.ok) {
              const text = await res.text().catch(() => '');
              let msg = 'Upload failed';
              try { msg = JSON.parse(text).error || msg; } catch { /* non-JSON body (e.g. Vercel 413 HTML) */ }
              if (res.status === 413) msg = 'Photo is too large even after resizing. Try a smaller source.';
              throw new Error(msg);
            }

            const data = await res.json();
            // New server mode returns { uploaded, photos }. Adopt authoritative array.
            if (data && !Array.isArray(data) && data.photos) {
              update('photos', data.photos);
            } else if (Array.isArray(data)) {
              // Legacy fallback — shouldn't happen in prod after deploy is live,
              // but keep this shim so the app doesn't break during deploy window.
              const newPhotos = [...(form.photos || []), ...data.map((u) => ({
                url: u.url,
                thumb_url: u.thumb_url,
                caption: '',
                order: (form.photos?.length || 0),
              }))];
              update('photos', newPhotos);
              await apiFetch(`/api/owner/listings/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ photos: newPhotos }),
              });
            }
          } catch (err) {
            failures.push({ name: asset.fileName || `photo ${i + 1}`, error: err.message });
          }
        }
      });
    } finally {
      setUploading(false);
      setUploadStatus('');
    }

    if (failures.length) {
      const msg = failures.length === assets.length
        ? `No photos uploaded. ${failures[0].error}`
        : `${failures.length} of ${assets.length} photo${failures.length > 1 ? 's' : ''} couldn't upload. ${failures[0].name}: ${failures[0].error}`;
      alert('Upload Incomplete', msg);
    }
  };

  // Delete photo — optimistic local update, queued server side-effects.
  // useCallback-stable so the memoized PhotoRow keeps prop identity.
  const deletePhoto = useCallback((index) => {
    setForm(prev => {
      if (!prev.photos) return prev;
      const photo = prev.photos[index];
      if (!photo) return prev;
      const newPhotos = prev.photos.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i }));
      enqueueMutation(async () => {
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
        } catch { /* storage best-effort; listing PUT is the source of truth */ }
        await apiFetch(`/api/owner/listings/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ photos: newPhotos }),
        });
      }).catch(() => {});
      return { ...prev, photos: newPhotos };
    });
  }, [id, enqueueMutation]);

  // Stable delete-confirm callback so the memoized PhotoRow doesn't have
  // to spawn a fresh closure for every render.
  const confirmDeletePhoto = useCallback((index) => {
    alert(
      'Delete Photo',
      'Did you want to Delete this Photo?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: () => deletePhoto(index) },
      ],
    );
  }, [alert, deletePhoto]);

  // Set hero (move photo to position 0) — optimistic, queued. Stabilized
  // via useCallback so the memoized PhotoRow doesn't re-render every time
  // the parent's form state ticks.
  const setHero = useCallback((index) => {
    setForm(prev => {
      if (index === 0 || !prev.photos) return prev;
      const photos = [...prev.photos];
      const [hero] = photos.splice(index, 1);
      photos.unshift(hero);
      const reordered = photos.map((p, i) => ({ ...p, order: i }));
      enqueueMutation(() =>
        apiFetch(`/api/owner/listings/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ photos: reordered }),
        }),
      ).catch(() => {});
      return { ...prev, photos: reordered };
    });
  }, [id, enqueueMutation]);

  // Helper that swaps a photo with its neighbor and queues the PUT.
  // Used by both moveUp / moveDown so the queue/optimistic logic is
  // written once.
  const swapPhotos = useCallback((from, to) => {
    setForm(prev => {
      if (!prev.photos || from < 0 || to < 0 || from >= prev.photos.length || to >= prev.photos.length) {
        return prev;
      }
      const photos = [...prev.photos];
      [photos[from], photos[to]] = [photos[to], photos[from]];
      const reordered = photos.map((p, i) => ({ ...p, order: i }));
      enqueueMutation(() =>
        apiFetch(`/api/owner/listings/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ photos: reordered }),
        }),
      ).catch(() => {});
      return { ...prev, photos: reordered };
    });
  }, [id, enqueueMutation]);

  const moveUp = useCallback((index) => swapPhotos(index, index - 1), [swapPhotos]);
  const moveDown = useCallback((index) => swapPhotos(index, index + 1), [swapPhotos]);

  // Replace all photos — queued so the subsequent pickImages() can't race
  const handleReplaceAll = () => {
    alert('Replace All Photos', 'This will remove all current photos. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          const urls = form.photos.map(p => p.url);
          update('photos', []);
          await enqueueMutation(async () => {
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
              } catch { /* storage best-effort */ }
            }
            await apiFetch(`/api/owner/listings/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ photos: [] }),
            });
          }).catch(() => {});
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

  // (Photos tab uses a plain FlatList + tap-arrow reorder — the
  // react-native-draggable-flatlist long-press path was removed because
  // its gesture timing was unreliable and conflicted with vertical
  // scroll on a list of up to 15 rows.)

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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            numberOfLines={7}
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
        </KeyboardAvoidingView>
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
          <Text style={styles.photoCount}>{form.photos?.length || 0} of 15 photos · Tap <FontAwesome name="chevron-up" size={11} color={COLORS.accent} /> <FontAwesome name="chevron-down" size={11} color={COLORS.accent} /> to reorder · Tap <Text style={{ color: COLORS.warning }}>Star <FontAwesome name="star" size={11} color={COLORS.warning} /></Text> for Hero Image</Text>
          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.uploadingText}>{uploadStatus || 'Uploading…'}</Text>
            </View>
          )}
          <FlatList
            data={form.photos || []}
            keyExtractor={(item, index) => item.url || String(index)}
            contentContainerStyle={styles.photoGrid}
            removeClippedSubviews={false}
            ListFooterComponent={
              (form.photos?.length || 0) > 0 ? (
                <Pressable style={styles.replaceAllBtn} onPress={handleReplaceAll}>
                  <Text style={styles.replaceAllText}>Replace All Photos</Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item, index }) => (
              <PhotoRow
                item={item}
                index={index}
                isFirst={index === 0}
                isLast={index === (form.photos?.length || 0) - 1}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onSetHero={setHero}
                onDelete={confirmDeletePhoto}
              />
            )}
          />
        </View>
      )}

      {/* Contact Tab */}
      {tab === 2 && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>Contact Information</Text>
          <Text style={styles.hint}>This is how renters will reach you. Choose your preferred contact method.</Text>
          <Input
            label="Your Name (as shown to renters)"
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
          <View style={styles.accountEmailRow}>
            <FontAwesome name="envelope-o" size={13} color={COLORS.textSecondary} />
            <Text style={styles.accountEmailText}>
              Inquiries notify your account email: <Text style={styles.accountEmailBold}>{user?.email || '—'}</Text>
            </Text>
          </View>
          {(contactPref === 'phone' || contactPref === 'both') && (
            <Input
              label="Phone Number for Renters *"
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
        </KeyboardAvoidingView>
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
    paddingBottom: 360,
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
  accountEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountEmailText: {
    flex: 1,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  accountEmailBold: {
    fontFamily: FONTS.body.semiBold,
    color: COLORS.text,
  },
  saveWrap: {
    marginTop: 20,
    marginBottom: 20,
  },
  // Photos tab
  photosContainer: {
    // flex:1 lets the FlatList own the scrollable area. The Photos tab has
    // no Save button, so no bottom margin is needed; the photoGrid's own
    // paddingBottom (set on contentContainerStyle) provides the safe-area
    // breathing room above the home gesture bar.
    flex: 1,
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
    gap: 10,
    paddingRight: 12,
  },
  reorderBtn: {
    width: 30,
    height: 30,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtnDisabled: {
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
    opacity: 0.4,
  },
  heroBtn: {
    padding: 4,
  },
  deleteBtnRow: {
    padding: 4,
  },
});
