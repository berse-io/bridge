// class BerseJS {
//     bridge(token: string)
// }

// let berse = new BerseJS()
// export { berse };

export function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}

export function dehexify(str: string): Buffer {
    // begins with 0x
    if(str[1] == 'x') str = str.slice(2);
    return Buffer.from(str, 'hex')
}

export function wait(ms: number): Promise<any> {
    return new Promise((res,rej)=>setTimeout(res, ms))
}

export async function zxWeb3Connected(pe, CONNECT_TIMEOUT = 7000) {
    return new Promise((res, rej) => {
        pe.on('block', res)
        setTimeout(
            _ => {
                rej(new Error(`Web3.js couldn't connect after ${CONNECT_TIMEOUT}ms`))
            }, 
            CONNECT_TIMEOUT
        )
    });
}

export * from './contracts';