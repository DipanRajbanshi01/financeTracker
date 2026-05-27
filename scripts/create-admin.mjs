// One-off: mint (or reset password for) a Supabase auth user using the
// service-role key from .env.local. Talks to the Auth admin REST endpoints
// directly to avoid the supabase-js realtime/websocket dependency on Node 20.
//
// Usage:
//   node scripts/create-admin.mjs                       # default: admin@orbit.local
//   node scripts/create-admin.mjs your@email.com        # custom email

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

function readEnv(key) {
  const file = readFileSync(".env.local", "utf8");
  const match = file.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const email = (process.argv[2] || "admin@orbit.local").toLowerCase();

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const bytes = randomBytes(14);
let password = "";
for (let i = 0; i < 14; i++) password += alphabet[bytes[i] % alphabet.length];

const baseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function findUserByEmail(email) {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: baseHeaders });
  if (!res.ok) throw new Error(`listUsers ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return body.users?.find((u) => u.email?.toLowerCase() === email) ?? null;
}

async function createUser(email, password) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`createUser ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function updatePassword(id, password) {
  const res = await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: baseHeaders,
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`updateUser ${res.status}: ${await res.text()}`);
  return await res.json();
}

try {
  const existing = await findUserByEmail(email);
  let userId;
  let action;
  if (existing) {
    await updatePassword(existing.id, password);
    userId = existing.id;
    action = "Password reset on existing user";
  } else {
    const user = await createUser(email, password);
    userId = user.id ?? user.user?.id;
    action = "New user created";
  }

  console.log("");
  console.log("=================================================");
  console.log(action);
  console.log("=================================================");
  console.log("  Email:    " + email);
  console.log("  Password: " + password);
  console.log("  User ID:  " + userId);
  console.log("=================================================");
  console.log("");
  console.log("Sign in at /login with these.");
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}
