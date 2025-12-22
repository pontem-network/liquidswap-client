import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { useState, useRef, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { WalletConnector } from "@/components/wallet-connector"
import { CoinBalances } from "@/components/coin-balances"
import { LiquidityPools } from "@/components/liquidity-pools"
import { LPWithdraw } from "@/components/lp-withdraw"
import { Shield, Wallet, Droplets, ArrowDownToLine } from "lucide-react"

export function HomePage() {
  const { connected, account, wallet } = useWallet()
  const [selectedLpToken, setSelectedLpToken] = useState<string | undefined>(undefined)
  const withdrawSectionRef = useRef<HTMLDivElement>(null)

  // Scroll to withdraw section when a pool is selected
  useEffect(() => {
    if (selectedLpToken) {
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      }, 300)
    }
  }, [selectedLpToken])

  const handlePoolSelect = (lpTokenType: string) => {
    setSelectedLpToken(lpTokenType)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Liquidswap DEX Client
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Manage your liquidity pools and withdraw balances from Liquidswap DEX
            </p>
          </div>

          {/* Flow Section */}
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium">Connect Wallet</span>
                <span className="text-xs text-muted-foreground">Connect your Aptos wallet</span>
              </div>
              
              <div className="w-8 h-px bg-muted-foreground/30 hidden md:block" />
              
              {/* Step 2 */}
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <Droplets className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-medium">Select Pool</span>
                <span className="text-xs text-muted-foreground">Choose liquidity pool</span>
              </div>
              
              <div className="w-8 h-px bg-muted-foreground/30 hidden md:block" />
              
              {/* Step 3 */}
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <ArrowDownToLine className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium">Withdraw Balance</span>
                <span className="text-xs text-muted-foreground">Remove liquidity</span>
              </div>
            </div>
          </div>

          {/* Account Info Section */}
          <div className="space-y-4 mt-20">
            {connected && account?.address ? (
              <>
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Connected Account</h3>
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm text-muted-foreground">Wallet</span>
                        <span className="text-sm font-mono">{wallet?.name || 'Unknown'}</span>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm text-muted-foreground">Address</span>
                        <span className="text-sm font-mono break-all">{account.address.toString()}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Ready to manage your liquidity on Liquidswap DEX
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Coin Balances Section */}
                <CoinBalances accountAddress={account.address.toString()} />

                {/* Liquidity Pools Section */}
                <LiquidityPools accountAddress={account.address.toString()} onPoolSelect={handlePoolSelect} />

                {/* LP Withdraw Section */}
                <div ref={withdrawSectionRef}>
                  <LPWithdraw accountAddress={account.address.toString()} selectedLpTokenType={selectedLpToken} />
                </div>
              </>
            ) : (
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                    <p className="text-muted-foreground mb-4">
                      Connect your Aptos wallet to manage your liquidity pools on Liquidswap
                    </p>
                    <WalletConnector />
                  </div>
                </div>
              </Card>
            )}
          </div>


        </div>
      </main>
    </div>
  )
}
