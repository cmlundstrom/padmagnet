import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// GET — list all products (admin view, includes inactive)
export async function GET(request) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new product (+ Stripe Price if Stripe configured)
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, price_cents, type, recurring_interval, sort_order } = body;

    if (!name || !price_cents || !type) {
      return NextResponse.json({ error: 'name, price_cents, and type are required' }, { status: 400 });
    }

    let stripe_price_id = null;

    // Create Stripe Price if Stripe is configured
    if (stripe) {
      const stripeProduct = await stripe.products.create({
        name,
        description: description || undefined,
      });

      const priceParams = {
        product: stripeProduct.id,
        unit_amount: price_cents,
        currency: 'usd',
      };

      if (type === 'recurring' && recurring_interval) {
        priceParams.recurring = { interval: recurring_interval };
      }

      const stripePrice = await stripe.prices.create(priceParams);
      stripe_price_id = stripePrice.id;
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        description,
        price_cents,
        type,
        recurring_interval: type === 'recurring' ? recurring_interval : null,
        stripe_price_id,
        sort_order: sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update product(s)
// Accepts AdminTable format: { ids: [...], changes: { field: value } }
// OR direct format: { id, ...updates }
export async function PATCH(request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    // Normalize to array of { id, updates }
    let targets;
    if (body.ids && body.changes) {
      // AdminTable format
      targets = body.ids.map(id => ({ id, updates: { ...body.changes } }));
    } else {
      // Direct format
      const { id, ...updates } = body;
      if (!id) {
        return NextResponse.json({ error: 'Product id required' }, { status: 400 });
      }
      targets = [{ id, updates }];
    }

    const results = [];

    for (const { id, updates } of targets) {
      // Convert price_cents string → integer (inline edits send strings)
      if (updates.price_cents !== undefined) {
        updates.price_cents = parseInt(updates.price_cents, 10);
      }

      // Convert boolean string values to real booleans
      for (const key of ['is_active', 'is_implemented']) {
        if (typeof updates[key] === 'string') {
          updates[key] = updates[key] === 'true';
        }
      }

      // If price changed and Stripe configured, create new Stripe Price
      if (updates.price_cents && stripe) {
        const { data: existing } = await supabase
          .from('products')
          .select('name, description, type, recurring_interval')
          .eq('id', id)
          .single();

        if (existing) {
          const stripeProduct = await stripe.products.create({
            name: updates.name || existing.name,
            description: updates.description || existing.description || undefined,
          });

          const priceParams = {
            product: stripeProduct.id,
            unit_amount: updates.price_cents,
            currency: 'usd',
          };

          const prodType = updates.type || existing.type;
          const interval = updates.recurring_interval || existing.recurring_interval;
          if (prodType === 'recurring' && interval) {
            priceParams.recurring = { interval };
          }

          const stripePrice = await stripe.prices.create(priceParams);
          updates.stripe_price_id = stripePrice.id;
        }
      }

      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      results.push(data);
    }

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — soft-delete (deactivate) a product
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Product id required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
