import * as util from "../util.js"

export type NB
    = Record<string, unknown>

export const SEPARATOR: string = "/"

export function isNB(obj: unknown): obj is NB {
    return (
        util.isRecord(obj)
    )
}

export function isEqual(a: NB, b: NB): boolean {
    return true
}

export function encode(nb: NB): string {
    return JSON.stringify(nb)
}

export function parse(nb: string): NB {
    let parsedNB = JSON.parse(nb)
    return parsedNB
}