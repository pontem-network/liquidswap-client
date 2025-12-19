import { useQuery } from '@tanstack/react-query'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { isLPToken, parseLPToken, type ParsedLPToken } from '@/utils/lp-tokens'
import type { LiquidswapVersion } from '@/constants/liquidswap'

export interface LiquidityPool extends ParsedLPToken {
  lpBalance: string
  lpBalanceRaw: string
}

export interface GroupedPools {
  V0: LiquidityPool[]
  'V0.5': LiquidityPool[]
  V1: LiquidityPool[]
}

// Create a singleton Aptos instance
const aptosConfig = new AptosConfig({ network: Network.MAINNET })
const aptos = new Aptos(aptosConfig)

/**
 * Hook to fetch liquidity pools where the user has LP tokens
 * @param accountAddress - Optional account address to query (defaults to connected wallet)
 * @returns Query result with liquidity pools data grouped by version
 */
export function useLiquidityPools(accountAddress?: string) {
  const { account } = useWallet()
  
  // Use provided address or fall back to connected wallet address
  const address = accountAddress || account?.address?.toString()

  return useQuery({
    queryKey: ['liquidityPools', address],
    queryFn: async () => {
      if (!address) {
        throw new Error('No account address available')
      }

      // Use getAccountCoinsData to fetch ALL fungible assets including LP tokens
      const allCoins = await aptos.getAccountCoinsData({
        accountAddress: address,
      })

      // Filter and parse LP tokens
      const pools: LiquidityPool[] = []

      for (const coin of allCoins) {
        const assetType = coin.asset_type
        
        // Check if this is an LP token
        if (!isLPToken(assetType)) {
          continue
        }

        // Parse the LP token
        const parsed = parseLPToken(assetType)
        if (!parsed) {
          continue
        }

        const balance = coin.amount || '0'
        
        // Only include pools with non-zero balance
        if (BigInt(balance) > BigInt(0)) {
          pools.push({
            ...parsed,
            lpBalance: balance,
            lpBalanceRaw: balance,
          })
        }
      }

      // Group pools by version
      const grouped: GroupedPools = {
        V0: [],
        'V0.5': [],
        V1: [],
      }

      for (const pool of pools) {
        grouped[pool.version].push(pool)
      }

      return grouped
    },
    enabled: !!address, // Only run query if address is available
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  })
}

/**
 * Hook to get total count of pools across all versions
 */
export function useLiquidityPoolsCount(accountAddress?: string) {
  const { data } = useLiquidityPools(accountAddress)
  
  if (!data) return 0
  
  return data.V0.length + data['V0.5'].length + data.V1.length
}

/**
 * Hook to check if user has any liquidity pools
 */
export function useHasLiquidityPools(accountAddress?: string) {
  const count = useLiquidityPoolsCount(accountAddress)
  return count > 0
}
