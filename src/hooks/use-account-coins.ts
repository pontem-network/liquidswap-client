import { useQuery } from '@tanstack/react-query'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { useWallet } from '@aptos-labs/wallet-adapter-react'

export interface CoinBalance {
  amount: string
  asset_type: string
  is_frozen: boolean
  is_primary?: boolean | null
  metadata?: {
    asset_type: string
    creator_address: string
    decimals: number
    icon_uri?: string | null
    name: string
    symbol: string
    token_standard: string
  } | null
  owner_address: string
  storage_id: string
  token_standard?: string | null
}

// Create a singleton Aptos instance
const aptosConfig = new AptosConfig({ network: Network.MAINNET })
const aptos = new Aptos(aptosConfig)

/**
 * Hook to fetch account coin balances using Aptos SDK
 * @param accountAddress - Optional account address to query (defaults to connected wallet)
 * @returns Query result with coin balances data
 */
export function useAccountCoins(accountAddress?: string) {
  const { account } = useWallet()
  
  // Use provided address or fall back to connected wallet address
  const address = accountAddress || account?.address?.toString()

  return useQuery({
    queryKey: ['accountCoins', address],
    queryFn: async () => {
      if (!address) {
        throw new Error('No account address available')
      }

      const coins = await aptos.getAccountCoinsData({
        accountAddress: address,
      })

      // Filter out coins with zero balance
      return coins.filter((coin) => {
        const amount = BigInt(coin.amount || '0')
        return amount > BigInt(0)
      }) as CoinBalance[]
    },
    enabled: !!address, // Only run query if address is available
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  })
}
