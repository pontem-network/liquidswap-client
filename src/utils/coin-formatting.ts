/**
 * Formats a coin balance by applying decimals and formatting for display
 * @param amount - Raw amount as string or number
 * @param decimals - Number of decimal places for the coin
 * @returns Formatted balance string
 */
export function formatCoinBalance(amount: string | number, decimals: number): string {
  const numAmount = typeof amount === 'string' ? BigInt(amount) : BigInt(amount)
  const divisor = BigInt(10 ** decimals)
  
  const integerPart = numAmount / divisor
  const fractionalPart = numAmount % divisor
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toLocaleString()
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.replace(/0+$/, '')
  
  return `${integerPart.toLocaleString()}.${trimmedFractional}`
}

/**
 * Shortens a long coin type for display
 * @param type - Full coin type (e.g., "0x1::aptos_coin::AptosCoin")
 * @returns Shortened type for display
 */
export function shortenCoinType(type: string): string {
  if (!type) return ''
  
  // Split by :: to get parts
  const parts = type.split('::')
  
  if (parts.length < 3) return type
  
  // Get address, module, and coin name
  const address = parts[0]
  const coinName = parts[parts.length - 1]
  
  // Shorten address if it's long
  const shortAddress = address.length > 10 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address
  
  return `${shortAddress}::${coinName}`
}

/**
 * Extracts coin symbol from metadata or derives it from type
 * @param metadata - Coin metadata object
 * @param assetType - Fallback asset type string
 * @returns Coin symbol
 */
export function extractCoinSymbol(
  metadata?: { symbol?: string; name?: string } | null,
  assetType?: string
): string {
  if (metadata?.symbol) {
    return metadata.symbol
  }
  
  if (metadata?.name) {
    return metadata.name
  }
  
  if (assetType) {
    // Try to extract from asset type (last part after ::)
    const parts = assetType.split('::')
    return parts[parts.length - 1] || 'Unknown'
  }
  
  return 'Unknown'
}

/**
 * Formats a number with appropriate suffixes (K, M, B)
 * @param num - Number to format
 * @returns Formatted string with suffix
 */
export function formatNumberWithSuffix(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`
  }
  return num.toFixed(2)
}
