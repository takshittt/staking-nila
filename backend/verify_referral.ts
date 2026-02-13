
import { PrismaClient } from '@prisma/client';
import { UserService } from './src/services/user.service';

const prisma = new PrismaClient();
const userService = new UserService();

async function main() {
    console.log('Starting verification...');

    // 1. Create a referrer
    const referrerWallet = '0xReferrer' + Math.random().toString(36).substring(7);
    console.log(`Creating referrer with wallet: ${referrerWallet}`);
    const referrer = await UserService.connectWallet(referrerWallet);

    if (!referrer) {
        throw new Error('Failed to create referrer');
    }
    console.log(`Referrer created. Code: ${referrer.referralCode}`);

    // 2. Create a user referred by this referrer
    const userWallet = '0xUser' + Math.random().toString(36).substring(7);
    console.log(`Creating user with wallet: ${userWallet}, referred by: ${referrer.referralCode}`);
    const user = await UserService.connectWallet(userWallet, referrer.referralCode!);

    if (!user) {
        throw new Error('Failed to create user');
    }
    console.log(`User created.`);

    // 3. Fetch user details and check referrerWallet
    console.log('Fetching user details...');
    const userDetails = await UserService.getUserByWallet(userWallet);

    console.log('User Details:', {
        wallet: userDetails.walletAddress,
        referredBy: userDetails.referredBy,
        referrerWallet: userDetails.referrerWallet
    });

    if (userDetails.referrerWallet && userDetails.referrerWallet.toLowerCase() === referrerWallet.toLowerCase()) {
        console.log('SUCCESS: Referrer wallet matches!');
    } else {
        console.error('FAILURE: Referrer wallet does not match or is missing.');
        console.error(`Expected: ${referrerWallet}`);
        console.error(`Got: ${userDetails.referrerWallet}`);
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
