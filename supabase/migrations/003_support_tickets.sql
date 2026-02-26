-- ============================================================
-- Migration 003: Support Tickets + Messages
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Support Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  channel text DEFAULT 'web' CHECK (channel IN ('web','email','sms','phone')),
  category text DEFAULT 'general' CHECK (category IN ('general','listings','access','billing','bug','privacy','unsubscribe')),
  assignee text,
  tags text[] DEFAULT '{}',
  contact_email text,
  contact_name text,
  contact_phone text,
  waitlist_id uuid REFERENCES waitlist(id),
  listing_id uuid,
  notes text,
  suppressed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

-- Auto-update updated_at (reuses function from migration 002)
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_channel ON tickets(channel);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_contact_email ON tickets(contact_email);

-- Ticket Messages (conversation thread)
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  direction text DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  sender_type text DEFAULT 'agent' CHECK (sender_type IN ('agent','customer','system')),
  sender_name text,
  body text NOT NULL,
  channel text DEFAULT 'web' CHECK (channel IN ('web','email','sms')),
  delivery_status text DEFAULT 'delivered' CHECK (delivery_status IN ('pending','delivered','failed')),
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at);
