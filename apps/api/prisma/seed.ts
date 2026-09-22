import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const plans: Prisma.planCreateInput[] = [
    {
      id: "free",
      name: "Free",
      description: "Para empezar a probar",
      price: new Prisma.Decimal(0),
      currency: "EUR",
      billing_interval: "month",
      max_links: 5,
      max_clicks_per_month: BigInt(1000),
      analytics_retention_days: 7,
      custom_slug: false,
      custom_domain: false,
      api_access: false,
      remove_branding: false,
      export_data: false,
      support_level: "email",
      sort_order: 1,
    },
    {
      id: "pro",
      name: "Pro",
      description: "Para profesionales",
      price: new Prisma.Decimal(12),
      currency: "EUR",
      billing_interval: "month",
      max_links: 100,
      max_clicks_per_month: BigInt(50000),
      analytics_retention_days: 365,
      custom_slug: true,
      custom_domain: false,
      api_access: false,
      remove_branding: true,
      export_data: false,
      support_level: "priority",
      stripe_price_id: "price_xxx", // 👈 se rellena tras crear el precio en Stripe
      sort_order: 2,
    },
    {
      id: "business",
      name: "Business",
      description: "Para agencias y equipos",
      price: new Prisma.Decimal(29),
      currency: "EUR",
      billing_interval: "month",
      max_links: null, // ilimitado
      max_clicks_per_month: BigInt(500000),
      analytics_retention_days: null, // ilimitado
      custom_slug: true,
      custom_domain: true,
      api_access: true,
      remove_branding: true,
      export_data: true,
      support_level: "dedicated",
      stripe_price_id: "price_yyy",
      sort_order: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id as string },
      update: {},
      create: plan,
    });
  }

  console.log("✅ Planes sembrados");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
