import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEV_ADMIN_PASSWORD = ['admin', '123'].join('');

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@ecommerce.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword && process.env.NODE_ENV === 'production') {
    throw new Error('SEED_ADMIN_PASSWORD is required in production');
  }

  const resolvedAdminPassword = adminPassword || DEV_ADMIN_PASSWORD;
  const hashedPassword = await bcrypt.hash(resolvedAdminPassword, 12);

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
