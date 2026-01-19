import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { emailQueue, emailSettings, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Email types for different notifications
export type EmailType = 
  | "leave_request_submitted"
  | "leave_request_approved"
  | "leave_request_rejected"
  | "article_review_requested"
  | "article_approved"
  | "article_rejected"
  | "article_feedback"
  | "mentioned"
  | "daily_digest"
  | "weekly_digest";

interface SendEmailParams {
  recipientId: number;
  recipientEmail: string;
  emailType: EmailType;
  subject: string;
  content: string;
  relatedType?: string;
  relatedId?: number;
}

/**
 * Check if user wants to receive this type of email notification
 */
export async function shouldSendEmail(userId: number, emailType: EmailType): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const settings = await db
    .select()
    .from(emailSettings)
    .where(eq(emailSettings.userId, userId))
    .limit(1);

  // If no settings exist, use defaults (all enabled)
  if (settings.length === 0) {
    return true;
  }

  const userSettings = settings[0];

  // Map email type to setting field
  switch (emailType) {
    case "leave_request_submitted":
      return userSettings.leaveRequestSubmitted;
    case "leave_request_approved":
      return userSettings.leaveRequestApproved;
    case "leave_request_rejected":
      return userSettings.leaveRequestRejected;
    case "article_review_requested":
      return userSettings.articleReviewRequested;
    case "article_approved":
      return userSettings.articleApproved;
    case "article_rejected":
      return userSettings.articleRejected;
    case "article_feedback":
      return userSettings.articleFeedback;
    case "mentioned":
      return userSettings.mentioned;
    default:
      return true;
  }
}

/**
 * Queue an email for sending
 */
export async function queueEmail(params: SendEmailParams): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(emailQueue).values({
      recipientId: params.recipientId,
      recipientEmail: params.recipientEmail,
      emailType: params.emailType,
      subject: params.subject,
      content: params.content,
      relatedType: params.relatedType,
      relatedId: params.relatedId,
      status: "pending",
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to queue email:", error);
    return false;
  }
}

/**
 * Send email notification using Manus notification system
 * This sends to the owner - for production, integrate with SendGrid/Mailgun
 */
export async function sendEmailNotification(params: SendEmailParams): Promise<boolean> {
  // Check if user wants this notification
  const shouldSend = await shouldSendEmail(params.recipientId, params.emailType);
  if (!shouldSend) {
    console.log(`[Email] User ${params.recipientId} has disabled ${params.emailType} notifications`);
    return false;
  }

  // Queue the email
  await queueEmail(params);

  // Use Manus notification system to send
  // This notifies the owner - in production, replace with actual email service
  try {
    const success = await notifyOwner({
      title: params.subject,
      content: `An: ${params.recipientEmail}\n\n${params.content}`,
    });

    // Update queue status
    const db = await getDb();
    if (db) {
      // Mark as sent (simplified - in production, match by ID)
      await db
        .update(emailQueue)
        .set({ status: success ? "sent" : "failed", sentAt: new Date() })
        .where(eq(emailQueue.recipientEmail, params.recipientEmail));
    }

    return success;
  } catch (error) {
    console.error("[Email] Failed to send notification:", error);
    return false;
  }
}

/**
 * Get all admins for notifications (e.g., leave request approvers)
 */
export async function getAdminUsers() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.role, "admin"));
}

/**
 * Send leave request notification to all admins
 */
export async function notifyAdminsOfLeaveRequest(
  requesterName: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  reason?: string
): Promise<void> {
  const admins = await getAdminUsers();

  const formatDate = (d: Date) => d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const subject = `Neuer Urlaubsantrag: ${requesterName}`;
  const content = `
${requesterName} hat einen Urlaubsantrag gestellt:

Art: ${leaveType}
Zeitraum: ${formatDate(startDate)} - ${formatDate(endDate)}
Tage: ${totalDays}
${reason ? `Grund: ${reason}` : ""}

Bitte prüfen Sie den Antrag im Company Wiki.
  `.trim();

  for (const admin of admins) {
    if (admin.email) {
      await sendEmailNotification({
        recipientId: admin.id,
        recipientEmail: admin.email,
        emailType: "leave_request_submitted",
        subject,
        content,
        relatedType: "leave_request",
      });
    }
  }
}

/**
 * Send leave request decision notification (simplified version)
 */
export async function notifyLeaveRequestDecision(
  recipientEmail: string,
  recipientName: string,
  decision: "approved" | "rejected",
  startDate: Date,
  endDate: Date,
  comment?: string
): Promise<void> {
  const formatDate = (d: Date) => d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const statusText = decision === "approved" ? "genehmigt" : "abgelehnt";
  const subject = `Urlaubsantrag ${statusText}`;
  const content = `
Hallo ${recipientName},

Ihr Urlaubsantrag wurde ${statusText}.

Zeitraum: ${formatDate(startDate)} - ${formatDate(endDate)}
${comment ? `Kommentar: ${comment}` : ""}

Mit freundlichen Grüßen,
Ihr Company Wiki Team
  `.trim();

  // Use Manus notification system
  try {
    await notifyOwner({
      title: subject,
      content: `An: ${recipientEmail}\n\n${content}`,
    });
  } catch (error) {
    console.error("[Email] Failed to send leave decision notification:", error);
  }
}

/**
 * Send leave request status update to requester
 */
export async function notifyLeaveRequestStatus(
  requesterId: number,
  requesterEmail: string,
  status: "approved" | "rejected",
  approverName: string,
  startDate: Date,
  endDate: Date,
  comment?: string
): Promise<void> {
  const formatDate = (d: Date) => d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const statusText = status === "approved" ? "genehmigt" : "abgelehnt";
  const subject = `Urlaubsantrag ${statusText}`;
  const content = `
Ihr Urlaubsantrag wurde ${statusText}.

Zeitraum: ${formatDate(startDate)} - ${formatDate(endDate)}
Bearbeitet von: ${approverName}
${comment ? `Kommentar: ${comment}` : ""}
  `.trim();

  await sendEmailNotification({
    recipientId: requesterId,
    recipientEmail: requesterEmail,
    emailType: status === "approved" ? "leave_request_approved" : "leave_request_rejected",
    subject,
    content,
    relatedType: "leave_request",
  });
}

/**
 * Send mention notification
 */
export async function notifyMention(
  mentionedUserId: number,
  mentionedUserEmail: string,
  mentionedByName: string,
  contextType: "article" | "comment" | "sop",
  contextTitle: string,
  contextUrl: string
): Promise<void> {
  const contextTypeText = contextType === "article" ? "einem Artikel" : 
                          contextType === "comment" ? "einem Kommentar" : "einer SOP";

  const subject = `${mentionedByName} hat Sie erwähnt`;
  const content = `
${mentionedByName} hat Sie in ${contextTypeText} erwähnt:

"${contextTitle}"

Klicken Sie hier, um den Inhalt anzusehen: ${contextUrl}
  `.trim();

  await sendEmailNotification({
    recipientId: mentionedUserId,
    recipientEmail: mentionedUserEmail,
    emailType: "mentioned",
    subject,
    content,
    relatedType: contextType,
  });
}

/**
 * Send article review request notification
 */
export async function notifyReviewRequest(
  reviewerId: number,
  reviewerEmail: string,
  requesterName: string,
  articleTitle: string,
  message?: string
): Promise<void> {
  const subject = `Review-Anfrage: ${articleTitle}`;
  const content = `
${requesterName} bittet um Review für den Artikel:

"${articleTitle}"

${message ? `Nachricht: ${message}` : ""}

Bitte prüfen Sie den Artikel im Company Wiki.
  `.trim();

  await sendEmailNotification({
    recipientId: reviewerId,
    recipientEmail: reviewerEmail,
    emailType: "article_review_requested",
    subject,
    content,
    relatedType: "article",
  });
}

/**
 * Send article feedback notification to author
 */
export async function notifyArticleFeedback(
  authorId: number,
  authorEmail: string,
  feedbackType: string,
  articleTitle: string,
  feedbackMessage?: string
): Promise<void> {
  const subject = `Neues Feedback: ${articleTitle}`;
  const content = `
Sie haben neues Feedback zu Ihrem Artikel erhalten:

Artikel: "${articleTitle}"
Bewertung: ${feedbackType}
${feedbackMessage ? `Kommentar: ${feedbackMessage}` : ""}

Sehen Sie sich das Feedback im Company Wiki an.
  `.trim();

  await sendEmailNotification({
    recipientId: authorId,
    recipientEmail: authorEmail,
    emailType: "article_feedback",
    subject,
    content,
    relatedType: "article",
  });
}
