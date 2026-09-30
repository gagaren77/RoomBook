import { User, Room, Campus, Booking } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export type BookingWithRelations = Booking & {
  room: Room & { campus: Campus };
  createdBy: User;
};

export type RoomWithCampus = Room & {
  campus: Campus;
};

export type CampusWithRooms = Campus & {
  rooms: Room[];
};
