import { useState } from "react"
import { useLiquidityPools, type LiquidityPool } from "@/hooks/use-liquidity-pools"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/ui/copy-button"
import { CollapsibleSection } from "@/components/collapsible-section"
import { formatCoinBalance } from "@/utils/coin-formatting"
import { formatLPPoolName } from "@/utils/lp-tokens"
import { LP_DECIMALS } from "@/constants/liquidswap"
import { Droplets, AlertCircle, Loader2, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LiquidityPoolsProps {
  accountAddress?: string
  onPoolSelect?: (lpTokenType: string) => void
}

function PoolItem({ pool, onSelect }: { pool: LiquidityPool; onSelect?: (lpTokenType: string) => void }) {
  const poolName = formatLPPoolName(pool.coinX, pool.coinY)
  const balance = formatCoinBalance(pool.lpBalance, LP_DECIMALS)

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onSelect?.(pool.fullType)}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Pool Icon */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Pool Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{poolName}</h3>
            <Badge variant="outline" className="text-xs">
              {pool.version}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {pool.curve}
          </p>
        </div>

        {/* Balance */}
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-semibold text-lg">{balance}</p>
          <p className="text-xs text-muted-foreground">LP Tokens</p>
        </div>
      </div>

      {/* Copy Button */}
      <div className="ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <CopyButton 
          textToCopy={pool.fullType}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        />
      </div>
    </div>
  )
}

function VersionSection({ 
  version, 
  pools,
  onPoolSelect
}: { 
  version: string
  pools: LiquidityPool[]
  onPoolSelect?: (lpTokenType: string) => void
}) {
  if (pools.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {version} Pools
        </h3>
        <Badge variant="secondary" className="text-xs">
          {pools.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {pools.map((pool, index) => (
          <PoolItem key={`${pool.fullType}-${index}`} pool={pool} onSelect={onPoolSelect} />
        ))}
      </div>
    </div>
  )
}

export function LiquidityPools({ accountAddress, onPoolSelect }: LiquidityPoolsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { data: groupedPools, isLoading, isError, error, refetch } = useLiquidityPools(accountAddress)

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading liquidity pools...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Failed to Load Pools</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'An error occurred while fetching liquidity pools'}
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!groupedPools) {
    return null
  }

  const totalPools = groupedPools.V0.length + groupedPools['V0.5'].length + groupedPools.V1.length

  if (totalPools === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Liquidity Pools</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any active liquidity positions on Liquidswap
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <span>Liquidity Pools</span>
          <Badge variant="secondary">
            {totalPools} {totalPools === 1 ? 'Pool' : 'Pools'}
          </Badge>
        </div>
      }
      description="Your active liquidity positions on Liquidswap DEX"
      icon={Droplets}
      iconColor="bg-purple-500"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      <div className="space-y-6">
        <VersionSection version="V0" pools={groupedPools.V0} onPoolSelect={onPoolSelect} />
        <VersionSection version="V0.5" pools={groupedPools['V0.5']} onPoolSelect={onPoolSelect} />
        <VersionSection version="V1" pools={groupedPools.V1} onPoolSelect={onPoolSelect} />
      </div>
    </CollapsibleSection>
  )
}
