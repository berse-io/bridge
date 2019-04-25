pragma solidity ^0.5.0;

library BytesArrayUtil {
    /// @param _arr the array to slice
    /// @param _to the index to slice until (inclusive)
    function sliceTo(
        bytes32[] memory _arr,
        uint _to
    )
        public
        pure
        returns (bytes32[] memory)
    {
        bytes32[] memory newArr = new bytes32[](_to + 1);
        for(uint i = 0; i < newArr.length; i++) {
            newArr[i] = _arr[i];
        }
        return newArr; 
    }
}