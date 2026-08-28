# Homie CRM

Standalone internal business CRM for Homie. It has its own frontend, build, environment configuration, and database migrations; it is not bundled into the customer-facing Homie app.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Homie Supabase URL and publishable key.
2. Run `npm install`.
3. Run `npm run dev` and open `http://localhost:3010`.

The CRM uses the same Supabase authentication and workspaces as Homie while remaining independently deployable.
