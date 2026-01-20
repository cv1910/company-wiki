/**
 * Google Calendar API Integration Service
 * Handles OAuth flow, token management, and calendar synchronization
 */

import { ENV } from "./_core/env";
import {
  getGoogleCalendarConnection,
  updateGoogleCalendarTokens,
  updateGoogleCalendarSyncStatus,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventsByDateRange,
  getSyncMapByLocalEventId,
  getSyncMapByGoogleEventId,
  createSyncMapping,
  updateSyncMapping,
  deleteSyncMapping,
  getUserSyncMappings,
} from "./db";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";

// Google Calendar API base URL
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Scopes needed for calendar access
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Generate the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();
  
  // Get user email
  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    }
  );

  const userInfo = await userInfoResponse.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    email: userInfo.email,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(userId: number): Promise<string> {
  const connection = await getGoogleCalendarConnection(userId);
  if (!connection) {
    throw new Error("No Google Calendar connection found");
  }

  // Check if token is expired or about to expire (5 min buffer)
  const now = new Date();
  const expiresAt = new Date(connection.tokenExpiresAt);
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    // Refresh the token
    const { accessToken, expiresAt: newExpiresAt } = await refreshAccessToken(
      connection.refreshToken
    );

    await updateGoogleCalendarTokens(
      userId,
      accessToken,
      connection.refreshToken,
      newExpiresAt
    );

    return accessToken;
  }

  return connection.accessToken;
}

/**
 * Make authenticated request to Google Calendar API
 */
async function googleCalendarRequest(
  userId: number,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(`${GOOGLE_CALENDAR_API}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return response;
}

/**
 * Convert local event to Google Calendar event format
 */
function localEventToGoogleEvent(event: {
  title: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location?: string | null;
  addGoogleMeet?: boolean;
}): object {
  const googleEvent: Record<string, unknown> = {
    summary: event.title,
    description: event.description || "",
    location: event.location || "",
  };

  if (event.isAllDay) {
    // All-day events use date format
    googleEvent.start = {
      date: event.startDate.toISOString().split("T")[0],
    };
    googleEvent.end = {
      date: event.endDate.toISOString().split("T")[0],
    };
  } else {
    // Timed events use dateTime format
    googleEvent.start = {
      dateTime: event.startDate.toISOString(),
      timeZone: "Europe/Berlin",
    };
    googleEvent.end = {
      dateTime: event.endDate.toISOString(),
      timeZone: "Europe/Berlin",
    };
  }

  // Add Google Meet conference if requested
  if (event.addGoogleMeet) {
    googleEvent.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  return googleEvent;
}

/**
 * Convert Google Calendar event to local event format
 */
function googleEventToLocalEvent(googleEvent: {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}): {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location: string | null;
  googleEventId: string;
} {
  const isAllDay = !!googleEvent.start?.date;
  
  let startDate: Date;
  let endDate: Date;

  if (isAllDay) {
    startDate = new Date(googleEvent.start!.date!);
    endDate = new Date(googleEvent.end!.date!);
    // Google's end date for all-day events is exclusive, adjust it
    endDate.setDate(endDate.getDate() - 1);
  } else {
    startDate = new Date(googleEvent.start!.dateTime!);
    endDate = new Date(googleEvent.end!.dateTime!);
  }

  return {
    title: googleEvent.summary || "Untitled Event",
    description: googleEvent.description || null,
    startDate,
    endDate,
    isAllDay,
    location: googleEvent.location || null,
    googleEventId: googleEvent.id,
  };
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  userId: number,
  calendarId: string = "primary",
  timeMin?: Date,
  timeMax?: Date,
  syncToken?: string
): Promise<{
  events: Array<ReturnType<typeof googleEventToLocalEvent>>;
  nextSyncToken?: string;
  nextPageToken?: string;
}> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
  });

  if (syncToken) {
    params.set("syncToken", syncToken);
  } else {
    if (timeMin) {
      params.set("timeMin", timeMin.toISOString());
    }
    if (timeMax) {
      params.set("timeMax", timeMax.toISOString());
    }
  }

  const response = await googleCalendarRequest(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Google Calendar events: ${error}`);
  }

  const data = await response.json();

  const events = (data.items || [])
    .filter((item: { status?: string }) => item.status !== "cancelled")
    .map(googleEventToLocalEvent);

  return {
    events,
    nextSyncToken: data.nextSyncToken,
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Create event in Google Calendar
 * @returns Object with googleEventId and optional meetLink
 */
export async function createGoogleCalendarEvent(
  userId: number,
  event: Parameters<typeof localEventToGoogleEvent>[0],
  calendarId: string = "primary"
): Promise<{ googleEventId: string; meetLink?: string }> {
  const googleEvent = localEventToGoogleEvent(event);

  // Add conferenceDataVersion parameter if we're requesting a Google Meet
  const conferenceParam = event.addGoogleMeet ? "?conferenceDataVersion=1" : "";

  const response = await googleCalendarRequest(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events${conferenceParam}`,
    {
      method: "POST",
      body: JSON.stringify(googleEvent),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Google Calendar event: ${error}`);
  }

  const data = await response.json();
  
  // Extract Google Meet link from conference data
  let meetLink: string | undefined;
  if (data.conferenceData?.entryPoints) {
    const videoEntry = data.conferenceData.entryPoints.find(
      (ep: { entryPointType: string }) => ep.entryPointType === "video"
    );
    if (videoEntry) {
      meetLink = videoEntry.uri;
    }
  }

  return { googleEventId: data.id, meetLink };
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  userId: number,
  googleEventId: string,
  event: Parameters<typeof localEventToGoogleEvent>[0],
  calendarId: string = "primary"
): Promise<void> {
  const googleEvent = localEventToGoogleEvent(event);

  const response = await googleCalendarRequest(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "PUT",
      body: JSON.stringify(googleEvent),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Google Calendar event: ${error}`);
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  userId: number,
  googleEventId: string,
  calendarId: string = "primary"
): Promise<void> {
  const response = await googleCalendarRequest(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete Google Calendar event: ${error}`);
  }
}

/**
 * Sync local events to Google Calendar
 */
export async function syncLocalToGoogle(userId: number): Promise<{
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}> {
  const connection = await getGoogleCalendarConnection(userId);
  if (!connection || !connection.syncEnabled) {
    return { created: 0, updated: 0, deleted: 0, errors: [] };
  }

  const result = { created: 0, updated: 0, deleted: 0, errors: [] as string[] };
  const calendarId = connection.calendarId || "primary";

  try {
    // Get local events
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oneYearAhead = new Date(now);
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    const localEvents = await getCalendarEventsByDateRange(
      userId,
      threeMonthsAgo,
      oneYearAhead
    );

    // Get existing sync mappings
    const syncMappings = await getUserSyncMappings(userId);
    const mappingByLocalId = new Map(
      syncMappings
        .filter((m) => m.localEventId)
        .map((m) => [m.localEventId!, m])
    );

    // Sync each local event
    for (const event of localEvents) {
      try {
        const existingMapping = mappingByLocalId.get(event.id);

        if (existingMapping) {
          // Update existing Google event
          await updateGoogleCalendarEvent(
            userId,
            existingMapping.googleEventId,
            {
              title: event.title,
              description: event.description,
              startDate: new Date(event.startDate),
              endDate: new Date(event.endDate),
              isAllDay: event.isAllDay,
              location: event.location,
            },
            calendarId
          );
          result.updated++;
        } else {
          // Create new Google event
          const createResult = await createGoogleCalendarEvent(
            userId,
            {
              title: event.title,
              description: event.description,
              startDate: new Date(event.startDate),
              endDate: new Date(event.endDate),
              isAllDay: event.isAllDay,
              location: event.location,
            },
            calendarId
          );

          // Create sync mapping
          await createSyncMapping({
            userId,
            localEventId: event.id,
            googleEventId: createResult.googleEventId,
            googleCalendarId: calendarId,
            syncDirection: "export",
          });
          result.created++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to sync event "${event.title}": ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    await updateGoogleCalendarSyncStatus(userId, "success");
  } catch (error) {
    await updateGoogleCalendarSyncStatus(
      userId,
      "error",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }

  return result;
}

/**
 * Sync Google Calendar events to local
 */
export async function syncGoogleToLocal(userId: number): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const connection = await getGoogleCalendarConnection(userId);
  if (!connection || !connection.syncEnabled) {
    return { created: 0, updated: 0, skipped: 0, errors: [] };
  }

  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
  const calendarId = connection.calendarId || "primary";

  try {
    // Fetch Google Calendar events
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oneYearAhead = new Date(now);
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    const { events, nextSyncToken } = await fetchGoogleCalendarEvents(
      userId,
      calendarId,
      threeMonthsAgo,
      oneYearAhead,
      connection.syncToken || undefined
    );

    // Process each Google event
    for (const event of events) {
      try {
        const existingMapping = await getSyncMapByGoogleEventId(
          userId,
          event.googleEventId
        );

        if (existingMapping && existingMapping.localEventId) {
          // Update existing local event
          await updateCalendarEvent(existingMapping.localEventId, userId, {
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            isAllDay: event.isAllDay,
            location: event.location,
          });
          await updateSyncMapping(existingMapping.id, {
            lastSyncedAt: new Date(),
          });
          result.updated++;
        } else if (!existingMapping) {
          // Create new local event
          const localEvent = await createCalendarEvent({
            userId,
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            isAllDay: event.isAllDay,
            location: event.location,
            color: "blue",
            eventType: "personal",
          });

          // Create sync mapping
          if (localEvent) {
            await createSyncMapping({
              userId,
              localEventId: localEvent.id,
              googleEventId: event.googleEventId,
              googleCalendarId: calendarId,
              syncDirection: "import",
            });
          }
          result.created++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to import event "${event.title}": ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Update sync token for incremental sync
    if (nextSyncToken) {
      await updateGoogleCalendarSyncStatus(
        userId,
        "success",
        undefined,
        nextSyncToken
      );
    } else {
      await updateGoogleCalendarSyncStatus(userId, "success");
    }
  } catch (error) {
    await updateGoogleCalendarSyncStatus(
      userId,
      "error",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }

  return result;
}

/**
 * Full two-way sync
 */
export async function fullSync(userId: number): Promise<{
  toGoogle: Awaited<ReturnType<typeof syncLocalToGoogle>>;
  fromGoogle: Awaited<ReturnType<typeof syncGoogleToLocal>>;
}> {
  // First sync from Google to local (to get new events)
  const fromGoogle = await syncGoogleToLocal(userId);
  
  // Then sync from local to Google (to push local changes)
  const toGoogle = await syncLocalToGoogle(userId);

  return { toGoogle, fromGoogle };
}

/**
 * Check if Google Calendar integration is configured
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}
