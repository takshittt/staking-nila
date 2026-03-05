import dotenv from "dotenv";
dotenv.config();

console.log("=== Environment Variables Debug ===");
console.log("NILA_TOKEN_ADDRESS:", process.env.NILA_TOKEN_ADDRESS);
console.log("NILA_TOKEN_ADDRESS length:", process.env.NILA_TOKEN_ADDRESS?.length);
console.log("NILA_TOKEN_ADDRESS type:", typeof process.env.NILA_TOKEN_ADDRESS);
console.log("STAKING_CONTRACT_ADDRESS:", process.env.STAKING_CONTRACT_ADDRESS);
console.log("===================================");
