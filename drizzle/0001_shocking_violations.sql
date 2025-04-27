CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text,
	"payload" jsonb,
	"status" text DEFAULT 'pending',
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_name" text,
	"description" text,
	"avatar" text,
	"skills" jsonb,
	"owner_emp_id" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "agents_code_name_unique" UNIQUE("code_name")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text,
	"email" text,
	"profile_photo" text,
	"role" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "quote_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "client_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_agents_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_emp_id_employees_id_fk" FOREIGN KEY ("owner_emp_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;