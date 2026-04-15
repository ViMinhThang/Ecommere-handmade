import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@ecommerce.com';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      roles: [Role.ROLE_ADMIN],
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
    create: {
      email: adminEmail,
      name: 'System Admin',
      password: hashedPassword,
      roles: [Role.ROLE_ADMIN],
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  console.log('Seed completed successfully:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
