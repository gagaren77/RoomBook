import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Admin User
  const adminEmail = 'admin@school.edu';
  const hashedPassword = await bcrypt.hash('Admin1234!', 10);
  
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // 2. Create Campuses and Rooms
  const campusesData = [
    { name: 'Main Campus', address: 'Chicago, IL, 60601', city: 'Chicago', state: 'IL', zipCode: '60601' },
    { name: 'North Campus', address: 'Chicago, IL, 60614', city: 'Chicago', state: 'IL', zipCode: '60614' },
    { name: 'South Campus', address: 'Chicago, IL, 60637', city: 'Chicago', state: 'IL', zipCode: '60637' },
    { name: 'West Campus', address: 'Oak Park, IL, 60302', city: 'Oak Park', state: 'IL', zipCode: '60302' },
    { name: 'East Campus', address: 'Evanston, IL, 60201', city: 'Evanston', state: 'IL', zipCode: '60201' },
    { name: 'Downtown Learning Center', address: 'Chicago, IL, 60603', city: 'Chicago', state: 'IL', zipCode: '60603' },
  ];

  for (const campusData of campusesData) {
    const campus = await prisma.campus.create({
      data: campusData,
    });

    // Create 3 rooms per campus
    await prisma.room.createMany({
      data: [
        {
          name: 'Classroom A',
          capacity: 30,
          description: 'Standard classroom',
          amenities: ['Projector', 'Whiteboard', 'Computers'],
          campusId: campus.id,
        },
        {
          name: 'Lab 1',
          capacity: 20,
          description: 'Computer Lab',
          amenities: ['Computers', 'Smartboard'],
          campusId: campus.id,
        },
        {
          name: 'Conference Room',
          capacity: 10,
          description: 'Small meeting room',
          amenities: ['TV', 'Whiteboard', 'Video Conferencing'],
          campusId: campus.id,
        },
      ],
    });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
