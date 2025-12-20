const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log("--- DB USER DUMP ---");
    console.log(`Total Users: ${users.length}`);
    users.forEach(u => console.log(`- ${u.name} (ID: ${u.id})`));
    console.log("--------------------");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
