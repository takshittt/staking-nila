# Deployment Records

This directory contains automated deployment and upgrade records.

## File Naming Convention

- `deployment-{chainId}-{timestamp}.json` - Initial proxy deployments
- `upgrade-{chainId}-{timestamp}.json` - Proxy upgrades

## Record Structure

### Deployment Record
```json
{
  "network": "bscTestnet",
  "chainId": "97",
  "proxy": "0x...",
  "implementation": "0x...",
  "admin": "0x...",
  "nilaToken": "0x...",
  "deployedAt": "2024-01-01T00:00:00.000Z",
  "deployer": "0x..."
}
```

### Upgrade Record
```json
{
  "network": "bscTestnet",
  "chainId": "97",
  "proxy": "0x...",
  "oldImplementation": "0x...",
  "newImplementation": "0x...",
  "upgradedAt": "2024-01-01T00:00:00.000Z",
  "upgrader": "0x..."
}
```

## Important Notes

- **Keep these files safe** - They contain critical deployment information
- **Backup regularly** - Commit to version control
- **Never delete** - Historical records are valuable
- **Reference for upgrades** - Use proxy address from deployment records

## Usage

These files are automatically created by:
- `scripts/deployProxy.ts` - Creates deployment records
- `scripts/upgradeProxy.ts` - Creates upgrade records

To find your latest deployment:
```bash
ls -lt backend/deployments/ | head -n 5
```

To get proxy address from latest deployment:
```bash
cat backend/deployments/deployment-*.json | jq -r '.proxy' | tail -n 1
```
