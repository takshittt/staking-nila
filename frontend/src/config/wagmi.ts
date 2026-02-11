import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { bsc, bscTestnet } from '@reown/appkit/networks'
import { QueryClient } from '@tanstack/react-query'
import type { AppKitNetwork } from '@reown/appkit/networks'

// Get project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 
  '0e2bb9fb468ec96b47f3d5dab2121a17'

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set')
}

// Create query client
export const queryClient = new QueryClient()

// Define networks
const networks = [bsc, bscTestnet] as [AppKitNetwork, ...AppKitNetwork[]]

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
})

// Create AppKit instance
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'MindWaveDAO Staking',
    description: 'Stake NILA tokens and earn rewards',
    url: 'https://mindwavedao.com',
    icons: ['/mw-logo-dark (1).webp']
  },
  features: {
    analytics: true,
    email: false,
    socials: false
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#E31E24',
    '--w3m-border-radius-master': '12px'
  }
})
