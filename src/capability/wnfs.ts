import { Capability } from "../types"
import { capabilities, CapabilityEscalation, CapabilitySemantics } from "../attenuation"
import { Chained } from "../chained"


export const wnfsCapLevels = {
  "SUPER_USER": 0,
  "OVERWRITE": -1,
  "SOFT_DELETE": -2,
  "REVISE": -3,
  "CREATE": -4,
}

export type WnfsCap = keyof typeof wnfsCapLevels

export function isWnfsCap(obj: unknown): obj is WnfsCap {
  return typeof obj === "string" && Object.keys(wnfsCapLevels).includes(obj)
}



/////////////////////////////
// Public WNFS Capabilities
/////////////////////////////


export interface WnfsPublicCapability {
  user: string // e.g. matheus23.fission.name
  publicPath: string[]
  cap: WnfsCap
}

export const wnfsPublicSemantics: CapabilitySemantics<WnfsPublicCapability> = {

  /**
   * Example valid public wnfs capability:
   * ```js
   * {
   *   wnfs: "boris.fission.name/public/path/to/dir/or/file",
   *   cap: "OVERWRITE"
   * }
   * ```
   */
  parse(cap: Capability): WnfsPublicCapability | null {
    if (typeof cap.wnfs !== "string" || !isWnfsCap(cap.cap)) return null

    // remove trailing slash
    const trimmed = cap.wnfs.endsWith("/") ? cap.wnfs.slice(0, -1) : cap.wnfs
    const split = trimmed.split("/")
    const user = split[0]
    const publicPath = split.slice(2) // drop first two: matheus23.fission.name/public/keep/this
    if (user == null || split[1] !== "public") return null
    return {
      user,
      publicPath,
      cap: cap.cap,
    }
  },

  toCapability(parsed: WnfsPublicCapability): Capability {
    return {
      wnfs: `${parsed.user}/public/${parsed.publicPath.join("/")}`,
      cap: parsed.cap,
    }
  },

  tryDelegating<T extends WnfsPublicCapability>(parentCap: T, childCap: T): T | null | CapabilityEscalation<WnfsPublicCapability> {
    // need to delegate the same user's file system
    if (childCap.user !== parentCap.user) return null

    // must not escalate capability level
    if (wnfsCapLevels[childCap.cap] > wnfsCapLevels[parentCap.cap]) {
      return escalationPublic("Capability level escalation", childCap)
    }

    // parentCap path must be a prefix of childCap path
    if (childCap.publicPath.length < parentCap.publicPath.length) {
      return escalationPublic("WNFS Public path access escalation", childCap)
    }

    for (let i = 0; i < parentCap.publicPath.length; i++) {
      if (childCap.publicPath[i] !== parentCap.publicPath[i]) {
        return escalationPublic("WNFS Public path access escalation", childCap)
      }
    }

    return childCap
  },

}

export function wnfsPublicCapabilities(ucan: Chained) {
  return capabilities(ucan, wnfsPublicSemantics)
}



/////////////////////////////
// Private WNFS Capabilities
/////////////////////////////


export interface WnfsPrivateCapability {
  user: string
  requiredINumbers: Set<string>
  cap: WnfsCap
}

const wnfsPrivateSemantics: CapabilitySemantics<WnfsPrivateCapability> = {

  /**
   * Example valid private wnfs capability:
   * 
   * ```js
   * {
   *   wnfs: "boris.fission.name/private/fccXmZ8HYmpwxkvPSjwW9A",
   *   cap: "OVERWRITE"
   * }
   * ```
   */
  parse(cap: Capability): WnfsPrivateCapability | null {
    if (typeof cap.wnfs !== "string" || !isWnfsCap(cap.cap)) return null

    // split up "boris.fission.name/private/fccXmZ8HYmpwxkvPSjwW9A" into "<user>/private/<inumberBase64url>"
    const split = cap.wnfs.split("/")
    const user = split[0]
    const inumberBase64url = split[2]
    
    if (user == null || split[1] !== "private" || inumberBase64url == null) return null

    return {
      user,
      requiredINumbers: new Set([inumberBase64url]),
      cap: cap.cap,
    }
  },

  toCapability(parsed: WnfsPrivateCapability): Capability {
    const inumbers = Array.from(parsed.requiredINumbers.values())
    const [inumber] = inumbers
    if (inumbers.length !== 1 || inumber == null) {
      // Private wnfs capabilities will only have an encoding with a single inumber.
      // Multiple inumbers are the result of delegations with multiple private capabilities interacting.
      throw new Error(`Can only construct a private capability with exactly one inumber.`)
    }
    return {
      wnfs: `${parsed.user}/private/${inumber}`,
      cap: parsed.cap,
    }
  },

  tryDelegating<T extends WnfsPrivateCapability>(parentCap: T, childCap: T): T | null | CapabilityEscalation<WnfsPrivateCapability> {
    // If the users don't match, these capabilities are unrelated.
    if (childCap.user !== parentCap.user) return null

    // This escalation *could* be wrong, but we shouldn't assume they're unrelated either.
    if (wnfsCapLevels[childCap.cap] > wnfsCapLevels[parentCap.cap]) {
      return escalationPrivate("Capability level escalation", childCap)
    }

    return {
      ...childCap,
      requiredINumbers: new Set([...childCap.requiredINumbers.values(), ...parentCap.requiredINumbers.values()]),
    }
  },

}

export function wnfsPrivateCapabilities(ucan: Chained) {
  return capabilities(ucan, wnfsPrivateSemantics)
}



// ㊙️


function escalationPublic<T extends WnfsPublicCapability>(reason: string, cap: T): CapabilityEscalation<WnfsPublicCapability> {
  return {
    escalation: reason,
    capability: { user: cap.user, publicPath: cap.publicPath, cap: cap.cap }
  }
}


function escalationPrivate<T extends WnfsPrivateCapability>(reason: string, cap: T): CapabilityEscalation<WnfsPrivateCapability> {
  return {
    escalation: reason,
    capability: { user: cap.user, requiredINumbers: cap.requiredINumbers, cap: cap.cap }
  }
}
