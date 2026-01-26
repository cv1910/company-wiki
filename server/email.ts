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
  | "weekly_digest"
  | "booking_confirmation"
  | "task_assigned"
  | "task_reminder"
  | "shift_assigned"
  | "shift_changed"
  | "shift_cancelled"
  | "shift_swap_request";

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
    case "shift_assigned":
      return userSettings.shiftAssigned;
    case "shift_changed":
      return userSettings.shiftChanged;
    case "shift_cancelled":
      return userSettings.shiftCancelled;
    case "shift_swap_request":
      return userSettings.shiftSwapRequest;
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

/**
 * Send new comment notification to article author
 */
export async function notifyNewComment(
  authorId: number,
  authorEmail: string,
  commenterName: string,
  articleTitle: string,
  commentPreview: string,
  articleUrl: string
): Promise<void> {
  const subject = `Neuer Kommentar zu "${articleTitle}"`;
  const content = `
${commenterName} hat einen Kommentar zu Ihrem Artikel hinzugefügt:

Artikel: "${articleTitle}"

Kommentar-Vorschau:
"${commentPreview}${commentPreview.length >= 200 ? "..." : ""}"

Klicken Sie hier, um den Artikel anzusehen: ${articleUrl}
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


/**
 * Send booking confirmation email to guest
 */
export async function sendBookingConfirmationEmail(params: {
  guestEmail: string;
  guestName: string;
  eventTypeName: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  locationType: string;
  locationDetails?: string | null;
  meetingLink?: string | null;
  guestNotes?: string | null;
}): Promise<void> {
  const formatDate = (d: Date) => d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formatTime = (d: Date) => d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationTypeLabels: Record<string, string> = {
    google_meet: "Google Meet Videokonferenz",
    phone: "Telefonat",
    in_person: "Vor Ort",
    custom: "Benutzerdefiniert",
  };

  const locationLabel = locationTypeLabels[params.locationType] || params.locationType;

  let locationSection = `Ort: ${locationLabel}`;
  if (params.locationDetails) {
    locationSection += `\n${params.locationDetails}`;
  }
  if (params.meetingLink) {
    locationSection += `\n\n🔗 Google Meet-Link:\n${params.meetingLink}\n\nKlicken Sie auf den Link, um dem Meeting beizutreten.`;
  }

  const subject = `Terminbestätigung: ${params.eventTypeName} mit ${params.hostName}`;
  const content = `
Hallo ${params.guestName},

Ihr Termin wurde erfolgreich gebucht!

📅 Termin: ${params.eventTypeName}
👤 Mit: ${params.hostName}
📆 Datum: ${formatDate(params.startTime)}
🕐 Uhrzeit: ${formatTime(params.startTime)} - ${formatTime(params.endTime)}

${locationSection}
${params.guestNotes ? `\n📝 Ihre Notizen:\n${params.guestNotes}` : ""}

Wir freuen uns auf das Gespräch!

Mit freundlichen Grüßen,
Ihr Company Wiki Team
  `.trim();

  // Use Manus notification system to send
  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.guestEmail}\n\n${content}`,
    });
    console.log(`[Email] Booking confirmation sent to ${params.guestEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send booking confirmation:", error);
  }
}

/**
 * Send booking notification to host
 */
export async function sendBookingNotificationToHost(params: {
  hostId: number;
  hostEmail: string;
  hostName: string;
  guestName: string;
  guestEmail: string;
  eventTypeName: string;
  startTime: Date;
  endTime: Date;
  locationType: string;
  meetingLink?: string | null;
  guestNotes?: string | null;
}): Promise<void> {
  const formatDate = (d: Date) => d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formatTime = (d: Date) => d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `Neue Buchung: ${params.eventTypeName}`;
  const content = `
Hallo ${params.hostName},

Sie haben eine neue Terminbuchung erhalten!

📅 Termin: ${params.eventTypeName}
👤 Gast: ${params.guestName} (${params.guestEmail})
📆 Datum: ${formatDate(params.startTime)}
🕐 Uhrzeit: ${formatTime(params.startTime)} - ${formatTime(params.endTime)}
${params.meetingLink ? `\n🔗 Meeting-Link: ${params.meetingLink}` : ""}
${params.guestNotes ? `\n📝 Notizen vom Gast:\n${params.guestNotes}` : ""}

Der Termin wurde automatisch in Ihrem Google Kalender eingetragen.

Mit freundlichen Grüßen,
Ihr Company Wiki Team
  `.trim();

  // Use Manus notification system
  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.hostEmail}\n\n${content}`,
    });
    console.log(`[Email] Booking notification sent to host ${params.hostEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send booking notification to host:", error);
  }
}


/**
 * Send booking reminder email to guest
 */
export async function sendBookingReminderToGuest(params: {
  guestEmail: string;
  guestName: string;
  eventTypeName: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  locationType: string;
  locationDetails?: string | null;
  meetingLink?: string | null;
  minutesUntilEvent: number;
}): Promise<void> {
  const formatDate = (d: Date) => d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formatTime = (d: Date) => d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationTypeLabels: Record<string, string> = {
    google_meet: "Google Meet Videokonferenz",
    phone: "Telefonat",
    in_person: "Vor Ort",
    custom: "Benutzerdefiniert",
  };

  const locationLabel = locationTypeLabels[params.locationType] || params.locationType;

  // Format time until event
  let timeUntilText: string;
  if (params.minutesUntilEvent >= 1440) {
    const hours = Math.round(params.minutesUntilEvent / 60);
    timeUntilText = hours >= 24 ? `${Math.round(hours / 24)} Tag(e)` : `${hours} Stunden`;
  } else if (params.minutesUntilEvent >= 60) {
    timeUntilText = `${Math.round(params.minutesUntilEvent / 60)} Stunde(n)`;
  } else {
    timeUntilText = `${params.minutesUntilEvent} Minuten`;
  }

  let locationSection = `📍 Ort: ${locationLabel}`;
  if (params.locationDetails) {
    locationSection += `\n${params.locationDetails}`;
  }
  if (params.meetingLink) {
    locationSection += `\n\n🔗 Google Meet-Link:\n${params.meetingLink}\n\nKlicken Sie auf den Link, um dem Meeting beizutreten.`;
  }

  const subject = `⏰ Erinnerung: ${params.eventTypeName} in ${timeUntilText}`;
  const content = `
Hallo ${params.guestName},

Dies ist eine Erinnerung an Ihren bevorstehenden Termin in ${timeUntilText}!

📅 Termin: ${params.eventTypeName}
👤 Mit: ${params.hostName}
📆 Datum: ${formatDate(params.startTime)}
🕐 Uhrzeit: ${formatTime(params.startTime)} - ${formatTime(params.endTime)}

${locationSection}

Wir freuen uns auf das Gespräch!

Mit freundlichen Grüßen,
Ihr Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.guestEmail}\n\n${content}`,
    });
    console.log(`[Email] Booking reminder sent to guest ${params.guestEmail} (${params.minutesUntilEvent} min before)`);
  } catch (error) {
    console.error("[Email] Failed to send booking reminder to guest:", error);
  }
}

/**
 * Send booking reminder email to host
 */
export async function sendBookingReminderToHost(params: {
  hostEmail: string;
  hostName: string;
  guestName: string;
  guestEmail: string;
  eventTypeName: string;
  startTime: Date;
  endTime: Date;
  meetingLink?: string | null;
  minutesUntilEvent: number;
}): Promise<void> {
  const formatDate = (d: Date) => d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formatTime = (d: Date) => d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Format time until event
  let timeUntilText: string;
  if (params.minutesUntilEvent >= 1440) {
    const hours = Math.round(params.minutesUntilEvent / 60);
    timeUntilText = hours >= 24 ? `${Math.round(hours / 24)} Tag(e)` : `${hours} Stunden`;
  } else if (params.minutesUntilEvent >= 60) {
    timeUntilText = `${Math.round(params.minutesUntilEvent / 60)} Stunde(n)`;
  } else {
    timeUntilText = `${params.minutesUntilEvent} Minuten`;
  }

  const subject = `⏰ Erinnerung: ${params.eventTypeName} mit ${params.guestName} in ${timeUntilText}`;
  const content = `
Hallo ${params.hostName},

Dies ist eine Erinnerung an Ihren bevorstehenden Termin in ${timeUntilText}!

📅 Termin: ${params.eventTypeName}
👤 Gast: ${params.guestName} (${params.guestEmail})
📆 Datum: ${formatDate(params.startTime)}
🕐 Uhrzeit: ${formatTime(params.startTime)} - ${formatTime(params.endTime)}
${params.meetingLink ? `\n🔗 Meeting-Link: ${params.meetingLink}` : ""}

Mit freundlichen Grüßen,
Ihr Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.hostEmail}\n\n${content}`,
    });
    console.log(`[Email] Booking reminder sent to host ${params.hostEmail} (${params.minutesUntilEvent} min before)`);
  } catch (error) {
    console.error("[Email] Failed to send booking reminder to host:", error);
  }
}

/**
 * Send mention notification email
 */
export async function sendMentionEmail(params: {
  recipientEmail: string;
  recipientName: string;
  mentionedByName: string;
  contextType: string;
  contextTitle: string;
  contextLink: string;
  excerpt: string;
}): Promise<void> {
  const subject = `${params.mentionedByName} hat dich in einem ${params.contextType} erwähnt`;
  
  const content = `
Hallo ${params.recipientName},

${params.mentionedByName} hat dich in "${params.contextTitle}" erwähnt:

"${params.excerpt}"

Klicke hier, um die Nachricht zu sehen:
${params.contextLink}

---
Company Wiki
`;

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.recipientEmail}\n\n${content}`,
    });
    console.log(`[Email] Mention notification sent to ${params.recipientEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send mention email:", error);
  }
}


/**
 * Send task assigned email notification
 */
export async function sendTaskAssignedEmail(params: {
  assigneeId: number;
  assigneeEmail: string;
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  taskDescription?: string | null;
  dueDate?: Date | null;
  priority: string;
}): Promise<void> {
  const subject = `Neue Aufgabe: ${params.taskTitle}`;
  
  let dueDateText = "";
  if (params.dueDate) {
    const date = new Date(params.dueDate);
    dueDateText = `\nFällig am: ${date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  }

  const priorityLabels: Record<string, string> = {
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    urgent: "Dringend",
  };

  const content = `Hallo ${params.assigneeName},

${params.assignerName} hat dir eine neue Aufgabe zugewiesen:

**${params.taskTitle}**
${params.taskDescription ? `\n${params.taskDescription}\n` : ""}
Priorität: ${priorityLabels[params.priority] || params.priority}${dueDateText}

Öffne die Aufgaben-Seite, um die Aufgabe zu bearbeiten.

---
Company Wiki
`;

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.assigneeEmail}\n\n${content}`,
    });
    console.log(`[Email] Task assigned notification sent to ${params.assigneeEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send task assigned email:", error);
  }
}


/**
 * Send task reminder email before due date
 */
export async function sendTaskReminderEmail(params: {
  userId: number;
  userEmail: string;
  userName: string;
  taskId: number;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  dueDate: Date;
  daysUntilDue: number;
}) {
  // Check if user wants to receive task reminder emails
  const shouldSend = await shouldSendEmail(params.userId, "task_reminder");
  if (!shouldSend) {
    console.log(`[Email] User ${params.userId} has disabled task reminder emails`);
    return;
  }

  const dueDateFormatted = params.dueDate.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const priorityLabels: Record<string, string> = {
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    urgent: "Dringend",
  };

  let urgencyText = "";
  if (params.daysUntilDue === 0) {
    urgencyText = "**Heute fällig!**";
  } else if (params.daysUntilDue === 1) {
    urgencyText = "**Morgen fällig!**";
  } else {
    urgencyText = `Fällig in ${params.daysUntilDue} Tagen`;
  }

  const subject = params.daysUntilDue === 0 
    ? `⚠️ Aufgabe heute fällig: ${params.taskTitle}`
    : `📅 Erinnerung: Aufgabe "${params.taskTitle}" - ${urgencyText}`;

  const content = `Hallo ${params.userName},

dies ist eine Erinnerung an deine Aufgabe:

**${params.taskTitle}**
${params.taskDescription ? `\n${params.taskDescription}\n` : ""}
Priorität: ${priorityLabels[params.priority] || params.priority}
Fällig am: ${dueDateFormatted}
${urgencyText}

Öffne die Aufgaben-Seite, um die Aufgabe zu bearbeiten.

---
Company Wiki
`;

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.userEmail}\n\n${content}`,
    });
    console.log(`[Email] Task reminder sent to ${params.userEmail} for task ${params.taskId}`);
  } catch (error) {
    console.error("[Email] Failed to send task reminder email:", error);
  }
}


/**
 * Send shift assignment notification email
 */
export async function sendShiftAssignedEmail(params: {
  userId: number;
  userEmail: string;
  userName: string;
  shiftTitle: string;
  shiftDate: string;
  teamName: string;
  assignedByName: string;
}) {
  const shouldSend = await shouldSendEmail(params.userId, "shift_assigned");
  if (!shouldSend) {
    console.log(`[Email] User ${params.userId} has disabled shift_assigned notifications`);
    return;
  }

  const subject = `Neue Schicht zugewiesen: ${params.shiftTitle}`;
  const content = `
Hallo ${params.userName},

Dir wurde eine neue Schicht zugewiesen:

**Schicht:** ${params.shiftTitle}
**Datum:** ${params.shiftDate}
**Team:** ${params.teamName}
**Zugewiesen von:** ${params.assignedByName}

Bitte überprüfe deinen Kalender für weitere Details.

Viele Grüße,
Dein Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.userEmail}\n\n${content}`,
    });
    console.log(`[Email] Shift assigned notification sent to ${params.userEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send shift assigned email:", error);
  }
}



/**
 * Send shift change notification email
 */
export async function sendShiftChangedEmail(params: {
  userId: number;
  userEmail: string;
  userName: string;
  shiftTitle: string;
  oldDate: string;
  newDate: string;
  oldTime?: string;
  newTime?: string;
  teamName: string;
  changedByName: string;
  changeReason?: string;
}) {
  const shouldSend = await shouldSendEmail(params.userId, "shift_assigned");
  if (!shouldSend) {
    console.log(`[Email] User ${params.userId} has disabled shift notifications`);
    return;
  }

  const subject = `Schicht geändert: ${params.shiftTitle}`;
  const content = `
Hallo ${params.userName},

Deine Schicht wurde geändert:

**Schicht:** ${params.shiftTitle}
**Team:** ${params.teamName}

**Vorher:**
- Datum: ${params.oldDate}${params.oldTime ? `\n- Zeit: ${params.oldTime}` : ""}

**Nachher:**
- Datum: ${params.newDate}${params.newTime ? `\n- Zeit: ${params.newTime}` : ""}

**Geändert von:** ${params.changedByName}
${params.changeReason ? `**Grund:** ${params.changeReason}` : ""}

Bitte überprüfe deinen Kalender für weitere Details.

Viele Grüße,
Dein Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.userEmail}\n\n${content}`,
    });
    console.log(`[Email] Shift changed notification sent to ${params.userEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send shift changed email:", error);
  }
}


/**
 * Send shift cancelled notification email
 */
export async function sendShiftCancelledEmail(params: {
  userId: number;
  userEmail: string;
  userName: string;
  shiftTitle: string;
  shiftDate: string;
  teamName: string;
  cancelledByName: string;
  cancelReason?: string;
}) {
  const shouldSend = await shouldSendEmail(params.userId, "shift_assigned");
  if (!shouldSend) {
    console.log(`[Email] User ${params.userId} has disabled shift notifications`);
    return;
  }

  const subject = `Schicht storniert: ${params.shiftTitle}`;
  const content = `
Hallo ${params.userName},

Deine Schicht wurde storniert:

**Schicht:** ${params.shiftTitle}
**Datum:** ${params.shiftDate}
**Team:** ${params.teamName}

**Storniert von:** ${params.cancelledByName}
${params.cancelReason ? `**Grund:** ${params.cancelReason}` : ""}

Bitte wende dich an deinen Teamleiter, falls du Fragen hast.

Viele Grüße,
Dein Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.userEmail}\n\n${content}`,
    });
    console.log(`[Email] Shift cancelled notification sent to ${params.userEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send shift cancelled email:", error);
  }
}


/**
 * Send shift swap request notification email
 */
export async function sendShiftSwapRequestEmail(params: {
  targetUserId: number;
  targetUserEmail: string;
  targetUserName: string;
  requesterName: string;
  requesterShiftTitle: string;
  requesterShiftDate: string;
  targetShiftTitle: string;
  targetShiftDate: string;
  teamName: string;
  message?: string;
}) {
  const shouldSend = await shouldSendEmail(params.targetUserId, "shift_assigned");
  if (!shouldSend) {
    console.log(`[Email] User ${params.targetUserId} has disabled shift notifications`);
    return;
  }

  const subject = `Schicht-Tausch-Anfrage von ${params.requesterName}`;
  const content = `
Hallo ${params.targetUserName},

${params.requesterName} möchte eine Schicht mit dir tauschen:

**Deine Schicht:**
- ${params.targetShiftTitle}
- Datum: ${params.targetShiftDate}

**Schicht von ${params.requesterName}:**
- ${params.requesterShiftTitle}
- Datum: ${params.requesterShiftDate}

**Team:** ${params.teamName}
${params.message ? `\n**Nachricht:** ${params.message}` : ""}

Bitte überprüfe die Anfrage im Kalender und akzeptiere oder lehne sie ab.

Viele Grüße,
Dein Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.targetUserEmail}\n\n${content}`,
    });
    console.log(`[Email] Shift swap request notification sent to ${params.targetUserEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send shift swap request email:", error);
  }
}


/**
 * Send shift swap response notification email
 */
export async function sendShiftSwapResponseEmail(params: {
  requesterId: number;
  requesterEmail: string;
  requesterName: string;
  responderName: string;
  status: "approved" | "rejected";
  requesterShiftTitle: string;
  requesterShiftDate: string;
  targetShiftTitle: string;
  targetShiftDate: string;
  teamName: string;
  responseMessage?: string;
}) {
  const shouldSend = await shouldSendEmail(params.requesterId, "shift_assigned");
  if (!shouldSend) {
    console.log(`[Email] User ${params.requesterId} has disabled shift notifications`);
    return;
  }

  const statusText = params.status === "approved" ? "angenommen" : "abgelehnt";
  const subject = `Schicht-Tausch ${statusText}`;
  const content = `
Hallo ${params.requesterName},

${params.responderName} hat deine Schicht-Tausch-Anfrage ${statusText}.

**Deine Schicht:**
- ${params.requesterShiftTitle}
- Datum: ${params.requesterShiftDate}

**Schicht von ${params.responderName}:**
- ${params.targetShiftTitle}
- Datum: ${params.targetShiftDate}

**Team:** ${params.teamName}
${params.responseMessage ? `\n**Nachricht:** ${params.responseMessage}` : ""}

${params.status === "approved" 
  ? "Die Schichten wurden erfolgreich getauscht. Bitte überprüfe deinen Kalender."
  : "Die Anfrage wurde abgelehnt. Bitte kontaktiere deinen Teamleiter für Alternativen."}

Viele Grüße,
Dein Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.requesterEmail}\n\n${content}`,
    });
    console.log(`[Email] Shift swap response notification sent to ${params.requesterEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send shift swap response email:", error);
  }
}


/**
 * Send user invitation email
 */
export async function sendInvitationEmail(params: {
  recipientEmail: string;
  inviterName: string;
  inviteLink: string;
  suggestedRole?: string;
}): Promise<boolean> {
  const roleText = params.suggestedRole 
    ? `Du wirst als ${params.suggestedRole === 'admin' ? 'Administrator' : params.suggestedRole === 'editor' ? 'Editor' : 'Benutzer'} eingeladen.`
    : '';

  const subject = `Einladung zum Company Wiki von ${params.inviterName}`;
  const content = `
Hallo,

${params.inviterName} hat dich zum Company Wiki eingeladen!

${roleText}

Klicke auf den folgenden Link, um dich anzumelden:
${params.inviteLink}

Nach der Anmeldung mit deinem Google-Konto erhältst du automatisch Zugang.

Bei Fragen wende dich an das Admin-Team.

Viele Grüße,
Das Company Wiki Team
  `.trim();

  try {
    const success = await notifyOwner({
      title: subject,
      content: `An: ${params.recipientEmail}\n\n${content}`,
    });
    console.log(`[Email] Invitation sent to ${params.recipientEmail}`);
    return success;
  } catch (error) {
    console.error("[Email] Failed to send invitation email:", error);
    return false;
  }
}


/**
 * Send sick leave notification to supervisors/admins
 */
export async function sendSickLeaveNotificationEmail(params: {
  employeeName: string;
  employeeEmail: string;
  shiftTitle: string;
  shiftDate: string;
  shiftTime: string;
  location?: string;
  sickLeaveNote?: string;
  teamName?: string;
}) {
  const subject = `Krankmeldung: ${params.employeeName} - ${params.shiftDate}`;
  const content = `
Krankmeldung eingegangen

**Mitarbeiter:** ${params.employeeName} (${params.employeeEmail})
**Schicht:** ${params.shiftTitle}
**Datum:** ${params.shiftDate}
**Zeit:** ${params.shiftTime}
${params.location ? `**Standort:** ${params.location}` : ""}
${params.teamName ? `**Team:** ${params.teamName}` : ""}
${params.sickLeaveNote ? `\n**Notiz:** ${params.sickLeaveNote}` : ""}

Bitte organisieren Sie ggf. eine Vertretung.

---
Diese Benachrichtigung wurde automatisch vom Company Wiki System gesendet.
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: content,
    });
    console.log(`[Email] Sick leave notification sent for ${params.employeeName}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send sick leave notification:", error);
    return false;
  }
}


/**
 * Send welcome email to new users after registration
 */
export async function sendWelcomeEmail(params: {
  recipientEmail: string;
  userName: string;
}): Promise<boolean> {
  const subject = `Willkommen im Company Wiki, ${params.userName}!`;
  const content = `
Hallo ${params.userName},

herzlich willkommen im Company Wiki! Dein Konto wurde erfolgreich erstellt.

Hier findest du alle wichtigen Informationen, Prozesse und Anleitungen für deinen Arbeitsalltag:

- Wiki-Artikel: Durchsuche unsere Wissensdatenbank
- SOPs: Standardprozesse und Arbeitsanweisungen
- AI-Assistent: Stelle Fragen und erhalte schnelle Antworten
- Schichtplan: Sieh deine Arbeitszeiten ein
- Urlaub: Beantrage Urlaub und sieh dein Kontingent

Bei Fragen wende dich an das Admin-Team.

Viele Grüße,
Das Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.recipientEmail}\n\n${content}`,
    });
    console.log(`[Email] Welcome email sent to ${params.recipientEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send welcome email:", error);
    return false;
  }
}


/**
 * Send reminder email for expiring invitations
 */
export async function sendInvitationReminderEmail(params: {
  recipientEmail: string;
  inviterName: string;
  daysUntilExpiry: number;
  inviteLink: string;
}): Promise<boolean> {
  const subject = `Erinnerung: Deine Einladung zum Company Wiki läuft bald ab`;
  const content = `
Hallo,

${params.inviterName} hat dich zum Company Wiki eingeladen, aber du hast die Einladung noch nicht angenommen.

Die Einladung läuft in ${params.daysUntilExpiry} Tag${params.daysUntilExpiry > 1 ? "en" : ""} ab!

Klicke auf den folgenden Link, um dich anzumelden:
${params.inviteLink}

Nach der Anmeldung mit deinem Google-Konto erhältst du automatisch Zugang.

Wichtig: Öffne den Link in einem privaten/Inkognito-Browserfenster, falls du bereits mit einem anderen Google-Konto angemeldet bist.

Bei Fragen wende dich an das Admin-Team.

Viele Grüße,
Das Company Wiki Team
  `.trim();

  try {
    await notifyOwner({
      title: subject,
      content: `An: ${params.recipientEmail}\n\n${content}`,
    });
    console.log(`[Email] Invitation reminder sent to ${params.recipientEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send invitation reminder email:", error);
    return false;
  }
}
