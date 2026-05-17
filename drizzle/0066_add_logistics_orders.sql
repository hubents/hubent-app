-- Órdenes de logística: permite gestionar pedidos de trabajo vinculados a eventos y documentos financieros

CREATE TYPE "logistics_order_status" AS ENUM (
  'borrador',
  'pendiente',
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado'
);

CREATE TABLE "logistics_orders" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "event_id" integer REFERENCES "events"("id") ON DELETE SET NULL,
  "event_name" text,
  "client_name" text,
  "client_email" text,
  "client_phone" text,
  "date" text,
  "linked_doc_id" text,
  "linked_doc_type" text,
  "status" "logistics_order_status" DEFAULT 'borrador',
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "logistics_order_items" (
  "id" serial PRIMARY KEY,
  "order_id" integer NOT NULL REFERENCES "logistics_orders"("id") ON DELETE CASCADE,
  "product_id" integer REFERENCES "product_catalog"("id") ON DELETE SET NULL,
  "product_name" text,
  "quantity" integer NOT NULL DEFAULT 1,
  "description" text,
  "has_service" boolean DEFAULT false,
  "service_title" text,
  "service_time_from" text,
  "service_time_to" text,
  "service_worker_name" text,
  "service_worker_id" text,
  "service_location" text,
  "service_notes" text,
  "agenda_item_id" text,
  "created_at" timestamp DEFAULT now()
);
