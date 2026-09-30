import ical from 'ical-generator';
import nodemailer from 'nodemailer';

interface ICSParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  organizerEmail: string;
  attendeeEmails: string[];
  location: string;
  uid?: string;
}

export const generateICSFile = ({
  title,
  description,
  startTime,
  endTime,
  organizerEmail,
  location,
  uid
}: ICSParams) => {
  const calendar = ical({ name: 'School Booking System' });
  
  calendar.createEvent({
    start: startTime,
    end: endTime,
    summary: title,
    description: description,
    location: location,
    organizer: { name: 'Organizer', email: organizerEmail },
    id: uid,
  });

  return calendar.toString();
};

interface SendICSInviteParams {
  booking: {
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    id: string;
  };
  organizerName: string;
  organizerEmail: string;
  roomName: string;
  campusName: string;
}

export const sendICSInvite = async ({
  booking,
  organizerName,
  organizerEmail,
  roomName,
  campusName
}: SendICSInviteParams) => {
  try {
    const icsContent = generateICSFile({
      title: booking.title,
      description: booking.description || '',
      startTime: booking.startTime,
      endTime: booking.endTime,
      organizerEmail,
      attendeeEmails: booking.attendees,
      location: `${roomName} - ${campusName}`,
      uid: booking.id
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"School Booking System" <noreply@school.edu>',
      to: booking.attendees.join(', '),
      subject: `[Invite] ${booking.title} - ${booking.startTime.toLocaleDateString()}`,
      text: `You have been invited to ${booking.title}.\n\nLocation: ${roomName} (${campusName})\nTime: ${booking.startTime.toLocaleString()} - ${booking.endTime.toLocaleString()}\n\n${booking.description || ''}`,
      icalEvent: {
        filename: 'invite.ics',
        method: 'request',
        content: icsContent
      }
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending ICS invite:", error);
    return { success: false, error: (error as Error).message };
  }
};
