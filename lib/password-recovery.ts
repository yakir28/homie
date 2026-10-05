export function readRecoveryTokens(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.has("error") || params.get("type") !== "recovery") return null;
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 8) return "Use at least 8 characters for your new password.";
  if (password !== confirmation) return "Your passwords don’t match. Please try again.";
  return null;
}
