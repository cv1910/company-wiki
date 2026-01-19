/**
 * Scheduler for automated tasks like leave carry-over
 * Uses node-cron for scheduling
 */

import * as db from "./db";
import { notifyOwner } from "./_core/notification";

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
