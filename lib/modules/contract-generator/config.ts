/* hold the contract address in one place 
    and make it easy to swap later */

import type { Address } from "viem";

export const willRegistryAddress =
  (process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as Address | undefined) ??
  undefined;