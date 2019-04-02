// This is only useful so much as we are running on Ethereum-based chains
export function getCurrentBlocktime(): number {
    // @ts-ignore
    return Math.floor(new Date / 1000);
}