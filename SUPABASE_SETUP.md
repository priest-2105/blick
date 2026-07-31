# Supabase Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase/schema.sql`.
3. Add these values to `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

4. In Supabase Auth, enable the Email provider. Magic-link auth is what the app uses.
5. Restart `npm run dev` after changing `.env.local`.

The app stores workshop saves in `public.saved_projects`. Row Level Security is enabled, and each user can only read, create, update, or delete rows where `user_id = auth.uid()`.

Next.js 16 uses `src/proxy.ts` instead of `middleware.ts`; the proxy refreshes Supabase sessions on matching app requests.
