import { PrismaClient, DiscountType, PaymentMethod, Role } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@storehike.ng" },
    update: {},
    create: {
      email: "demo@storehike.ng",
      name: "Demo Seller",
      password: passwordHash,
    },
  });

  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@storehike.ng" },
    update: {},
    create: {
      email: "admin@storehike.ng",
      name: "Admin",
      password: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const store = await prisma.store.upsert({
    where: { slug: "chunkz" },
    update: {},
    create: {
      userId: user.id,
      name: "Chunkz",
      slug: "chunkz",
      description: "Streetwear for the culture. Hoodies, tees, and sneakers.",
      phone: "+2348012345678",
      whatsappNumber: "+2348012345678",
      email: "hello@chunkz.ng",
      address: "12 Allen Avenue, Ikeja, Lagos",
      currency: "NGN",
      isPublished: true,
      bankName: "GTBank",
      bankAccountNumber: "0123456789",
      bankAccountName: "Chunkz Store",
      theme: { primaryColor: "#111827", font: "Inter" },
    },
  });

  const [hoodies, tees, sneakers] = await Promise.all([
    prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: "hoodies" } },
      update: {},
      create: { storeId: store.id, name: "Hoodies", slug: "hoodies", sortOrder: 0 },
    }),
    prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: "t-shirts" } },
      update: {},
      create: { storeId: store.id, name: "T-Shirts", slug: "t-shirts", sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: "sneakers" } },
      update: {},
      create: { storeId: store.id, name: "Sneakers", slug: "sneakers", sortOrder: 2 },
    }),
  ]);

  const sizeColorVariants = (sizes: string[], colors: string[], basePrice: number) => {
    const combos: { name: string; options: { size: string; colour: string }; price: number; sku: string; stockQuantity: number }[] = [];
    for (const size of sizes) {
      for (const colour of colors) {
        combos.push({
          name: `${size} / ${colour}`,
          options: { size, colour },
          price: basePrice,
          sku: `${size}-${colour}`.toUpperCase().replace(/\s+/g, "-"),
          stockQuantity: 15,
        });
      }
    }
    return combos;
  };

  type SeedProduct = {
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    costPrice: number;
    sku: string;
    isFeatured?: boolean;
    images: string[];
    variants?: { name: string; options: Record<string, string>; price: number; sku: string; stockQuantity: number }[];
    stockQuantity?: number;
  };

  const products: SeedProduct[] = [
    {
      categoryId: hoodies.id,
      name: "Oversized Fleece Hoodie",
      slug: "oversized-fleece-hoodie",
      description: "Heavyweight 400gsm fleece, boxy fit, ribbed cuffs.",
      price: 25000,
      compareAtPrice: 30000,
      costPrice: 12000,
      sku: "HD-001",
      isFeatured: true,
      images: [],
      variants: sizeColorVariants(["S", "M", "L", "XL"], ["Black", "Grey"], 25000),
    },
    {
      categoryId: hoodies.id,
      name: "Zip-Up Tech Hoodie",
      slug: "zip-up-tech-hoodie",
      description: "Water-resistant shell, fleece lining, full zip.",
      price: 32000,
      costPrice: 16000,
      sku: "HD-002",
      images: [],
      variants: sizeColorVariants(["M", "L", "XL"], ["Black", "Navy"], 32000),
    },
    {
      categoryId: hoodies.id,
      name: "Cropped Hoodie",
      slug: "cropped-hoodie",
      description: "Cropped fit, drawstring hood, soft cotton blend.",
      price: 21000,
      costPrice: 10000,
      sku: "HD-003",
      images: [],
      variants: sizeColorVariants(["S", "M", "L"], ["Beige", "Black"], 21000),
    },
    {
      categoryId: hoodies.id,
      name: "Graphic Print Hoodie",
      slug: "graphic-print-hoodie",
      description: "Front and back print, dropped shoulder.",
      price: 27500,
      costPrice: 13000,
      sku: "HD-004",
      images: [],
      stockQuantity: 40,
    },
    {
      categoryId: tees.id,
      name: "Essential Cotton Tee",
      slug: "essential-cotton-tee",
      description: "220gsm combed cotton, regular fit.",
      price: 9500,
      costPrice: 4000,
      sku: "TS-001",
      isFeatured: true,
      images: [],
      variants: sizeColorVariants(["S", "M", "L", "XL"], ["White", "Black", "Grey"], 9500),
    },
    {
      categoryId: tees.id,
      name: "Oversized Graphic Tee",
      slug: "oversized-graphic-tee",
      description: "Oversized fit, screen-printed graphic.",
      price: 12000,
      compareAtPrice: 15000,
      costPrice: 5000,
      sku: "TS-002",
      images: [],
      variants: sizeColorVariants(["M", "L", "XL"], ["Black", "White"], 12000),
    },
    {
      categoryId: tees.id,
      name: "Long Sleeve Tee",
      slug: "long-sleeve-tee",
      description: "Ribbed crew neck, midweight cotton.",
      price: 11000,
      costPrice: 4800,
      sku: "TS-003",
      images: [],
      stockQuantity: 25,
    },
    {
      categoryId: tees.id,
      name: "Polo Shirt",
      slug: "polo-shirt",
      description: "Pique cotton, two-button placket.",
      price: 13500,
      costPrice: 6000,
      sku: "TS-004",
      images: [],
      variants: sizeColorVariants(["S", "M", "L", "XL"], ["Navy", "White"], 13500),
    },
    {
      categoryId: tees.id,
      name: "Tie-Dye Tee",
      slug: "tie-dye-tee",
      description: "Hand-dyed, unique pattern per piece.",
      price: 14000,
      costPrice: 6500,
      sku: "TS-005",
      images: [],
      stockQuantity: 18,
    },
    {
      categoryId: sneakers.id,
      name: "Classic Canvas Sneakers",
      slug: "classic-canvas-sneakers",
      description: "Low-top canvas, rubber sole.",
      price: 28000,
      costPrice: 15000,
      sku: "SN-001",
      isFeatured: true,
      images: [],
      variants: sizeColorVariants(["40", "41", "42", "43", "44"], ["White", "Black"], 28000),
    },
    {
      categoryId: sneakers.id,
      name: "Chunky Trainer",
      slug: "chunky-trainer",
      description: "Retro dad-shoe silhouette, mesh and suede upper.",
      price: 42000,
      compareAtPrice: 48000,
      costPrice: 24000,
      sku: "SN-002",
      images: [],
      variants: sizeColorVariants(["41", "42", "43", "44"], ["Grey", "Black"], 42000),
    },
    {
      categoryId: sneakers.id,
      name: "High-Top Basketball Sneakers",
      slug: "high-top-basketball-sneakers",
      description: "Ankle support, cushioned sole.",
      price: 35000,
      costPrice: 19000,
      sku: "SN-003",
      images: [],
      stockQuantity: 20,
    },
  ];

  for (const [index, p] of products.entries()) {
    const product = await prisma.product.upsert({
      where: { storeId_slug: { storeId: store.id, slug: p.slug } },
      update: {},
      create: {
        storeId: store.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        costPrice: p.costPrice,
        sku: p.sku,
        trackInventory: true,
        stockQuantity: p.stockQuantity ?? 0,
        isFeatured: p.isFeatured ?? false,
        sortOrder: index,
        images: {
          create: p.images.map((url, i) => ({ url, sortOrder: i, altText: p.name })),
        },
        variants: p.variants
          ? { create: p.variants.map((v) => ({ name: v.name, options: v.options, price: v.price, sku: v.sku, stockQuantity: v.stockQuantity })) }
          : undefined,
      },
    });
    console.log(`Seeded product: ${product.name}`);
  }

  await prisma.shippingZone.upsert({
    where: { id: "seed-zone-lagos" },
    update: {},
    create: {
      id: "seed-zone-lagos",
      storeId: store.id,
      name: "Lagos",
      states: ["Lagos"],
      rate: 1500,
      freeAbove: 50000,
    },
  });

  await prisma.shippingZone.upsert({
    where: { id: "seed-zone-southwest" },
    update: {},
    create: {
      id: "seed-zone-southwest",
      storeId: store.id,
      name: "South West",
      states: ["Ogun", "Oyo", "Osun", "Ondo", "Ekiti"],
      rate: 3000,
      freeAbove: 80000,
    },
  });

  await prisma.shippingZone.upsert({
    where: { id: "seed-zone-other" },
    update: {},
    create: {
      id: "seed-zone-other",
      storeId: store.id,
      name: "Other States",
      states: [
        "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
        "Cross River", "Delta", "Ebonyi", "Edo", "Enugu", "Gombe", "Imo", "Jigawa",
        "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger",
        "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT",
      ],
      rate: 4500,
      freeAbove: 100000,
    },
  });

  await prisma.discount.upsert({
    where: { storeId_code: { storeId: store.id, code: "WELCOME10" } },
    update: {},
    create: {
      storeId: store.id,
      code: "WELCOME10",
      type: DiscountType.PERCENTAGE,
      value: 10,
      minOrderValue: 10000,
      usageLimit: 100,
      isActive: true,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { storeId_phone: { storeId: store.id, phone: "+2348098765432" } },
    update: {},
    create: {
      storeId: store.id,
      name: "Amaka Johnson",
      phone: "+2348098765432",
      email: "amaka@example.com",
      addresses: [{ label: "Home", address: "5 Admiralty Way, Lekki Phase 1, Lagos", state: "Lagos" }],
    },
  });

  const firstProduct = await prisma.product.findFirstOrThrow({
    where: { storeId: store.id, slug: "essential-cotton-tee" },
  });

  await prisma.order.upsert({
    where: { storeId_orderNumber: { storeId: store.id, orderNumber: "CHK-1001" } },
    update: {},
    create: {
      storeId: store.id,
      customerId: customer.id,
      orderNumber: "CHK-1001",
      status: "PAID",
      subtotal: 9500,
      shippingCost: 1500,
      discount: 0,
      total: 11000,
      paymentMethod: PaymentMethod.FLUTTERWAVE,
      shippingAddress: { label: "Home", address: "5 Admiralty Way, Lekki Phase 1, Lagos", state: "Lagos" },
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: firstProduct.id,
            productName: firstProduct.name,
            quantity: 1,
            unitPrice: 9500,
            total: 9500,
          },
        ],
      },
    },
  });

  // Mirrors the tiers/prices/limits shown on the homepage pricing section
  // (src/components/marketing/pricing-section.tsx). "Free" has no row here —
  // a store with no Subscription at all is treated as Free by default; see
  // FREE_PRODUCT_LIMIT in src/lib/plan-limits.ts.
  const paidPlans = [
    { name: "Lite", slug: "lite", monthlyPrice: 3900, productLimit: 20, sortOrder: 1 },
    { name: "Basic", slug: "basic", monthlyPrice: 5200, productLimit: 100, sortOrder: 2 },
    { name: "Growth", slug: "growth", monthlyPrice: 7600, productLimit: 1000, sortOrder: 3 },
    { name: "Business", slug: "business", monthlyPrice: 11000, productLimit: null, sortOrder: 4 },
  ];

  for (const p of paidPlans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.monthlyPrice * 12 * 0.8, // matches the 20% annual discount shown on the pricing page
        currency: "NGN",
        productLimit: p.productLimit,
        sortOrder: p.sortOrder,
      },
    });
  }

  console.log(`\nSeed complete. Store: ${store.name} (${store.slug})`);
  console.log(`Demo login: demo@storehike.ng / password123`);
  console.log(`Admin login: admin@storehike.ng / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
