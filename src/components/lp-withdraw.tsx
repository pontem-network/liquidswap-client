import { useState, useEffect, useMemo } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowDownToLine, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react"
import { parseLPToken, formatLPPoolName, extractCoinSymbol, buildLiquidityPoolResourceType, prepareRemoveLiquidityTransaction } from "@/utils/lp-tokens"
import { formatCoinBalance } from "@/utils/coin-formatting"
import { LP_DECIMALS, MODULES_ACCOUNT, MODULES_V05_ACCOUNT, RESOURCES_ACCOUNT, RESOURCES_V05_ACCOUNT } from "@/constants/liquidswap"

interface LPBalance {
  balance: string
  decimals: number
  parsedBalance: number
}

interface PoolReserves {
  coinXReserve: number
  coinYReserve: number
  lpSupply: number
}

interface WithdrawOutput {
  x: number
  y: number
}

export function LPWithdraw({ accountAddress }: { accountAddress: string }) {
  const { signAndSubmitTransaction } = useWallet()
  const [lpTokenType, setLpTokenType] = useState("")
  const [lpBalance, setLpBalance] = useState<LPBalance | null>(null)
  const [poolReserves, setPoolReserves] = useState<PoolReserves | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5") // 0.5% default slippage
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [estimatedOutput, setEstimatedOutput] = useState<WithdrawOutput | null>(null)

  const aptos = new Aptos(new AptosConfig({ network: Network.MAINNET }))

  const parsedLP = useMemo(() => {
    return lpTokenType ? parseLPToken(lpTokenType) : null
  }, [lpTokenType])

  const fetchLPBalance = async () => {
    if (!lpTokenType.trim()) {
      setError("Please enter LP token type")
      return
    }

    setIsLoading(true)
    setError(null)
    setLpBalance(null)
    setPoolReserves(null)
    setEstimatedOutput(null)
    setWithdrawAmount("")

    try {
      const parsed = parseLPToken(lpTokenType)
      
      if (!parsed) {
        throw new Error("Invalid LP token type format")
      }

      // Use getAccountCoinsData instead of getAccountResources
      const allCoins = await aptos.getAccountCoinsData({
        accountAddress,
      })

      // Find the LP token in coins data
      const lpCoin = allCoins.find(coin => coin.asset_type === lpTokenType)

      if (!lpCoin) {
        setError("LP token not found in your account. You may not have any balance of this LP token.")
        return
      }

      const balance = lpCoin.amount || '0'
      const parsedBalance = parseInt(balance) / Math.pow(10, LP_DECIMALS)

      if (BigInt(balance) === BigInt(0)) {
        setError("Your LP token balance is zero. You need to add liquidity first.")
        return
      }

      setLpBalance({
        balance,
        decimals: LP_DECIMALS,
        parsedBalance,
      })
      
      // Fetch pool reserves to show estimated output
      await fetchPoolReserves(parsed)
    } catch (err) {
      const error = err as Error
      setError(error.message || "Failed to fetch LP balance")
      console.error("Error fetching LP balance:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPoolReserves = async (parsed: ReturnType<typeof parseLPToken>) => {
    if (!parsed) return

    try {
      // Build the LiquidityPool resource type from the LP token
      const poolResourceType = buildLiquidityPoolResourceType(parsed, lpTokenType)
      
      // Extract MODULES account from the resource type for address normalization
      const modulesAccountMatch = poolResourceType.match(/^(0x[a-fA-F0-9]+)::liquidity_pool::LiquidityPool</)
      const modulesAccount = modulesAccountMatch ? modulesAccountMatch[1] : (parsed.version === 'V0.5' ? MODULES_V05_ACCOUNT : MODULES_ACCOUNT)
      
      // Note: Coins are NOT sorted in the resource type - they use original order from LP token
      // The reserve mapping (coin_x_reserve vs coin_y_reserve) matches the order in resource type
      // So coin_x_reserve corresponds to first coin in resource type, coin_y_reserve to second
      
      // For V0.5, LiquidityPool resource is in RESOURCES account, not MODULES account
      const accountToUse = parsed.version === 'V0.5' ? RESOURCES_V05_ACCOUNT : modulesAccount
      
      // Normalize the account address to 64 characters (add leading zeros if needed)
      const normalizedAccount = accountToUse.startsWith('0x')
        ? '0x' + accountToUse.slice(2).padStart(64, '0')
        : accountToUse
      
      const poolResource = await aptos.getAccountResource({
        accountAddress: normalizedAccount as `0x${string}`,
        resourceType: poolResourceType as `${string}::${string}::${string}`,
      })

      if (!poolResource) {
        throw new Error('Pool resource is null or undefined')
      }

      // Aptos SDK returns data in poolResource.data
      const poolData = (poolResource as { data?: { coin_x_reserve: { value: string }, coin_y_reserve: { value: string } } }).data || poolResource
      
      if (!poolData || !poolData.coin_x_reserve || !poolData.coin_y_reserve) {
        throw new Error(`Pool data structure invalid. Expected coin_x_reserve and coin_y_reserve. Got: ${poolData ? Object.keys(poolData).join(', ') : 'null'}`)
      }
      
      // coin_x_reserve corresponds to first coin in resource type (parsed.coinX)
      // coin_y_reserve corresponds to second coin in resource type (parsed.coinY)
      // No need to swap - order matches the resource type which matches LP token order
      const coinXReserve = parseInt(poolData.coin_x_reserve.value)
      const coinYReserve = parseInt(poolData.coin_y_reserve.value)

      // Fetch LP supply - CoinInfo is in RESOURCES account
      const resourcesAccount = parsed.version === 'V0.5' ? RESOURCES_V05_ACCOUNT : RESOURCES_ACCOUNT
      
      // Normalize the resources account address to 64 characters
      const normalizedResourcesAccount = resourcesAccount.startsWith('0x')
        ? '0x' + resourcesAccount.slice(2).padStart(64, '0')
        : resourcesAccount
      
      const lpSupplyResource = await aptos.getAccountResource({
        accountAddress: normalizedResourcesAccount,
        resourceType: `0x1::coin::CoinInfo<${lpTokenType}>`,
      })

      if (!lpSupplyResource) {
        throw new Error('LP supply resource is null or undefined')
      }

      // Aptos SDK returns data in lpSupplyResource.data
      const lpSupplyData = (lpSupplyResource as { data?: { supply: { vec?: Array<{ integer?: { vec?: Array<{ value: string }> }, value?: string }>, value?: string } } }).data || lpSupplyResource

      if (!lpSupplyData || !lpSupplyData.supply) {
        throw new Error(`LP supply data structure invalid. Expected supply. Got: ${lpSupplyData ? Object.keys(lpSupplyData).join(', ') : 'null'}`)
      }

      // Handle different supply structures - could be vec or direct value
      let lpSupply: number
      if (lpSupplyData.supply.vec && Array.isArray(lpSupplyData.supply.vec) && lpSupplyData.supply.vec.length > 0) {
        // Standard structure: supply.vec[0].integer.vec[0].value
        if (lpSupplyData.supply.vec[0].integer?.vec?.[0]?.value) {
          lpSupply = parseInt(lpSupplyData.supply.vec[0].integer.vec[0].value)
        } else if (lpSupplyData.supply.vec[0].value) {
          // Alternative structure: supply.vec[0].value
          lpSupply = parseInt(lpSupplyData.supply.vec[0].value)
        } else {
          throw new Error(`Unexpected supply structure: ${JSON.stringify(lpSupplyData.supply)}`)
        }
      } else if (lpSupplyData.supply.value) {
        // Direct value structure
        lpSupply = parseInt(lpSupplyData.supply.value)
      } else {
        throw new Error(`Unexpected supply structure: ${JSON.stringify(lpSupplyData.supply)}`)
      }

      // Reserve order matches resource type order, which matches LP token order
      // So coinXReserve from API = parsed.coinX, coinYReserve from API = parsed.coinY
      setPoolReserves({
        coinXReserve,
        coinYReserve,
        lpSupply,
      })
    } catch (err) {
      // Silently fail - pool reserves are optional for withdraw
      // User will see a warning that estimated output is not available
      console.error('Failed to fetch pool reserves:', err)
    }
  }

  // Calculate estimated output when withdraw amount changes
  useEffect(() => {
    if (!poolReserves || !withdrawAmount || !parsedLP) {
      setEstimatedOutput(null)
      return
    }

    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      setEstimatedOutput(null)
      return
    }

    const toBurn = amount * Math.pow(10, LP_DECIMALS)
    const xReturn = (toBurn * poolReserves.coinXReserve) / poolReserves.lpSupply
    const yReturn = (toBurn * poolReserves.coinYReserve) / poolReserves.lpSupply

    setEstimatedOutput({
      x: Math.floor(xReturn),
      y: Math.floor(yReturn),
    })
  }, [withdrawAmount, poolReserves, parsedLP])

  const handleMaxClick = () => {
    if (lpBalance) {
      setWithdrawAmount(lpBalance.parsedBalance.toString())
    }
  }

  const calculateMinOutput = (amount: number, slippagePercent: number): number => {
    const slippageFactor = 1 - slippagePercent / 100
    return Math.floor(amount * slippageFactor)
  }

  const handleWithdraw = async () => {
    if (!parsedLP || !lpBalance || !withdrawAmount) {
      setError("Please fill all fields")
      return
    }

    if (parsedLP.version === 'V1') {
      setError("V1 pools are not yet supported")
      return
    }

    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0 || amount > lpBalance.parsedBalance) {
      setError("Invalid withdraw amount")
      return
    }

    const slippageNum = parseFloat(slippage)
    if (isNaN(slippageNum) || slippageNum < 0 || slippageNum > 100) {
      setError("Invalid slippage value")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setTxHash(null)

    try {
      // Convert amount to smallest units
      const burnAmount = Math.floor(amount * Math.pow(10, LP_DECIMALS))

      // Calculate minimum outputs with slippage
      // If we don't have estimated output (pool reserves not available), use 0 for min outputs
      const minXOutput = estimatedOutput 
        ? calculateMinOutput(estimatedOutput.x, slippageNum).toString()
        : "0"
      const minYOutput = estimatedOutput 
        ? calculateMinOutput(estimatedOutput.y, slippageNum).toString()
        : "0"

      // Use utility function to prepare transaction
      const { functionName, typeArguments, functionArguments } = prepareRemoveLiquidityTransaction(
        parsedLP,
        lpTokenType,
        burnAmount.toString(),
        minXOutput,
        minYOutput
      )

      console.log("Transaction payload:", {
        function: functionName,
        typeArguments,
        functionArguments,
      })

      const response = await signAndSubmitTransaction({
        sender: accountAddress,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          typeArguments,
          functionArguments,
        },
      })

      setTxHash(response.hash)
      
      // Wait for transaction
      await aptos.waitForTransaction({
        transactionHash: response.hash,
      })

      // Refresh balance
      await fetchLPBalance()
      setWithdrawAmount("")
    } catch (err) {
      const error = err as Error
      const errorMsg = error?.message || error?.toString() || "Failed to withdraw liquidity"
      setError(errorMsg)
      console.error("Error withdrawing:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <ArrowDownToLine className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Withdraw LP Token</h3>
            <p className="text-sm text-muted-foreground">
              Remove liquidity from a specific LP token
            </p>
          </div>
        </div>

        {/* LP Token Input */}
        <div className="space-y-2">
          <Label htmlFor="lp-token">LP Token Type</Label>
          <div className="flex gap-2">
            <Input
              id="lp-token"
              placeholder="0x163df34fccbf003ce219d3f1d9e70d140b60622cb9dd47599c25fb2f797ba6e::lp_coin::LP<...>"
              value={lpTokenType}
              onChange={(e) => setLpTokenType(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              onClick={fetchLPBalance}
              disabled={isLoading || !lpTokenType.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </>
              ) : (
                "Fetch"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste the full LP token resource type from your liquidity pool
          </p>
        </div>

        {/* Parsed LP Info */}
        {parsedLP && (
          <>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pool:</span>
                <span className="font-medium">
                  {formatLPPoolName(parsedLP.coinX, parsedLP.coinY)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Curve:</span>
                <span className="font-medium">{parsedLP.curve}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium">{parsedLP.version}</span>
              </div>
            </div>

            {/* V1 Warning */}
            {parsedLP.version === 'V1' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  V1 (Concentrated Liquidity) pools are not yet supported. Please use V0 or V0.5 pools.
                </p>
              </div>
            )}
          </>
        )}

        {/* LP Balance */}
        {lpBalance && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your LP Balance:</span>
              <span className="text-lg font-semibold">
                {lpBalance.parsedBalance.toFixed(6)} LP
              </span>
            </div>
            
            {/* Pool Reserves */}
            {poolReserves && parsedLP && (
              <div className="pt-3 border-t border-blue-200 dark:border-blue-800 space-y-2">
                <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Pool Reserves:
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {extractCoinSymbol(parsedLP.coinX)} Reserve:
                  </span>
                  <span className="font-mono">
                    {(poolReserves.coinXReserve / Math.pow(10, 8)).toFixed(8)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {extractCoinSymbol(parsedLP.coinY)} Reserve:
                  </span>
                  <span className="font-mono">
                    {(poolReserves.coinYReserve / Math.pow(10, 8)).toFixed(8)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total LP Supply:
                  </span>
                  <span className="font-mono">
                    {(poolReserves.lpSupply / Math.pow(10, LP_DECIMALS)).toFixed(8)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Withdraw Amount Input */}
        {lpBalance && (
          <>
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Withdraw Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="0.0"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.000001"
                  min="0"
                  max={lpBalance.parsedBalance}
                />
                <Button variant="outline" onClick={handleMaxClick}>
                  MAX
                </Button>
              </div>
            </div>

            {/* Slippage Input */}
            <div className="space-y-2">
              <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
              <Input
                id="slippage"
                type="number"
                placeholder="0.5"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                step="0.1"
                min="0"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Your transaction will revert if the price changes unfavorably by more than this percentage
              </p>
            </div>
          </>
        )}

        {/* Estimated Output or Warning */}
        {withdrawAmount && lpBalance && parsedLP && (
          estimatedOutput ? (
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-900 dark:text-purple-100">
                <TrendingDown className="h-4 w-4" />
                <span>Estimated Output</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {extractCoinSymbol(parsedLP.coinX)}:
                  </span>
                  <span className="font-medium">
                    {(estimatedOutput.x / Math.pow(10, 8)).toFixed(8)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {extractCoinSymbol(parsedLP.coinY)}:
                  </span>
                  <span className="font-medium">
                    {(estimatedOutput.y / Math.pow(10, 8)).toFixed(8)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Actual output may vary slightly due to slippage
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Estimated output unavailable</p>
                  <p className="text-xs">
                    Pool reserves could not be fetched. Transaction will proceed with no minimum output protection (slippage = 100%).
                    You will receive your proportional share of the pool.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {txHash && (
          <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                Liquidity withdrawn successfully!
              </p>
              <a
                href={`https://explorer.aptoslabs.com/txn/${txHash}?network=mainnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 dark:text-green-400 hover:underline break-all"
              >
                View transaction: {txHash}
              </a>
            </div>
          </div>
        )}

        {/* Withdraw Button */}
        {lpBalance && (
          <Button
            onClick={handleWithdraw}
            disabled={
              isSubmitting || 
              !withdrawAmount || 
              parseFloat(withdrawAmount) <= 0 || 
              parsedLP?.version === 'V1'
            }
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Withdrawing...
              </>
            ) : (
              <>
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Withdraw Liquidity
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
