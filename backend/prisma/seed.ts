import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_ADMIN_EMAIL = 'admin@ecommerce.com';
const DEFAULT_ADMIN_NAME = 'System Admin';
const LOCAL_ADMIN_PASSWORD_HASH =
  '$2b$12$X8rFEi2HOdDt90rYjdzVa.NX5PhzFf.zXS.rtoTC2X4TTqV4ld.HK';

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

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    console.log('Skip admin seeding in production environment.');
    return;
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (existingAdmin) {
    const admin = await prisma.user.update({
      where: { email: DEFAULT_ADMIN_EMAIL },
      data: {
        password: LOCAL_ADMIN_PASSWORD_HASH,
        roles: [Role.ROLE_ADMIN],
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      },
    });

    console.log('Local admin already exists:', admin.email);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
      password: LOCAL_ADMIN_PASSWORD_HASH,
      roles: [Role.ROLE_ADMIN],
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  console.log('Local admin seeded:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
