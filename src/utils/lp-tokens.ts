import {
  RESOURCES_ACCOUNT,
  RESOURCES_V05_ACCOUNT,
  RESOURCES_V1_ACCOUNT,
  CURVE_UNCORRELATED,
  CURVE_STABLE,
  type LiquidswapVersion,
} from '@/constants/liquidswap'

export interface ParsedLPToken {
  coinX: string
  coinY: string
  curve: string
  version: LiquidswapVersion
  fullType: string
}

/**
 * Checks if a resource type is a Liquidswap LP token
 * @param resourceType - The full resource type string
 * @returns true if it's an LP token
 */
export function isLPToken(resourceType: string): boolean {
  return resourceType.includes('::lp_coin::LP<')
}

/**
 * Normalizes an Aptos address by removing leading zeros after 0x
 * @param address - Address to normalize
 * @returns Normalized address
 */
function normalizeAddress(address: string): string {
  if (!address.startsWith('0x')) return address
  // Remove 0x, remove leading zeros, add 0x back
  const withoutPrefix = address.slice(2)
  const withoutLeadingZeros = withoutPrefix.replace(/^0+/, '') || '0'
  return '0x' + withoutLeadingZeros
}

/**
 * Determines the Liquidswap version from the resource type
 * @param resourceType - The full resource type string
 * @returns Version identifier or null if not recognized
 */
export function getLPVersion(resourceType: string): LiquidswapVersion | null {
  const normalizedType = resourceType.toLowerCase()
  const normalizedV0 = normalizeAddress(RESOURCES_ACCOUNT).toLowerCase()
  const normalizedV05 = normalizeAddress(RESOURCES_V05_ACCOUNT).toLowerCase()
  const normalizedV1 = normalizeAddress(RESOURCES_V1_ACCOUNT).toLowerCase()
  
  if (normalizedType.includes(normalizedV0)) {
    return 'V0'
  }
  if (normalizedType.includes(normalizedV05)) {
    return 'V0.5'
  }
  if (normalizedType.includes(normalizedV1)) {
    return 'V1'
  }
  return null
}

/**
 * Parses an LP token type string to extract coin types and curve
 * @param resourceType - The full resource type string
 * @returns Parsed LP token information or null if parsing fails
 */
export function parseLPToken(resourceType: string): ParsedLPToken | null {
  if (!isLPToken(resourceType)) {
    return null
  }

  const version = getLPVersion(resourceType)
  if (!version) {
    return null
  }

  // Extract the generic type parameters from LP<...>
  const lpMatch = resourceType.match(/::lp_coin::LP<(.+)>/)
  if (!lpMatch) {
    return null
  }

  const generics = lpMatch[1]
  
  // Split by commas, but need to handle nested generics
  const parts = splitGenerics(generics)
  
  if (parts.length < 3) {
    return null
  }

  const coinX = parts[0].trim()
  const coinY = parts[1].trim()
  const curveType = parts[2].trim()

  return {
    coinX,
    coinY,
    curve: formatCurveType(curveType),
    version,
    fullType: resourceType,
  }
}

/**
 * Splits a string by commas while respecting nested angle brackets
 * @param str - String to split
 * @returns Array of parts
 */
function splitGenerics(str: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    
    if (char === '<') {
      depth++
      current += char
    } else if (char === '>') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  if (current) {
    parts.push(current)
  }

  return parts
}

/**
 * Formats curve type to a readable name
 * @param curveType - Full curve type string
 * @returns Formatted curve name
 */
function formatCurveType(curveType: string): string {
  if (curveType.includes('Uncorrelated')) {
    return CURVE_UNCORRELATED
  }
  if (curveType.includes('Stable')) {
    return CURVE_STABLE
  }
  // Extract last part after ::
  const parts = curveType.split('::')
  return parts[parts.length - 1] || 'Unknown'
}

/**
 * Extracts a short coin symbol from a full coin type
 * @param coinType - Full coin type (e.g., "0x1::aptos_coin::AptosCoin")
 * @returns Short symbol (e.g., "APT" or "AptosCoin")
 */
export function extractCoinSymbol(coinType: string): string {
  // Known mappings for common coins
  const knownCoins: Record<string, string> = {
    '0x1::aptos_coin::AptosCoin': 'APT',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC': 'USDC',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT': 'USDT',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH': 'WETH',
    '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T': 'USDC',
    '0xa2eda21a58856fda86451436513b867c97eecb4ba099da5775520e0f7492e852::coin::T': 'USDT',
  }

  if (knownCoins[coinType]) {
    return knownCoins[coinType]
  }

  // Extract last part after ::
  const parts = coinType.split('::')
  const lastPart = parts[parts.length - 1]
  
  // If it's a generic type like "T", try to get more context
  if (lastPart === 'T' && parts.length >= 2) {
    return parts[parts.length - 2]
  }

  return lastPart || 'Unknown'
}

/**
 * Formats a pool name from coin types
 * @param coinX - First coin type
 * @param coinY - Second coin type
 * @returns Formatted pool name (e.g., "APT / USDC")
 */
export function formatLPPoolName(coinX: string, coinY: string): string {
  const symbolX = extractCoinSymbol(coinX)
  const symbolY = extractCoinSymbol(coinY)
  return `${symbolX} / ${symbolY}`
}
