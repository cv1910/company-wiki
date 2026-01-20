/**
 * Scheduler for automated tasks like leave carry-over and booking reminders
 * Uses node-cron for scheduling
 */

import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sendBookingReminderToGuest, sendBookingReminderToHost } from "./email";

// Track if scheduler is initialized
let isInitialized = false;

// Store scheduled jobs
const scheduledJobs: { name: string; interval: NodeJS.Timeout }[] = [];

/**
 * Check if it's January 1st and perform automatic leave carry-over
 */
async function checkAndPerformLeaveCarryOver() {
  const now = new Date();
  const isJanuary1st = now.getMonth() === 0 && now.getDate() === 1;
  
  if (!isJanuary1st) {
    return;
  }
  
  console.log("[Scheduler] January 1st detected - checking for automatic leave carry-over");
  
  try {
    // Get settings to check if auto carry-over is enabled
    const settings = await db.getLeaveCarryOverSettings();
    
    if (!settings.autoCarryOver) {
      console.log("[Scheduler] Automatic leave carry-over is disabled");
      return;
    }
    
    const previousYear = now.getFullYear() - 1;
    const results = await db.carryOverLeaveBalances(previousYear, settings.maxCarryOverDays);
    
    console.log(`[Scheduler] Leave carry-over completed: ${results.length} users affected`);
    
    // Notify owner about the automatic carry-over
    if (results.length > 0) {
      await notifyOwner({
        title: "Automatischer Urlaubsübertrag durchgeführt",
        content: `Der automatische Urlaubsübertrag von ${previousYear} nach ${now.getFullYear()} wurde erfolgreich durchgeführt.\n\n${results.length} Mitarbeiter haben Resturlaub übertragen bekommen (max. ${settings.maxCarryOverDays} Tage pro Person).`,
      });
    }
    
    // Log the action
    await db.createAuditLogEntry({
      action: "leave_carry_over_auto",
      resourceType: "leave_balance",
      newValue: `Automatischer Übertrag von ${previousYear} nach ${now.getFullYear()} für ${results.length} Mitarbeiter`,
    });
  } catch (error) {
    console.error("[Scheduler] Error during automatic leave carry-over:", error);
  }
}

/**
 * Initialize the scheduler with all automated tasks
 */
export function initializeScheduler() {
  if (isInitialized) {
    console.log("[Scheduler] Already initialized");
    return;
  }
  
  console.log("[Scheduler] Initializing automated tasks...");
  
  // Check for leave carry-over every day at midnight
  // In production, this would run at 00:01 on January 1st
  const dailyCheck = setInterval(async () => {
    await checkAndPerformLeaveCarryOver();
  }, 24 * 60 * 60 * 1000); // Every 24 hours
  
  scheduledJobs.push({ name: "leave-carry-over-check", interval: dailyCheck });
  
  // Also run immediately on startup to catch if server was down on Jan 1st
  // But only if we're within the first week of January
  const now = new Date();
  if (now.getMonth() === 0 && now.getDate() <= 7) {
    console.log("[Scheduler] First week of January - checking for missed carry-over");
    checkAndPerformLeaveCarryOver().catch(console.error);
  }
  
  // Check for booking reminders every 5 minutes
  const reminderCheck = setInterval(async () => {
    await checkAndSendBookingReminders();
  }, 5 * 60 * 1000); // Every 5 minutes
  
  scheduledJobs.push({ name: "booking-reminder-check", interval: reminderCheck });
  
  // Run reminder check immediately on startup
  checkAndSendBookingReminders().catch(console.error);
  
  isInitialized = true;
  console.log("[Scheduler] Scheduler initialized with", scheduledJobs.length, "jobs");
}

/**
 * Stop all scheduled jobs (for testing or shutdown)
 */
export function stopScheduler() {
  for (const job of scheduledJobs) {
    clearInterval(job.interval);
  }
  scheduledJobs.length = 0;
  isInitialized = false;
  console.log("[Scheduler] All jobs stopped");
}

/**
 * Manually trigger the leave carry-over check (for testing)
 */
export async function triggerLeaveCarryOverCheck() {
  await checkAndPerformLeaveCarryOver();
}

/**
 * Check for upcoming bookings and send reminders
 */
async function checkAndSendBookingReminders() {
  console.log("[Scheduler] Checking for booking reminders...");
  
  try {
    const bookings = await db.getBookingsNeedingReminders();
    const now = new Date();
    
    for (const { booking, eventType } of bookings) {
      // Parse reminder settings from event type
      const reminderMinutes = eventType.reminderMinutes?.split(",").map(Number).filter(n => !isNaN(n)) || [1440, 60];
      const sendGuestReminder = eventType.sendGuestReminder !== false;
      const sendHostReminder = eventType.sendHostReminder !== false;
      
      // Parse already sent reminders
      const sentReminders = booking.remindersSent?.split(",").map(Number).filter(n => !isNaN(n)) || [];
      
      // Calculate minutes until event
      const minutesUntilEvent = Math.floor((new Date(booking.startTime).getTime() - now.getTime()) / (60 * 1000));
      
      // Check each reminder threshold
      const newSentReminders = [...sentReminders];
      
      for (const reminderMinute of reminderMinutes) {
        // Skip if already sent
        if (sentReminders.includes(reminderMinute)) {
          continue;
        }
        
        // Send reminder if we're within the threshold (with 10 minute buffer)
        if (minutesUntilEvent <= reminderMinute && minutesUntilEvent > reminderMinute - 10) {
          console.log(`[Scheduler] Sending ${reminderMinute}min reminder for booking ${booking.id}`);
          
          // Get host info
          const host = await db.getUserById(eventType.hostId);
          
          // Send to guest
          if (sendGuestReminder) {
            await sendBookingReminderToGuest({
              guestEmail: booking.guestEmail,
              guestName: booking.guestName,
              eventTypeName: eventType.name,
              hostName: host?.name || "Host",
              startTime: new Date(booking.startTime),
              endTime: new Date(booking.endTime),
              locationType: eventType.locationType || "google_meet",
              locationDetails: eventType.locationDetails,
              meetingLink: booking.meetingLink,
              minutesUntilEvent: reminderMinute,
            });
          }
          
          // Send to host
          if (sendHostReminder && host?.email) {
            await sendBookingReminderToHost({
              hostEmail: host.email,
              hostName: host.name || "Host",
              guestName: booking.guestName,
              guestEmail: booking.guestEmail,
              eventTypeName: eventType.name,
              startTime: new Date(booking.startTime),
              endTime: new Date(booking.endTime),
              meetingLink: booking.meetingLink,
              minutesUntilEvent: reminderMinute,
            });
          }
          
          newSentReminders.push(reminderMinute);
        }
      }
      
      // Update sent reminders if any were sent
      if (newSentReminders.length > sentReminders.length) {
        await db.updateBookingRemindersSent(booking.id, newSentReminders.join(","));
      }
    }
    
    console.log(`[Scheduler] Reminder check completed, processed ${bookings.length} bookings`);
  } catch (error) {
    console.error("[Scheduler] Error checking booking reminders:", error);
  }
}

/**
 * Manually trigger the booking reminder check (for testing)
 */
export async function triggerBookingReminderCheck() {
  await checkAndSendBookingReminders();
}
