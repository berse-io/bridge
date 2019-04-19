export class SerialisationUtils {
    static parse<T>(s: string): T {
        return JSON.parse(s);
    }
}


// export interface Serialisable<C extends new (...args) => any> {
// sz(): string;
// constructor: C;
// }

export interface ISerialisable {
    sz(): string;
}

export interface ISerialisableStatic {
    new (
        ...args
    ): ISerialisable;

    dsz(s: string, data: any): ISerialisable;
}

// https://stackoverflow.com/questions/13955157/how-to-define-static-property-in-typescript-interface
export function staticImplements<T>() {
    return (constructor: T) => {constructor};
}



export interface SchemaEventTree {
	items: string[];
	layers: string[][];
}

export interface SchemaStateTree {
    state: {
        [chainId: string]: {
            eventsRoot: string;
            
            // sz(SchemaEventTree)
            eventsTree: SchemaEventTree;
        }
    }
    tree: SchemaSparseMerkleTree;
}

export interface SchemaSparseMerkleTree {
    depth: number;
    leaves: { [k: string]: string };
    tree: { [k: string]: string }[];
    defaultNodes: string[];
    root: string;
}