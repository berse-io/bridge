pragma solidity ^0.5.0;


// Based on https://rinkeby.etherscan.io/address/0x881544e0b2e02a79ad10b01eca51660889d5452b#code
// Original Code for the sparse merkle tree came from Wolkdb Plasma, this is now no longer compatible with that
// we have javascript and Golang implementations for reference of the new implementation.
library SparseMerkleTree {
    uint16 constant DEPTH = 256;
    bytes32 constant defaultHash = 0x00;

    function verify(
        bytes32 root,
        uint256 index,
        bytes32 leaf,
        bytes32 proofBitmap,
        bytes memory proof
    ) public view returns (bool)
    {
        bytes32 computedHash = getRoot(leaf, index, proofBitmap, proof);
        return (computedHash == root);
    }

    // first 64 bits of the proof are the 0/1 bits
    function getRoot(bytes32 leaf, uint256 index, bytes32 proofBitmap, bytes memory proof) public view returns (bytes32) {
        require(proof.length % 32 == 0 && proof.length <= 2056);
        bytes32 proofElement;
        bytes32 computedHash = leaf;
        
        // `proof` layout:
        // +-------+-------+-------------------------------+
        // | Start |  End  |          Description          |
        // +-------+-------+-------------------------------+
        // |     0 |    32 |   Bitmap of empty proof nodes |
        // |    32 |    64 |   1st proof node              |
        // |   ... |   ... |   nth proof node              |
        // +-------+-------+-------------------------------+

        uint256 proofBits = uint256(proofBitmap);
        // assembly { proofBits := mload(add(proof, 32)) }

        // Beginning of nodes in `proof`
        uint256 p = 0;
        

        for (uint d = 0; d < DEPTH; d++ ) {
            if (proofBits % 2 == 0) { // check if last bit of proofBits is 0
                // proofElement = defaultHashes[d];
                proofElement = defaultHash;
            } else {
                p += 32;
                require(proof.length >= p, "proof too short");
                assembly { proofElement := mload(add(proof, p)) }
            }
            if (index % 2 == 0) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
            proofBits = proofBits / 2; // shift it right for next bit
            index = index / 2;
        }
        return computedHash;
    }
}



/**
 * we can probably use an interval tree
 * also known as a merkle sum tree
 * whereby every node also has a sum attached to it 
 * 
 * but instead of a sum
 * every event is given a monotonic id 
 * so to prove an event
 * you are O(1) 
 */
