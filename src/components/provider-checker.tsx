import { useState } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"

import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SignatureDisplay } from "./signature-display"
import { ErrorDisplay } from "./error-display"

interface ProviderCheckerProps {
  onSignatureChange?: (signature: string) => void
}

export function ProviderChecker({ onSignatureChange }: ProviderCheckerProps) {
  // Default transaction payload for testing
  const defaultPayload = JSON.stringify({
    "function": "0x1::coin::transfer",
    "type_arguments": ["0x0000000000000000000000000000000000000000000000000000000000000001::aptos_coin::AptosCoin"],
    "arguments": ["0x3311cd72df40ff27ba05d3ad80f8d72334d24b7fcafc284e52acf244580236d4", "100000"]
  }, null, 2)

  const [payload, setPayload] = useState(defaultPayload)
  const [signature, setSignature] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { connected, account, signAndSubmitTransaction } = useWallet()

  const signTransactionWithWallet = async () => {
    if (!connected || !account) {
      setError("Wallet not connected")
      return
    }

    if (!payload.trim()) {
      setError("Enter transaction payload")
      return
    }

    setIsLoading(true)
    setError("")
    setSignature("")

    try {
      // Parse the JSON payload
      let parsedPayload
      try {
        parsedPayload = JSON.parse(payload)
      } catch (parseError) {
        throw new Error("Invalid JSON payload")
      }

      // Sign and submit transaction using wallet adapter
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: parsedPayload.function,
          typeArguments: parsedPayload.type_arguments || [],
          functionArguments: parsedPayload.arguments || [],
        },
      })

      console.log('Transaction submitted:', response)
      setSignature(response.hash)
      
      if (onSignatureChange) {
        onSignatureChange(response.hash)
      }

    } catch (error) {
      console.error("Error signing transaction:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setSignature("")
    setError("")
    if (onSignatureChange) {
      onSignatureChange("")
    }
  }

  const resetToDefault = () => {
    setPayload(defaultPayload)
    clearResults()
  }

  return (
    <div className="space-y-4">
      {/* Payload Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="payload">Transaction Payload (JSON)</Label>
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetToDefault}
            className="text-xs"
          >
            Reset to Default
          </Button>
        </div>
        <Textarea
          id="payload"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="Enter transaction payload as JSON..."
          className="min-h-[120px] font-mono text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <LoadingButton 
          onClick={signTransactionWithWallet}
          disabled={!payload.trim() || !connected}
          loading={isLoading}
          loadingText="Signing Transaction..."
          className="flex-1"
        >
          Sign & Submit Transaction
        </LoadingButton>
        <Button 
          variant="outline" 
          onClick={clearResults}
          disabled={!signature && !error}
        >
          Clear
        </Button>
      </div>

      {/* Error Display */}
      <ErrorDisplay error={error} onClear={() => setError("")} />

      {/* Results */}
      {signature && (
        <div className="space-y-2">
          <Label>Transaction Hash</Label>
          <SignatureDisplay signature={signature} onClose={clearResults} />
        </div>
      )}
    </div>
  )
}
