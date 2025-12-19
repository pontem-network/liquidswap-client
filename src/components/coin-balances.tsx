import { useAccountCoins, type CoinBalance } from "@/hooks/use-account-coins"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/ui/copy-button"
import { formatCoinBalance, shortenCoinType, extractCoinSymbol } from "@/utils/coin-formatting"
import { Coins, AlertCircle, Loader2, Snowflake } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CoinBalancesProps {
  accountAddress?: string
}

function CoinItem({ coin }: { coin: CoinBalance }) {
  const symbol = extractCoinSymbol(coin.metadata, coin.asset_type)
  const balance = formatCoinBalance(coin.amount, coin.metadata?.decimals || 0)
  const shortType = shortenCoinType(coin.asset_type)

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Coin Icon */}
        <div className="flex-shrink-0">
          {coin.metadata?.icon_uri ? (
            <img 
              src={coin.metadata.icon_uri} 
              alt={symbol}
              className="h-10 w-10 rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center ${coin.metadata?.icon_uri ? 'hidden' : ''}`}>
            <Coins className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Coin Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{symbol}</h3>
            {coin.is_frozen && (
              <Badge variant="warning" className="text-xs">
                <Snowflake className="h-3 w-3 mr-1" />
                Frozen
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {coin.metadata?.name || shortType}
          </p>
        </div>

        {/* Balance */}
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-semibold text-lg">{balance}</p>
          <p className="text-xs text-muted-foreground">{symbol}</p>
        </div>
      </div>

      {/* Copy Button */}
      <div className="ml-2 flex-shrink-0">
        <CopyButton 
          textToCopy={coin.asset_type}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        />
      </div>
    </div>
  )
}

export function CoinBalances({ accountAddress }: CoinBalancesProps) {
  const { data: coins, isLoading, isError, error, refetch } = useAccountCoins(accountAddress)

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading coin balances...</p>
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
              <h3 className="text-lg font-semibold mb-2">Failed to Load Balances</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'An error occurred while fetching coin balances'}
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

  if (!coins || coins.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Coins className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Coins Found</h3>
              <p className="text-sm text-muted-foreground">
                This account doesn't have any coin balances yet
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Coin Balances</h2>
          </div>
          <Badge variant="secondary">
            {coins.length} {coins.length === 1 ? 'Coin' : 'Coins'}
          </Badge>
        </div>

        <div className="space-y-2">
          {coins.map((coin) => (
            <CoinItem key={coin.storage_id} coin={coin} />
          ))}
        </div>
      </div>
    </Card>
  )
}
