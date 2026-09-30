import ical, { ICalCalendarMethod } from 'ical-generator';
import nodemailer from 'nodemailer';

export interface BookingForInvite {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  room: { name: string; campus: { name: string } };
  createdBy: { name: string | null; email: string };
}

export type InviteMethod = 'REQUEST' | 'CANCEL';

interface ICSParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  organizerName?: string;
  organizerEmail: string;
  attendeeEmails: string[];
  location: string;
  uid?: string;
  method?: InviteMethod;
}

export const generateICSFile = ({
  title,
  description,
  startTime,
  endTime,
  organizerName,
  organizerEmail,
  attendeeEmails,
  location,
  uid,
  method = 'REQUEST'
}: ICSParams) => {
  const calendar = ical({
    name: 'School Booking System',
    method: method === 'CANCEL' ? ICalCalendarMethod.CANCEL : ICalCalendarMethod.REQUEST
  });

  calendar.createEvent({
    start: startTime,
    end: endTime,
    summary: title,
    description,
    location,
    organizer: { name: organizerName || 'Organizer', email: organizerEmail },
    attendees: attendeeEmails.map((email) => ({ email })),
    id: uid
  });

  return calendar.toString();
};

export const sendICSInvite = async (
  booking: BookingForInvite,
  method: InviteMethod = 'REQUEST'
) => {
  try {
    if (!booking.attendees || booking.attendees.length === 0) {
      return { success: true, skipped: true };
    }

    const roomName = booking.room.name;
    const campusName = booking.room.campus.name;

    const icsContent = generateICSFile({
      title: booking.title,
      description: booking.description || '',
      startTime: booking.startTime,
      endTime: booking.endTime,
      organizerName: booking.createdBy.name || undefined,
      organizerEmail: booking.createdBy.email,
      attendeeEmails: booking.attendees,
      location: `${roomName} - ${campusName}`,
      uid: booking.id,
      method
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const label = method === 'CANCEL' ? 'Cancelled' : 'Invite';

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"School Booking System" <noreply@school.edu>',
      to: booking.attendees.join(', '),
      subject: `[${label}] ${booking.title} - ${booking.startTime.toLocaleDateString()}`,
      text: `${method === 'CANCEL' ? 'This event was cancelled: ' : 'You have been invited to '}${booking.title}.\n\nLocation: ${roomName} (${campusName})\nTime: ${booking.startTime.toLocaleString()} - ${booking.endTime.toLocaleString()}\n\n${booking.description || ''}`,
      icalEvent: {
        filename: 'invite.ics',
        method: method === 'CANCEL' ? 'cancel' : 'request',
        content: icsContent
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending ICS invite:', error);
    return { success: false, error: (error as Error).message };
  }
};
