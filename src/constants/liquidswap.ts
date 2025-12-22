/**
 * Liquidswap contract addresses for Aptos Mainnet
 * These addresses are used to identify LP tokens and interact with Liquidswap pools
 */

// V0 (Original Liquidswap)
export const MODULES_ACCOUNT = '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12'
export const RESOURCES_ACCOUNT = '0x05a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948'

// V0.5 (Stable Curve Update)
export const MODULES_V05_ACCOUNT = '0x163df34fccbf003ce219d3f1d9e70d140b60622cb9dd47599c25fb2f797ba6e'
export const RESOURCES_V05_ACCOUNT = '0x61d2c22a6cb7831bee0f48363b0eec92369357aece0d1142062f7d5d85c7bef8'

// V1 (Concentrated Liquidity)
export const MODULES_V1_ACCOUNT = '0x54cb0bb2c18564b86e34539b9f89cfe1186e39d89fce54e1cd007b8e61673a85'
export const RESOURCES_V1_ACCOUNT = '0xa0d8702b7c696d989675cd2f894f44e79361531cff115c0063390922f5463883'

// Script module names for different versions
export const SCRIPTS_V2 = 'scripts_v2' // For V0
export const SCRIPTS = 'scripts'    // For V0.5

// LP token decimals
export const LP_DECIMALS = 6

// Version identifiers
export type LiquidswapVersion = 'V0' | 'V0.5' | 'V1'

// Curve types
export const CURVE_UNCORRELATED = 'Uncorrelated'
export const CURVE_STABLE = 'Stable'
