import webpush from "web-push";
import * as db from "./db";

// VAPID keys for web push - generated with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BKwiIsKb8Asv9BIqyVVjR-3h9B86I3HNBc1bBAROfzbeW3qp6VsdikQekxrsPdGc7zIfm2DF_0rRLqL42BQlZvs";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "aI9P-RDFdcd8pQXmkWDkiSCTYB7-p927T3lz_l-dg48";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@ohwee.app";

// Initialize web-push if keys are available
let pushEnabled = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushEnabled = true;
    console.log("[Push] Web push notifications enabled");
  } catch (error) {
    console.error("[Push] Failed to initialize web push:", error);
  }
} else {
  console.log("[Push] VAPID keys not configured, push notifications disabled");
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    roomId?: number;
    messageId?: number;
  };
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<boolean> {
  if (!pushEnabled) {
    console.log("[Push] Push disabled, skipping notification to user", userId);
    return false;
  }

  try {
    const subscriptions = await db.getPushSubscriptionsForUser(userId);
    
    if (subscriptions.length === 0) {
      console.log("[Push] No subscriptions found for user", userId);
      return false;
    }

    const payloadString = JSON.stringify(payload);
    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadString
        );
        successCount++;
      } catch (error: unknown) {
        const err = error as { statusCode?: number };
        console.error("[Push] Failed to send to subscription:", err);
        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.removePushSubscription(sub.endpoint);
        }
      }
    }

    return successCount > 0;
  } catch (error) {
    console.error("[Push] Error sending push to user:", error);
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<number> {
  if (!pushEnabled || userIds.length === 0) {
    return 0;
  }

  let successCount = 0;
  
  for (const userId of userIds) {
    const sent = await sendPushToUser(userId, payload);
    if (sent) successCount++;
  }

  return successCount;
}

/**
 * Send push notification for a new chat message
 */
export async function sendNewMessagePush(
  roomId: number,
  senderId: number,
  senderName: string,
  messageContent: string,
  messageId: number
): Promise<void> {
  if (!pushEnabled) return;

  try {
    // Get all participants in the room except the sender
    const participants = await db.getChatRoomParticipants(roomId);
    const recipientIds = participants
      .filter((p) => p.user.id !== senderId)
      .map((p) => p.user.id);

    if (recipientIds.length === 0) return;

    // Get room info
    const room = await db.getChatRoomById(roomId);
    const roomName = room?.name || "Direktnachricht";

    // Truncate message content
    const truncatedContent = messageContent.length > 100 
      ? messageContent.substring(0, 100) + "..." 
      : messageContent;

    const payload: PushPayload = {
      title: room?.type === "direct" ? senderName : `${senderName} in ${roomName}`,
      body: truncatedContent,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: `chat-${roomId}`,
      data: {
        url: `/ohweees?room=${roomId}`,
        roomId,
        messageId,
      },
    };

    await sendPushToUsers(recipientIds, payload);
  } catch (error) {
    console.error("[Push] Error sending new message push:", error);
  }
}

/**
 * Send push notification for a mention
 */
export async function sendMentionPush(
  mentionedUserId: number,
  mentionedByName: string,
  contextType: string,
  contextTitle: string,
  contextUrl: string
): Promise<void> {
  if (!pushEnabled) return;

  const payload: PushPayload = {
    title: `${mentionedByName} hat dich erwähnt`,
    body: `In ${contextType}: ${contextTitle}`,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: "mention",
    data: {
      url: contextUrl,
    },
  };

  await sendPushToUser(mentionedUserId, payload);
}

export { pushEnabled, VAPID_PUBLIC_KEY };
