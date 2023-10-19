// Creates a promise that resolves once the nb created promises have resolved 
export const promiseAll = <T>(nb: number, createElement: (indexd: number) => Promise<T>): Promise<T[]> =>
    Promise.all(
        Array.from(
            { length: nb },
            (_, elementIndex) => createElement(elementIndex)
        )
    );

export function customSetInterval<T>(callback: () => void, interval: T): NodeJS.Timeout {
    return setInterval(callback, interval as number);
}