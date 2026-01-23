import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
async function main() {
  console.log('🌱 Starting database seeding...');

  const adminPassword = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@badhonsworld.com' },
    update: {},
    create: {
      email: 'admin@badhonsworld.com',
      name: 'Super Admin',
      password: adminPassword,
      role: Role.SUPER_ADMIN,
      phone: '01700000000',
      isEmailVerified: true,
    },
  });
  console.log(`👤 Admin created: ${admin.email}`);

  const gadgetCategory = await prisma.category.upsert({
    where: { slug: 'gadgets-accessories' },
    update: {},
    create: {
      name: 'Gadgets & Accessories',
      slug: 'gadgets-accessories',
      image: 'https://placehold.co/200x200',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'home-decor' },
    update: {},
    create: {
      name: 'Home Decor',
      slug: 'home-decor',
      image: 'https://placehold.co/200x200',
    },
  });

  console.log('📂 Categories created');

  // ৩. ব্র্যান্ড তৈরি করা
  const appleBrand = await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: {},
    create: {
      name: 'Apple',
      slug: 'apple',
      logo: 'https://placehold.co/100x100',
    },
  });

  console.log('🏷️ Brand created');

  const product1 = await prisma.product.upsert({
    where: { sku: 'T900-ULTRA' },
    update: {},
    create: {
      name: 'T900 Ultra Smart Watch',
      slug: 't900-ultra-smart-watch',
      description: 'Best smart watch with infinite display...',
      shortDesc: 'Ultra 2 Smart Watch',
      price: 1200,
      discountPrice: 999,
      stock: 50,
      sku: 'T900-ULTRA',
      images: ['https://placehold.co/600x600'],
      categoryId: gadgetCategory.id,
      brandId: appleBrand.id,
      isFeatured: true,
      orderCount: 0,
      rating: 0,
      tags: ['smartwatch', 'gadget', 'watch'],

      variants: {
        create: [
          {
            name: 'Orange',
            sku: 'T900-ORG',
            stock: 20,
            attributes: { color: 'Orange' },
          },
          {
            name: 'Black',
            sku: 'T900-BLK',
            stock: 30,
            attributes: { color: 'Black' },
          },
        ],
      },
    },
  });

  console.log(`📦 Product created: ${product1.name}`);

  await prisma.shippingZone.createMany({
    data: [
      { name: 'Inside Dhaka', charge: 60, deliveryTime: '24-48 Hours' },
      { name: 'Outside Dhaka', charge: 120, deliveryTime: '3-5 Days' },
    ],
    skipDuplicates: true,
  });
  console.log('🚚 Shipping zones created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
