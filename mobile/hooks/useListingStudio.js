import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toTitleCase, toSentenceCase } from '../utils/format';
import { useAuth } from './useAuth';

// ── Form shape (identical to old wizard — same API payload) ──
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

// ── Required fields per card (for completion tracking) ──
const CARD_REQUIRED = {
  address: ['street_name', 'city', 'state_or_province', 'postal_code'],
  details: ['list_price', 'property_sub_type', 'bedrooms_total', 'bathrooms_total', 'living_area', 'year_built'],
  description: [], // optional
  lease: [],       // optional
  features: [],    // optional
  photos: [],      // optional
  contact: [],     // contact method validated at publish
};

const CARD_KEYS = Object.keys(CARD_REQUIRED);
const DRAFT_FORM_KEY = (id) => `padmagnet_studio_form_${id}`;
const STUDIO_ONBOARDED_KEY = 'padmagnet_studio_onboarded';

// ── Phone formatter ──
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * useListingStudio — all business logic for the Magic Listing Studio.
 *
 * Manages form state, debounced auto-save, completion tracking,
 * validation, draft CRUD, AI description, and publish.
 */
export default function useListingStudio(draftIdParam) {
  const { user } = useAuth();
  // Seed email synchronously from the auth context so the Contact card
  // paints populated on first render — no 1–4s async flash. Name/phone
  // still fill in async once the profiles-table fetch returns, since
  // those aren't in auth.users.
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    listing_agent_email: user?.email || '',
  }));
  const [draftId, setDraftId] = useState(draftIdParam || null);
  const [loading, setLoading] = useState(!!draftIdParam);
  const [submitting, setSubmitting] = useState(false);
  const [contactPref, setContactPref] = useState('email');
  const [aiLoading, setAiLoading] = useState(false);
  const [coords, setCoords] = useState(null); // { latitude, longitude } from address
  const [hasOnboarded, setHasOnboarded] = useState(true); // assume yes until checked
  // Admin Send-Back feedback shown as a yellow revision banner. Cleared
  // by the user via dismissReview() or naturally after a successful
  // resubmit (status leaves 'draft').
  const [review, setReview] = useState(null); // { reason, note, reviewedAt } | null
  const dismissReview = useCallback(() => setReview(null), []);

  const saveTimer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // ── Update a single field ──
  const update = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Update phone with formatting ──
  const updatePhone = useCallback((value) => {
    setForm(prev => ({ ...prev, listing_agent_phone: formatPhone(value) }));
  }, []);

  // ── Bulk update (e.g., address autocomplete) ──
  const updateMany = useCallback((fields) => {
    setForm(prev => ({ ...prev, ...fields }));
  }, []);

  // ── Build API payload (same normalization as old wizard) ──
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

  // ── Completion tracking ──
  function getCardCompletion(cardKey) {
    const required = CARD_REQUIRED[cardKey];
    if (!required || required.length === 0) return 'complete'; // optional cards
    const filled = required.filter(f => {
      const v = form[f];
      return v !== '' && v !== null && v !== undefined;
    });
    if (filled.length === 0) return 'empty';
    if (filled.length === required.length) return 'complete';
    return 'partial';
  }

  const completionMap = {};
  CARD_KEYS.forEach(k => { completionMap[k] = getCardCompletion(k); });

  const totalRequired = Object.values(CARD_REQUIRED).flat().length;
  const totalFilled = Object.values(CARD_REQUIRED).flat().filter(f => {
    const v = form[f];
    return v !== '' && v !== null && v !== undefined;
  }).length;
  const completionPercent = totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;

  // ── Debounced auto-save (500ms) ──
  useEffect(() => {
    if (!draftId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!mounted.current) return;
      try {
        await AsyncStorage.setItem(DRAFT_FORM_KEY(draftId), JSON.stringify(form));
        await apiFetch(`/api/owner/listings/${draftId}`, {
          method: 'PUT',
          body: JSON.stringify(buildPayload()),
        });
      } catch {}
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [form, draftId]);

  // ── Load existing draft ──
  useEffect(() => {
    if (!draftIdParam) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Try local cache first
        const cached = await AsyncStorage.getItem(DRAFT_FORM_KEY(draftIdParam));
        if (cached && !cancelled) {
          setForm(JSON.parse(cached));
          setLoading(false);
          return;
        }
        // Fall back to API
        const data = await apiFetch(`/api/listings/${draftIdParam}`);
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
        if (data.listing_agent_phone) {
          setContactPref(data.listing_agent_email ? 'both' : 'phone');
        }
        // Capture coords from draft for nearby rentals search
        if (data.latitude && data.longitude) {
          setCoords({ latitude: data.latitude, longitude: data.longitude });
        }
        // Surface admin Send-Back review feedback so the Listing Studio
        // can render a revision banner above the cards. Server clears
        // these on next admin approve, but locally we hide the banner
        // immediately on dismiss for snappier UX.
        if (data.status === 'draft' && (data.admin_review_note || data.admin_review_reason)) {
          setReview({
            reason: data.admin_review_reason || null,
            note: data.admin_review_note || null,
            reviewedAt: data.admin_reviewed_at || null,
          });
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [draftIdParam]);

  // ── Prefill from cached nearby-rentals address (new listings only) ──
  useEffect(() => {
    if (draftIdParam) return;
    AsyncStorage.getItem('owner_property_address').then(cached => {
      if (!cached) return;
      try {
        const addr = JSON.parse(cached);
        if (addr.street_name) {
          setForm(prev => {
            if (prev.street_name) return prev;
            return { ...prev, ...addr, state_or_province: addr.state_or_province || 'FL' };
          });
        }
      } catch {}
    });
  }, [draftIdParam]);

  // ── Create draft (first save) ──
  const createDraft = useCallback(async () => {
    if (draftId) return draftId;
    try {
      const data = await apiFetch('/api/owner/listings', {
        method: 'POST',
        body: JSON.stringify({ ...buildPayload('draft'), status: 'draft' }),
      });
      setDraftId(data.id);
      return data.id;
    } catch {
      return null;
    }
  }, [draftId, buildPayload]);

  // ── Auto-populate contact info from profile ──
  // Only fills fields that are empty — user-entered values are never
  // overwritten. Sets contactPref to 'both' only if profile has a phone
  // AND the user hasn't already made an explicit choice.
  // Uses the auth-context user (sync, in-memory) instead of
  // supabase.auth.getUser() to skip that roundtrip — only the profiles
  // fetch remains async.
  const prefillContact = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email, phone')
        .eq('id', user.id)
        .single();
      setForm(prev => ({
        ...prev,
        listing_agent_email: prev.listing_agent_email || profile?.email || user.email || '',
        listing_agent_name: prev.listing_agent_name || profile?.display_name || '',
        listing_agent_phone: prev.listing_agent_phone || (profile?.phone ? formatPhone(profile.phone) : ''),
      }));
      if (profile?.phone) setContactPref('both');
    } catch {}
  }, [user]);

  // ── Auto-prefill contact fields on first render ──
  // Fires once loading completes (new listing OR resumed draft). prefillContact
  // is idempotent — it only fills blanks, so this never clobbers user edits
  // or values saved into a resumed draft. Removes the need for a manual
  // "Fill from profile" button and eliminates the empty-contact-fields
  // confusion on the Contact card.
  const prefillFired = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (prefillFired.current) return;
    const anyEmpty = !form.listing_agent_email || !form.listing_agent_name || !form.listing_agent_phone;
    if (anyEmpty) {
      prefillFired.current = true;
      prefillContact();
    }
  }, [loading, form.listing_agent_email, form.listing_agent_name, form.listing_agent_phone, prefillContact]);

  // ── Validation (at publish) ──
  const validate = useCallback(() => {
    const errors = {};

    // Address
    const addrMissing = [];
    if (!form.street_name) addrMissing.push('Street Name');
    if (!form.city) addrMissing.push('City');
    if (!form.state_or_province) addrMissing.push('State');
    if (!form.postal_code) addrMissing.push('Zip');
    if (addrMissing.length) errors.address = addrMissing;

    // Details
    const detMissing = [];
    if (!form.list_price) detMissing.push('Monthly Rent');
    if (!form.property_sub_type) detMissing.push('Property Type');
    if (!form.bedrooms_total) detMissing.push('Beds');
    if (!form.bathrooms_total) detMissing.push('Baths');
    if (!form.living_area) detMissing.push('Sq/Ft');
    if (!form.year_built) detMissing.push('Year Built');
    if (detMissing.length) errors.details = detMissing;

    // Contact
    const contMissing = [];
    if ((contactPref === 'phone' || contactPref === 'both') && !form.listing_agent_phone) {
      contMissing.push('Phone Number');
    }
    if ((contactPref === 'phone' || contactPref === 'both') && form.listing_agent_phone && form.listing_agent_phone.replace(/\D/g, '').length < 10) {
      contMissing.push('Complete 10-digit Phone');
    }
    if (form.listing_agent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.listing_agent_email)) {
      contMissing.push('Valid Email');
    }
    if (contMissing.length) errors.contact = contMissing;

    return { valid: Object.keys(errors).length === 0, errors };
  }, [form, contactPref]);

  // ── Publish ──
  // Accepts an optional `idOverride` to sidestep a React state-closure race:
  // when the caller creates the draft inline (`await createDraft()`) and then
  // immediately calls publish(), the `draftId` captured in this callback's
  // closure is still null. Without the override, publish would POST a second
  // row instead of PUT-ing the freshly-created draft — producing two cards
  // on My Listings. Callers that hold the id should pass it in.
  const publish = useCallback(async (idOverride, notifPrefsRef, alertFn, routerReplaceFn) => {
    const { valid, errors } = validate();
    if (!valid) {
      const firstCard = Object.keys(errors)[0];
      const fields = errors[firstCard].join(', ');
      alertFn('Required', `Please fill in: ${fields}`);
      return { success: false, firstErrorCard: firstCard, errors };
    }

    const id = idOverride || draftId;
    setSubmitting(true);
    try {
      await notifPrefsRef?.current?.save().catch(() => {});
      const payload = buildPayload('active');

      if (id) {
        await apiFetch(`/api/owner/listings/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/owner/listings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      // Cleanup
      if (id) {
        await AsyncStorage.removeItem(DRAFT_FORM_KEY(id));
      }

      return { success: true };
    } catch (err) {
      alertFn('Error', err.message);
      return { success: false };
    } finally {
      setSubmitting(false);
    }
  }, [draftId, buildPayload, validate]);

  // ── AI description (text-only) ──
  const generateDescription = useCallback(async () => {
    if (!form.city || !form.bedrooms_total) return null;
    setAiLoading(true);
    try {
      const result = await apiFetch('/api/owner/ai-describe', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'describe',
          form_context: {
            bedrooms_total: form.bedrooms_total,
            bathrooms_total: form.bathrooms_total,
            property_sub_type: form.property_sub_type,
            city: form.city,
            living_area: form.living_area,
            pool: form.pool,
            furnished: form.furnished,
            pets_allowed: form.pets_allowed,
            fenced_yard: form.fenced_yard,
            year_built: form.year_built,
          },
        }),
      });
      if (result?.description) {
        update('public_remarks', result.description.slice(0, 500));
        setAiLoading(false);
        return result.description;
      }
    } catch {}
    setAiLoading(false);
    return null;
  }, [form, update]);

  // ── AI description from photos (Vision) ──
  const generateFromPhotos = useCallback(async () => {
    if (form.photos.length === 0) return null;
    setAiLoading(true);
    try {
      const photoUrls = form.photos.slice(0, 3).map(p => p.url);
      const result = await apiFetch('/api/owner/ai-describe', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'describe',
          photo_urls: photoUrls,
          form_context: {
            bedrooms_total: form.bedrooms_total,
            bathrooms_total: form.bathrooms_total,
            property_sub_type: form.property_sub_type,
            city: form.city,
            living_area: form.living_area,
            pool: form.pool,
            furnished: form.furnished,
            pets_allowed: form.pets_allowed,
            fenced_yard: form.fenced_yard,
            year_built: form.year_built,
          },
        }),
      });
      if (result?.description) {
        update('public_remarks', result.description.slice(0, 500));
        setAiLoading(false);
        return result.description;
      }
    } catch {}
    setAiLoading(false);
    return null;
  }, [form, update]);

  // ── AI amenity suggestion from photos ──
  const suggestAmenities = useCallback(async () => {
    if (form.photos.length === 0) return null;
    setAiLoading(true);
    try {
      const photoUrls = form.photos.slice(0, 3).map(p => p.url);
      const result = await apiFetch('/api/owner/ai-describe', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'suggest_amenities',
          photo_urls: photoUrls,
          form_context: {
            property_sub_type: form.property_sub_type,
            city: form.city,
          },
        }),
      });
      if (result?.amenities) {
        // Apply suggested amenities to form
        const a = result.amenities;
        setForm(prev => ({
          ...prev,
          pool: a.pool ?? prev.pool,
          fenced_yard: a.fenced_yard ?? prev.fenced_yard,
          furnished: a.furnished ?? prev.furnished,
          pets_allowed: a.pets_allowed ?? prev.pets_allowed,
          parking_spaces: a.parking_spaces ? String(a.parking_spaces) : prev.parking_spaces,
        }));
        setAiLoading(false);
        return result.amenities;
      }
    } catch {}
    setAiLoading(false);
    return null;
  }, [form]);

  // ── Onboarding check ──
  // Tooltip fires once per device on the user's very first Studio visit.
  // Existing owners (≥1 listing on the server) are implicitly onboarded —
  // they've been here before, even if this install is fresh. Belt-and-
  // suspenders: the local AsyncStorage flag AND a server listings check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const localFlag = await AsyncStorage.getItem(STUDIO_ONBOARDED_KEY);
      if (localFlag === 'true') {
        if (!cancelled) setHasOnboarded(true);
        return;
      }
      try {
        const listings = await apiFetch('/api/owner/listings');
        if (cancelled) return;
        if (Array.isArray(listings) && listings.length > 0) {
          // Returning owner — silently mark onboarded, skip the tooltip.
          setHasOnboarded(true);
          AsyncStorage.setItem(STUDIO_ONBOARDED_KEY, 'true').catch(() => {});
          return;
        }
        setHasOnboarded(false);
      } catch {
        if (!cancelled) setHasOnboarded(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const markOnboarded = useCallback(async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(STUDIO_ONBOARDED_KEY, 'true');
  }, []);

  return {
    form,
    update,
    updatePhone,
    updateMany,
    draftId,
    loading,
    submitting,
    contactPref,
    setContactPref,
    aiLoading,
    completionMap,
    completionPercent,
    createDraft,
    prefillContact,
    validate,
    publish,
    generateDescription,
    generateFromPhotos,
    suggestAmenities,
    buildPayload,
    coords,
    setCoords,
    hasOnboarded,
    markOnboarded,
    review,
    dismissReview,
    formatPhone,
  };
}
