import { ThemeToggle } from "@/components/theme-toggle"
import { WalletConnector } from "@/components/wallet-connector"
import { Link } from "react-router-dom"
import pontemLogo from "/pontem-logo.svg"

export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="">
              <img 
                src={pontemLogo} 
                alt="Pontem Logo" 
                className="h-8 w-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Liquidswap</h1>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <WalletConnector />
        </div>
      </div>
    </header>
  )
}
