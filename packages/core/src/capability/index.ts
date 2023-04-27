import * as ability from "./ability.js"
import * as resourcePointer from "./resource-pointer.js"
import * as util from "../util.js"
import * as nb from './nb.js'

import { Ability, isAbility } from "./ability.js"
import { ResourcePointer, isResourcePointer } from "./resource-pointer.js"
import { Superuser } from "./super-user.js"
import { NB, isNB } from "./nb.js"


// RE-EXPORTS


export { ability, resourcePointer, Ability, isAbility, NB, isNB }



// 💎


export type Capability = {
  with: ResourcePointer
  can: Ability
  nb?: NB
}

export type EncodedCapability = {
  with: string
  can: string
  nb?: string
}



// TYPE CHECKS


export function isCapability(obj: unknown): obj is Capability {
  return util.isRecord(obj)
    && util.hasProp(obj, "with") && isResourcePointer(obj.with)
    && util.hasProp(obj, "can") && isAbility(obj.can)
}

export function isEncodedCapability(obj: unknown): obj is EncodedCapability {
  return util.isRecord(obj)
    && util.hasProp(obj, "with") && typeof obj.with === "string"
    && util.hasProp(obj, "can") && typeof obj.can === "string"
}



// 🌸


export function as(did: string, resource: Superuser | string): Capability {
  return {
    with: resourcePointer.as(did, resource),
    can: ability.SUPERUSER
  }
}


export function my(resource: Superuser | string): Capability {
  return {
    with: resourcePointer.my(resource),
    can: ability.SUPERUSER
  }
}


export function prf(selector: Superuser | number, ability: Ability): Capability {
  return {
    with: resourcePointer.prf(selector),
    can: ability
  }
}



// 🛠


/**
 * Check if two capabilities are equal.
 *
 * This is not the same as `JSON.stringify(capA) === JSON.stringify(capB)`.
 * Specifically:
 *   - For resource pointers, it does case-insensitive matching of the `scheme`.
 *   - For abilities, it does case-insensitive matching of the namespace and segments.
 */
export function isEqual(a: Capability, b: Capability): boolean {
  return resourcePointer.isEqual(a.with, b.with) && ability.isEqual(a.can, b.can)
}



// ENCODING


/**
 * Encode the individual parts of a capability.
 *
 * @param cap The capability to encode
 */
export function encode(cap: Capability): EncodedCapability {
  let c:EncodedCapability = {
    with: resourcePointer.encode(cap.with),
    can: ability.encode(cap.can)
  }
  if (cap.nb){
    c.nb = nb.encode(cap.nb)
  }
  return c
}

/**
 * Parse an encoded capability.
 *
 * @param cap The encoded capability
 */
export function parse(cap: EncodedCapability): Capability {
  let c:Capability = {
    with: resourcePointer.parse(cap.with),
    can: ability.parse(cap.can)
  }
  if (cap.nb){
    c.nb = nb.parse(cap.nb)
  }
  return c
}