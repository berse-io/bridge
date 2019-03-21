// class BerseJS {
//     bridge(token: string)
// }

// let berse = new BerseJS()
// export { berse };

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