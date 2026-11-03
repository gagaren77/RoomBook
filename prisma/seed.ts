import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensureCampuses } from './campuses';

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

  // 2. Campuses (https://mccollege.edu/locations/), keyed by the CampusID used in schedule imports.
  //    Upserted so the seed is safe to run again. Rooms are created by the schedule import.
  await ensureCampuses(prisma);

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
