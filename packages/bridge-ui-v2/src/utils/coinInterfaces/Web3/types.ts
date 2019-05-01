export interface KeyPair {
    address: string,
    privateKey: string,
};

export interface ValidateResponse {
    success: boolean,
    errorMsg: string,
}

export interface TransactionSigner {
    sign(txObject: any): Promise<SignedTransaction>
}

export interface SignedTransaction {
    messageHash: string,
    v: string,
    r: string,
    s: string,
    rawTransaction: string
}