CREATE SCHEMA "brand_interface";
--> statement-breakpoint
CREATE TYPE "public"."perm_mode" AS ENUM('grant', 'revoke');--> statement-breakpoint
CREATE TYPE "public"."scope_type" AS ENUM('tenant', 'legal_entity', 'store');--> statement-breakpoint
CREATE TYPE "public"."brand_role" AS ENUM('area_manager', 'national_manager', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."brand_campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."brand_campaign_type" AS ENUM('global', 'tenant_specific', 'selective');--> statement-breakpoint
CREATE TYPE "public"."brand_deployment_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "brands_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "channels_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "commercial_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "commercial_areas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(100) NOT NULL,
	"active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "drivers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "entity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50),
	"changes" jsonb,
	"user_id" uuid,
	"user_email" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "italian_cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"province" varchar(2) NOT NULL,
	"province_name" varchar(100) NOT NULL,
	"region" varchar(100) NOT NULL,
	"postal_code" varchar(5) NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codice" varchar(20) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"piva" varchar(50),
	"billing_profile_id" uuid,
	"stato" varchar(50) DEFAULT 'Attiva',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"archived_at" timestamp,
	"codiceFiscale" varchar(50),
	"formaGiuridica" varchar(100),
	"capitaleSociale" varchar(50),
	"dataCostituzione" date,
	"indirizzo" text,
	"citta" varchar(100),
	"provincia" varchar(10),
	"cap" varchar(10),
	"telefono" varchar(50),
	"email" varchar(255),
	"pec" varchar(255),
	"rea" varchar(100),
	"registroImprese" varchar(255),
	"logo" text,
	"codiceSDI" varchar(10),
	"refAmminNome" varchar(100),
	"refAmminCognome" varchar(100),
	"refAmminEmail" varchar(255),
	"refAmminCodiceFiscale" varchar(16),
	"refAmminIndirizzo" text,
	"refAmminCitta" varchar(100),
	"refAmminCap" varchar(10),
	"refAmminPaese" varchar(100),
	"note" text,
	CONSTRAINT "legal_entities_codice_unique" UNIQUE("codice")
);
--> statement-breakpoint
CREATE TABLE "legal_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"min_capital" varchar(50),
	"liability" varchar(50),
	"active" boolean DEFAULT true,
	"sort_order" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "legal_forms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_perms" (
	"role_id" uuid NOT NULL,
	"perm" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "role_perms_role_id_perm_pk" PRIMARY KEY("role_id","perm")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "store_brands" (
	"store_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "store_brands_store_id_brand_id_pk" PRIMARY KEY("store_id","brand_id")
);
--> statement-breakpoint
CREATE TABLE "store_driver_potential" (
	"store_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"potential_score" smallint NOT NULL,
	"cluster_label" varchar(50),
	"kpis" jsonb,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "store_driver_potential_store_id_driver_id_pk" PRIMARY KEY("store_id","driver_id")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"channel_id" uuid NOT NULL,
	"commercial_area_id" uuid,
	"address" text,
	"citta" varchar(100),
	"provincia" varchar(10),
	"cap" varchar(10),
	"region" varchar(100),
	"geo" jsonb,
	"status" varchar(50) DEFAULT 'active',
	"opened_at" date,
	"closed_at" date,
	"billing_override_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"archived_at" timestamp,
	"phone" varchar(50),
	"email" varchar(255),
	"whatsapp1" varchar(20),
	"whatsapp2" varchar(20),
	"facebook" varchar(255),
	"instagram" varchar(255),
	"tiktok" varchar(255),
	"google_maps_url" text,
	"telegram" varchar(255),
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100),
	"status" varchar(50) DEFAULT 'active',
	"settings" jsonb DEFAULT '{}'::jsonb,
	"features" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"archived_at" timestamp,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_assignments" (
	"user_id" varchar NOT NULL,
	"role_id" uuid NOT NULL,
	"scope_type" "scope_type" NOT NULL,
	"scope_id" uuid NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_assignments_user_id_role_id_scope_type_scope_id_pk" PRIMARY KEY("user_id","role_id","scope_type","scope_id")
);
--> statement-breakpoint
CREATE TABLE "user_extra_perms" (
	"user_id" varchar NOT NULL,
	"perm" varchar(255) NOT NULL,
	"mode" "perm_mode" NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_extra_perms_user_id_perm_pk" PRIMARY KEY("user_id","perm")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"profile_image_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_system_admin" boolean DEFAULT false,
	"last_login_at" timestamp,
	"tenant_id" uuid,
	"status" varchar(50) DEFAULT 'active',
	"mfa_enabled" boolean DEFAULT false,
	"role" varchar(50),
	"store_id" uuid,
	"phone" varchar(20),
	"position" varchar(100),
	"department" varchar(100),
	"hire_date" date,
	"contract_type" varchar(50),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_role" varchar(100),
	"commercial_areas" text[],
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_ids" text[],
	"target_tenants" text[],
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "brand_campaign_type" DEFAULT 'global' NOT NULL,
	"status" "brand_campaign_status" DEFAULT 'draft' NOT NULL,
	"start_date" date,
	"end_date" date,
	"target_tenants" jsonb DEFAULT '[]'::jsonb,
	"content" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"archived_at" timestamp,
	CONSTRAINT "brand_campaigns_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"is_encrypted" boolean DEFAULT false,
	"access_level" varchar(50) DEFAULT 'global',
	"allowed_roles" text[] DEFAULT '{"super_admin"}',
	"last_modified_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "brand_configs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"price_list_id" uuid,
	"type" varchar(50) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_tenants" jsonb DEFAULT '[]'::jsonb,
	"status" "brand_deployment_status" DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"results" jsonb DEFAULT '{}'::jsonb,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"target_channels" jsonb DEFAULT '[]'::jsonb,
	"target_brands" jsonb DEFAULT '[]'::jsonb,
	"price_data" jsonb NOT NULL,
	"approval" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT false,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "brand_price_lists_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_global" boolean DEFAULT false,
	"allowed_areas" text[],
	"permissions" text[] NOT NULL,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"version" varchar(20) DEFAULT '1.0' NOT NULL,
	"description" text,
	"template_data" jsonb NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"preview" text,
	"is_public" boolean DEFAULT false,
	"usage_count" smallint DEFAULT 0,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "brand_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "brand_interface"."brand_users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" "brand_role" DEFAULT 'area_manager' NOT NULL,
	"commercial_area_codes" text[],
	"permissions" text[] NOT NULL,
	"department" varchar(100),
	"hire_date" date,
	"manager_id" varchar(255),
	"is_active" boolean DEFAULT true,
	"mfa_enabled" boolean DEFAULT false,
	"mfa_secret" varchar(255),
	"last_login_at" timestamp,
	"failed_login_attempts" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "brand_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "entity_logs" ADD CONSTRAINT "entity_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_entities" ADD CONSTRAINT "legal_entities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_perms" ADD CONSTRAINT "role_perms_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_brands" ADD CONSTRAINT "store_brands_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_brands" ADD CONSTRAINT "store_brands_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_driver_potential" ADD CONSTRAINT "store_driver_potential_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_driver_potential" ADD CONSTRAINT "store_driver_potential_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_legal_entity_id_legal_entities_id_fk" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_commercial_area_id_commercial_areas_id_fk" FOREIGN KEY ("commercial_area_id") REFERENCES "public"."commercial_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_extra_perms" ADD CONSTRAINT "user_extra_perms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_italian_cities_name" ON "italian_cities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_italian_cities_province" ON "italian_cities" USING btree ("province");--> statement-breakpoint
CREATE UNIQUE INDEX "italian_cities_unique" ON "italian_cities" USING btree ("name","province");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_tenant_name_unique" ON "roles" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_campaigns_code_unique" ON "brand_interface"."brand_campaigns" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_configs_key_unique" ON "brand_interface"."brand_configs" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_price_lists_code_unique" ON "brand_interface"."brand_price_lists" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_roles_name_unique" ON "brand_interface"."brand_roles" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_templates_code_unique" ON "brand_interface"."brand_templates" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_users_email_unique" ON "brand_interface"."brand_users" USING btree ("email");