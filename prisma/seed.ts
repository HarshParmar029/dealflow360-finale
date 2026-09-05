import { PrismaClient, Role, CustomerTier, ProductCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
	console.log("Starting strongest seed...");

	// Clean previous data
	await prisma.stockLevel.deleteMany();
	await prisma.warehouse.deleteMany();
	await prisma.payment.deleteMany();
	await prisma.negotiationComment.deleteMany();
	await prisma.approvalLog.deleteMany();
	await prisma.quotationLine.deleteMany();
	await prisma.quotation.deleteMany();
	await prisma.upsellRule.deleteMany();
	await prisma.categoryDiscountLimit.deleteMany();
	await prisma.product.deleteMany();
	await prisma.customer.deleteMany();
	await prisma.user.deleteMany();

	const passwordHash = await bcrypt.hash("password123", 10);

	// ========== USERS ==========
	await prisma.user.create({
		data: {
			name: "System Admin",
			email: "admin@dealflow360.com",
			passwordHash,
			role: Role.ADMIN,
		},
	});

	await prisma.user.create({
		data: {
			name: "Sales Manager",
			email: "manager@dealflow360.com",
			passwordHash,
			role: Role.MANAGER,
		},
	});

	const rep1 = await prisma.user.create({
		data: {
			name: "Rahul Sharma",
			email: "rep1@dealflow360.com",
			passwordHash,
			role: Role.SALES_REP,
		},
	});

	await prisma.user.create({
		data: {
			name: "Priya Patel",
			email: "rep2@dealflow360.com",
			passwordHash,
			role: Role.SALES_REP,
		},
	});

	// ========== CUSTOMER USERS + CUSTOMER RECORDS ==========
	const bronzeUser = await prisma.user.create({
		data: {
			name: "Bronze Customer",
			email: "bronze@dealflow360.com",
			passwordHash,
			role: Role.CUSTOMER,
		},
	});

	const silverUser = await prisma.user.create({
		data: {
			name: "Silver Customer",
			email: "silver@dealflow360.com",
			passwordHash,
			role: Role.CUSTOMER,
		},
	});

	const goldUser = await prisma.user.create({
		data: {
			name: "Gold Customer",
			email: "gold@dealflow360.com",
			passwordHash,
			role: Role.CUSTOMER,
		},
	});

	await prisma.customer.create({
		data: {
			name: "Bronze Corp",
			email: "bronze@dealflow360.com",
			tier: CustomerTier.BRONZE,
			userId: bronzeUser.id,
		},
	});

	await prisma.customer.create({
		data: {
			name: "Silver Industries",
			email: "silver@dealflow360.com",
			tier: CustomerTier.SILVER,
			userId: silverUser.id,
		},
	});

	await prisma.customer.create({
		data: {
			name: "Gold Enterprises",
			email: "gold@dealflow360.com",
			tier: CustomerTier.GOLD,
			userId: goldUser.id,
		},
	});

	// ========== PRODUCTS ==========
	const laptop = await prisma.product.create({
		data: {
			name: "Laptop Pro",
			category: ProductCategory.HARDWARE,
			price: 80000,
			cost: 55000,
			imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
		},
	});

	const server = await prisma.product.create({
		data: {
			name: "Server Rack",
			category: ProductCategory.HARDWARE,
			price: 150000,
			cost: 110000,
			imageUrl: "https://images.unsplash.com/photo-1591405351990-4726e331f141?w=400",
		},
	});

	const setup = await prisma.product.create({
		data: {
			name: "Setup Service",
			category: ProductCategory.SERVICE,
			price: 20000,
			cost: 8000,
			imageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
		},
	});

	const support = await prisma.product.create({
		data: {
			name: "Support Plan",
			category: ProductCategory.SERVICE,
			price: 15000,
			cost: 6000,
			imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400",
		},
	});

	const cloud = await prisma.product.create({
		data: {
			name: "Cloud Backup Plan",
			category: ProductCategory.SUBSCRIPTION,
			price: 5000,
			cost: 2000,
			imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400",
		},
	});

	// ========== DISCOUNT LIMITS ==========
	await prisma.categoryDiscountLimit.createMany({
		data: [
			{ category: ProductCategory.HARDWARE, maxDiscountPct: 15 },
			{ category: ProductCategory.SERVICE, maxDiscountPct: 10 },
			{ category: ProductCategory.SUBSCRIPTION, maxDiscountPct: 12 },
		],
	});

	// ========== UPSELL RULES ==========
	await prisma.upsellRule.createMany({
		data: [
			{
				baseProductId: laptop.id,
				suggestedProductId: setup.id,
				minMargin: 25,
				promoted: true,
			},
			{
				baseProductId: laptop.id,
				suggestedProductId: cloud.id,
				minMargin: 30,
				promoted: true,
			},
			{
				baseProductId: server.id,
				suggestedProductId: support.id,
				minMargin: 20,
				promoted: false,
			},
		],
	});

        // ========== WAREHOUSES + STOCK ==========
        const mainWarehouse = await prisma.warehouse.create({ data: { name: "Main Warehouse" } });
        const eastDepot = await prisma.warehouse.create({ data: { name: "East Depot" } });

        const allProducts = [laptop, server, setup, support, cloud];
        for (const product of allProducts) {
                await prisma.stockLevel.create({
                        data: { warehouseId: mainWarehouse.id, productId: product.id, quantity: Math.floor(Math.random() * 15) + 5 },
                });
                await prisma.stockLevel.create({
                        data: { warehouseId: eastDepot.id, productId: product.id, quantity: Math.floor(Math.random() * 15) + 5 },
                });
        }


	console.log(`\"Seed completed successfully!\"`);
	console.log("----------------------------------------");
	console.log("Login with password: password123");
	console.log("Admin     Ã¢â€ â€™ admin@dealflow360.com");
	console.log("Manager   Ã¢â€ â€™ manager@dealflow360.com");
	console.log("Sales Rep Ã¢â€ â€™ rep1@dealflow360.com");
	console.log("Customer  Ã¢â€ â€™ gold@dealflow360.com");
	console.log("----------------------------------------");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

