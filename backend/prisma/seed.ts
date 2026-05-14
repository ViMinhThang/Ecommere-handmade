import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEFAULT_ADMIN_EMAIL = 'admin@ecommerce.com';
const ADMIN_SEED_BCRYPT_ROUNDS = 12;

async function main() {
  const categories = [
    {
      name: 'Sinh nhật',
      slug: 'birthday',
      description: 'Niềm vui thủ công cho một tuổi mới.',
    },
    {
      name: 'Đám cưới',
      slug: 'wedding',
      description: 'Báu vật vượt thời gian cho sự khởi đầu vĩnh cửu.',
    },
    {
      name: 'Kỷ niệm',
      slug: 'anniversary',
      description: 'Tôn vinh lịch sử chung và những giấc mơ tương lai.',
    },
    {
      name: 'Cảm ơn',
      slug: 'thank-you',
      description: 'Cách tinh tế để nói những điều lời nói không thể.',
    },
    {
      name: 'Chia buồn',
      slug: 'sympathy',
      description: 'Sự ấm áp của cái chạm tay thủ công trong lúc cần thiết.',
    },
    {
      name: 'Tốt nghiệp',
      slug: 'graduation',
      description: 'Vinh danh những ngưỡng cửa và tương lai tươi sáng.',
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }

  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  const seedAdminEmail =
    process.env.SEED_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    console.log('Skip admin seeding in production environment.');
    return;
  }

  if (!seedAdminPassword) {
    console.warn(
      'Skip admin seeding because SEED_ADMIN_PASSWORD is not set in environment.',
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(
    seedAdminPassword,
    ADMIN_SEED_BCRYPT_ROUNDS,
  );

  const admin = await prisma.user.upsert({
    where: { email: seedAdminEmail },
    update: {
      password: hashedPassword,
      roles: [Role.ROLE_ADMIN],
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
    create: {
      email: seedAdminEmail,
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
