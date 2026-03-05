import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Finding duplicate users...');

    // MongoDB doesn't natively support easy raw queries via Prisma for duplicates,
    // we'll fetch all and group them in memory
    const users = await prisma.user.findMany({
        select: { id: true, walletAddress: true }
    });

    const addressCounts = new Map<string, string[]>();

    for (const user of users) {
        if (!user.walletAddress) continue;
        const address = user.walletAddress;
        const ids = addressCounts.get(address) || [];
        ids.push(user.id);
        addressCounts.set(address, ids);
    }

    let deletedCount = 0;
    for (const [address, ids] of addressCounts.entries()) {
        if (ids.length > 1) {
            console.log(`Address ${address} has ${ids.length} duplicates. Keeping first, deleting others.`);

            // Keep first ID
            const idsToDelete = ids.slice(1);

            for (const id of idsToDelete) {
                // try to delete users
                try {
                    // ensure no relations block the delete, or delete relations first if needed
                    // in this case just trying to delete user directly
                    await prisma.user.delete({ where: { id } });
                    deletedCount++;
                } catch (e: any) {
                    console.error(`Failed to delete user ${id}`, e.message);
                }
            }
        }
    }

    console.log(`Deleted ${deletedCount} duplicate users.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
