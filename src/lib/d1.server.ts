import { createServerFn } from "@tanstack/react-start";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";

export type D1Database = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
};

function getD1(): D1Database {
  const db = (globalThis as typeof globalThis & { DB?: D1Database }).DB;
  if (!db) throw new Error("D1 binding DB is not available");
  return db;
}

export const ensureProfile = createServerFn({ method: "POST" }).handler(async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const user = await clerkClient().users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress ?? null;
  const username = user.username ?? `user_${userId.slice(-8)}`;
  const displayName = user.fullName ?? user.firstName ?? username;
  const avatarUrl = user.imageUrl ?? null;
  const db = getD1();

  await db.prepare(
    `INSERT INTO profiles (id, username, display_name, avatar_url, bio, status)
     VALUES (?, ?, ?, ?, '', 'active')
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url`
  ).bind(userId, username, displayName, avatarUrl).run();

  await db.prepare(
    `INSERT INTO user_roles (user_id, role)
     VALUES (?, 'user')
     ON CONFLICT(user_id, role) DO NOTHING`
  ).bind(userId).run();

  return { id: userId, username, display_name: displayName, avatar_url: avatarUrl, bio: "", status: "active", email };
});
