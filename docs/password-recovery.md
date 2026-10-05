# Password recovery rollout

Production redirect URLs were added to Supabase on 2026-10-05. Existing login/app redirects were preserved.

Flow: `/login` → `/forgot-password` → email → `/reset-password` → `/login`.
The browser uses Supabase's existing implicit email recovery flow. The reset page
accepts only a complete `type=recovery` URL fragment, clears it immediately,
validates the session with Supabase, and holds it only in memory. Refreshing the
reset page requires reopening a valid recovery link. Existing browser sign-in
sessions do not unlock the reset form.

Supabase Authentication URL Configuration:

- `http://localhost:3000/reset-password` (add before local email testing)
- `https://try-homie.com/reset-password` (production, configured)
- `https://www.try-homie.com/reset-password` (production www, configured)

Keep the existing login/app redirect URLs. Ensure the reset email template uses
Supabase's `{{ .ConfirmationURL }}` rather than a fixed destination. Do not send
test emails or change a real account password without the user's instruction.

Verify with a dedicated test account: request email, open latest link, mismatch
validation, successful update, sign in with new password, old-password rejection,
expired link, resend cooldown, and network/service errors. Unit/UI checks alone
do not confirm email delivery or a real password change.
