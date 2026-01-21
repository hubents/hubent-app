-- RSVP Improvements Migration
-- Adds: maxCompanionsPerGuest, showTransport, guest_companions table, transport tables

-- Add new columns to rsvp_settings
ALTER TABLE "rsvp_settings" ADD COLUMN IF NOT EXISTS "max_companions_per_guest" integer DEFAULT 1;
ALTER TABLE "rsvp_settings" ADD COLUMN IF NOT EXISTS "show_transport" boolean DEFAULT false;

-- Create guest_companions table for multiple companions per guest
CREATE TABLE IF NOT EXISTS "guest_companions" (
  "id" serial PRIMARY KEY,
  "guest_id" integer NOT NULL REFERENCES "guests"("id") ON DELETE CASCADE,
  "full_name" text NOT NULL,
  "menu_preference" text,
  "dietary_restrictions" text,
  "needs_transport" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Create transport options table
CREATE TABLE IF NOT EXISTS "rsvp_transport_options" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "departure_location" text,
  "departure_address" text,
  "departure_time" text,
  "return_time" text,
  "capacity" integer,
  "price" decimal(10,2) DEFAULT 0,
  "map_image_url" text,
  "is_active" boolean DEFAULT true,
  "order_index" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

-- Create transport bookings table
CREATE TABLE IF NOT EXISTS "rsvp_transport_bookings" (
  "id" serial PRIMARY KEY,
  "guest_id" integer NOT NULL REFERENCES "guests"("id") ON DELETE CASCADE,
  "transport_option_id" integer NOT NULL REFERENCES "rsvp_transport_options"("id") ON DELETE CASCADE,
  "seats" integer DEFAULT 1,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_guest_companions_guest_id" ON "guest_companions"("guest_id");
CREATE INDEX IF NOT EXISTS "idx_transport_options_event_id" ON "rsvp_transport_options"("event_id");
CREATE INDEX IF NOT EXISTS "idx_transport_bookings_guest_id" ON "rsvp_transport_bookings"("guest_id");
CREATE INDEX IF NOT EXISTS "idx_transport_bookings_option_id" ON "rsvp_transport_bookings"("transport_option_id");
