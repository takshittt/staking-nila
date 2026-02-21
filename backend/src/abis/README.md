# Contract ABIs

This directory contains the Application Binary Interfaces (ABIs) for smart contracts used by the backend.

## Why ABIs are here

ABIs are extracted from the compiled contract artifacts and stored here because:
- The full `artifacts/` folder is gitignored (contains large compilation outputs)
- Production deployments need the ABI to interact with deployed contracts
- ABIs are small JSON files that can be safely committed to version control

## Updating ABIs

When you update and recompile smart contracts, regenerate the ABI:

```bash
# From the backend directory
node -p "JSON.stringify(require('./artifacts/contracts/NilaStakingUpgradeable.sol/NilaStakingUpgradeable.json').abi, null, 2)" > src/abis/NilaStakingUpgradeable.json
```

## Files

- `NilaStakingUpgradeable.json` - ABI for the NilaStakingUpgradeable contract
