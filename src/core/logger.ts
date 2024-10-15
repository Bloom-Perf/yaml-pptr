export type YpLogger = {
    debug(str: string): void,
    info(str: string): void,
    warn(str: string): void,
    error(str: string): void
}

export const dumbLogger: YpLogger = {
    debug(str) { console.log(str); },
    info(str) { console.log(str); },
    warn(str) { console.log(str); },
    error(str) { console.error(str); },
}