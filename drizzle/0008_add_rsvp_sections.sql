-- Add cover image to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cover_image" text;

-- RSVP Settings per event
CREATE TABLE IF NOT EXISTS "rsvp_settings" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "enabled" boolean DEFAULT true,
  "deadline" timestamp,
  "allow_plus_one" boolean DEFAULT false,
  "ask_dietary_restrictions" boolean DEFAULT true,
  "custom_message" text,
  "show_itinerary" boolean DEFAULT true,
  "show_hotels" boolean DEFAULT true,
  "show_nearby_plans" boolean DEFAULT true,
  "show_faqs" boolean DEFAULT true,
  "show_location" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("event_id")
);

-- Itinerary items for events
CREATE TABLE IF NOT EXISTS "rsvp_itinerary" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "start_time" timestamp,
  "end_time" timestamp,
  "location" text,
  "order_index" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

-- Recommended hotels
CREATE TABLE IF NOT EXISTS "rsvp_hotels" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "address" text,
  "phone" text,
  "website" text,
  "price_range" text,
  "distance" text,
  "image_url" text,
  "order_index" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

-- Nearby plans/activities
CREATE TABLE IF NOT EXISTS "rsvp_nearby_plans" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "address" text,
  "website" text,
  "image_url" text,
  "order_index" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

-- FAQs
CREATE TABLE IF NOT EXISTS "rsvp_faqs" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "order_index" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);
