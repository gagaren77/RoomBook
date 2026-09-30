import { Client } from "@microsoft/microsoft-graph-client";

interface OutlookInviteParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  organizerEmail: string;
  attendeeEmails: string[];
  location: string;
}

const getGraphClient = async () => {
  if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
    return null;
  }

  // Placeholder for proper MSAL auth provider initialization
  const client = Client.init({
    authProvider: (done) => {
      done(null, "MOCK_TOKEN"); 
    }
  });
  
  return client;
};

export const sendOutlookInvite = async ({
  title,
  description,
  startTime,
  endTime,
  organizerEmail,
  attendeeEmails,
  location
}: OutlookInviteParams) => {
  try {
    const client = await getGraphClient();
    if (!client) {
      return { success: false, error: 'Graph API not configured' };
    }

    const event = {
      subject: title,
      body: {
        contentType: "HTML",
        content: description
      },
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "UTC"
      },
      location: {
        displayName: location
      },
      attendees: attendeeEmails.map(email => ({
        emailAddress: { address: email },
        type: "required"
      }))
    };

    const res = await client.api(`/users/${organizerEmail}/events`).post(event);
    return { success: true, eventId: res.id };
  } catch (error) {
    console.error("Error sending Outlook invite:", error);
    return { success: false, error: (error as Error).message };
  }
};

export const cancelOutlookEvent = async (eventId: string, organizerEmail: string) => {
  try {
    const client = await getGraphClient();
    if (!client) {
      return { success: false, error: 'Graph API not configured' };
    }

    await client.api(`/users/${organizerEmail}/events/${eventId}`).delete();
    return { success: true };
  } catch (error) {
    console.error("Error cancelling Outlook event:", error);
    return { success: false, error: (error as Error).message };
  }
};
