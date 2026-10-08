import { db } from "./db";

/**
 * PostgreSQL persistence for newsletter subscribers (replaces the previous JSONL stopgap —
 * see migrations/001_create_leads_and_subscribers.sql). Uniqueness on LOWER(email) is now
 * enforced at the database level, closing the race condition the old file-based
 * "read everything, check, then append" pattern was exposed to.
 */

export interface StoredSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  ip: string;
  status: "ACTIVE" | "UNSUBSCRIBED";
}

interface SubscriberRow {
  id: string;
  email: string;
  subscribed_at: Date;
  ip: string | null;
  status: "ACTIVE" | "UNSUBSCRIBED";
}

function rowToSubscriber(row: SubscriberRow): StoredSubscriber {
  return {
    id: row.id,
    email: row.email,
    subscribedAt: row.subscribed_at.toISOString(),
    ip: row.ip ?? "unknown",
    status: row.status,
  };
}

/** Returns the existing record if already subscribed, otherwise creates and returns a new one. */
export async function subscribe(
  email: string,
  ip: string
): Promise<{ subscriber: StoredSubscriber; alreadySubscribed: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.query<SubscriberRow>(
    `
      SELECT id, email, subscribed_at, ip, status
      FROM newsletter_subscribers
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (existing.rows.length > 0) {
    const subscriber = rowToSubscriber(existing.rows[0]);

    // If someone previously unsubscribed and subscribes again, reactivate the existing
    // record rather than creating another one.
    if (subscriber.status === "UNSUBSCRIBED") {
      const reactivated = await db.query<SubscriberRow>(
        `
          UPDATE newsletter_subscribers
          SET status = 'ACTIVE', updated_at = NOW()
          WHERE id = $1
          RETURNING id, email, subscribed_at, ip, status
        `,
        [subscriber.id]
      );
      return { subscriber: rowToSubscriber(reactivated.rows[0]), alreadySubscribed: false };
    }

    return { subscriber, alreadySubscribed: true };
  }

  // The unique LOWER(email) index protects against concurrent duplicate subscriptions at
  // the database level even if two requests race past the SELECT above.
  const result = await db.query<SubscriberRow>(
    `
      INSERT INTO newsletter_subscribers (email, ip, status)
      VALUES ($1, $2, 'ACTIVE')
      RETURNING id, email, subscribed_at, ip, status
    `,
    [normalizedEmail, ip]
  );

  return { subscriber: rowToSubscriber(result.rows[0]), alreadySubscribed: false };
}

export async function readAllSubscribers(): Promise<StoredSubscriber[]> {
  const result = await db.query<SubscriberRow>(
    `
      SELECT id, email, subscribed_at, ip, status
      FROM newsletter_subscribers
      ORDER BY subscribed_at DESC
    `
  );
  return result.rows.map(rowToSubscriber);
}
