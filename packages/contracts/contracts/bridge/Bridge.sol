pragma solidity ^0.5.0;

import "../events/EventListener.sol";
import "../events/EventEmitter.sol";
import "../BridgedToken.sol";
import "../libs/LibEvent.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract Bridge {
    using LibEvent for bytes32;
    using SafeMath for uint256;

    mapping(bytes32 => bool) public processedEvents;
    uint256 public chainId;

    EventListener public eventListener;
    EventEmitter public eventEmitter;

    event TokensBridged(
        bytes32 eventHash, 
        address targetBridge, 
        uint256 indexed chainId, 
        address indexed receiver, 
        address indexed token, 
        uint256 amount, 
        uint256 _salt
    );

    event TokensClaimed(
        address indexed token, 
        address indexed receiver, 
        uint256 amount, 
        uint256 indexed chainId, 
        uint256 salt
    );

    // Each network can have infitite amount of bridge contracts so we don't need to initialize anything on any side
    struct Network {
        mapping(address => BridgeContract) bridgeContracts;
    }

    mapping(uint256 => Network) internal networks;

    // Each bridge contract has a mapping in both ways of bridged token addresses
    struct BridgeContract {
        mapping(address => address) bridgedTokenToOrigin;
        mapping(address => address) originTokenToBridged;
        mapping(address => uint256) tokensLockedFor;
    }

    mapping(address => bool) isBridgedToken; //is bridged token



    constructor(
        EventListener _eventListener, 
        EventEmitter _eventEmitter
    ) 
        public 
    {
        eventListener = _eventListener;
        eventEmitter = _eventEmitter;
    }
    
    
    function _createBridgeTokenEvent(
        address _targetBridge, 
        address _receiver, 
        address _token, 
        uint256 _amount, 
        uint256 _chainId, 
        uint256 _salt, 
        bool _bridgingBack
    ) 
        internal 
    {
        bytes32 eventHash = _getTokensBridgedEventHash(
            _token, 
            _receiver, 
            _amount, 
            _salt, 
            _chainId, 
            _bridgingBack
        );
        eventHash = eventEmitter.emitEvent(eventHash); //Emit and return marked event reusing the variable

        emit TokensBridged(
            eventHash, 
            _targetBridge, 
            _chainId, 
            _receiver, 
            _token, 
            _amount, 
            _salt
        );
    }

    function _getTokensBridgedEventHash(
       address _token, 
       address _receiver,
       uint256 _amount,
       uint256 _salt,
       uint256 _targetChainId,
       bool _bridgingBack
    ) 
        public pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(
            _receiver, 
            _token, 
            _amount, 
            _salt, 
            _targetChainId, 
            _bridgingBack
        ));
    }

    function _checkEventProcessed(
        bytes32 eventHash
    ) 
        internal 
    {
        require(!processedEvents[eventHash], "EVENT_ALREADY_PROCESSED");
        processedEvents[eventHash] = true;
    }

    /// @notice Called when bridging tokens
    /// @param _token Address of the token to bridge
    /// @param _receiver Address receiving the token on the other chain
    /// @param _amount Amount of tokens to bridge
    /// @param _targetChainId Chain Id of the receiving bridge contract
    /// @param _targetBridge Address of the target bridge contract
    /// @param _salt Random salt to allow exact matches of bridging actions
    function bridge(
        address _token, 
        address _receiver, 
        uint256 _amount, 
        uint256 _salt, 
        uint256 _targetChainId, 
        address _targetBridge
    ) 
        public
    {
        BridgedToken tokenContract = BridgedToken(_token);
        BridgeContract storage bridgeContract = networks[_targetChainId].bridgeContracts[_targetBridge];
        address originTokenAddress = networks[_targetChainId].bridgeContracts[_targetBridge].bridgedTokenToOrigin[_token];

        // If bridging back burn
        if(originTokenAddress != address(0) ) {
            // If bridging back burn
            tokenContract.burn(msg.sender, _amount);
            _createBridgeTokenEvent(
                _targetBridge, _receiver, originTokenAddress, _amount, _targetChainId, _salt, true
            ); 
            
            
        } else {
            require(tokenContract.transferFrom(msg.sender, address(this), _amount), "TOKEN_TRANSFER_FAILED"); 
            bridgeContract.tokensLockedFor[_token] += _amount;
            _createBridgeTokenEvent(
                _targetBridge, _receiver, _token, _amount, _targetChainId, _salt, false
            );  
        }
    }


    /// @notice Called when claiming tokens bridged from another chain
    /// @param _token Address of token that was bridged or the original token
    /// @param _receiver Address the bridged tokens should be send to
    /// @param _amount Amount that was bridged
    /// @param _salt Random salt to allow exact matches of bridging actions
    /// @param _triggerAddress Address of smart contract that triggered the event
    /// @param _originChainId Chain ID of the chain the event came from
    /// @param _eventsProof ?????
    /// @param _eventsPaths ??
    /// @param _stateProofBitmap ???
    /// @param _stateProof ??
    function claim(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        address _triggerAddress,
        uint256 _originChainId,
        bool _bridgingBack,
        
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _stateProofBitmap,
        bytes memory _stateProof
        
    ) 
        public
    {
        // Generate event hash
        bytes32 eventHash = _getTokensBridgedEventHash(_token, _receiver, _amount, _salt, eventEmitter.chainId(), _bridgingBack);
        eventHash = eventHash.getMarkedEvent(_triggerAddress, _originChainId);

        // make sure event was not processed
        _checkEventProcessed(eventHash);
        
        require(eventListener.checkEvent(
            eventHash,
            _eventsProof,
            _eventsPaths,
            _stateProofBitmap,
            _stateProof
        ), "EVENT_NOT_FOUND");

        handleClaim(_token, _receiver, _amount, _salt, eventEmitter.chainId(), _triggerAddress, _originChainId, _bridgingBack);
    }

    function handleClaim(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _targetChainId,
        address _triggerAddress,
        uint256 _originChainId,
        bool _bridgingBack
    ) 
        internal
    {
        BridgeContract storage bridgeContract = networks[_originChainId].bridgeContracts[_triggerAddress];

        // if token was bridged back
        // TODO this detection is kind of brittle as with duplicate addresses across chain this might mess up
        // Perhaps we shoould enforce different bridge addresses across chains
        if(bridgeContract.tokensLockedFor[_token] != 0 && _bridgingBack ) { 
            BridgedToken token = BridgedToken(_token);
            token.transfer(_receiver, _amount);
            bridgeContract.tokensLockedFor[_token] =  bridgeContract.tokensLockedFor[_token].sub(_amount);
        } else {
            // Else create bridged token and/or mint
            BridgedToken token = BridgedToken(getBridgedToken(_token, _originChainId, _triggerAddress));
            token.mint(_receiver, _amount);
        }

        emit TokensClaimed(_token, _receiver, _amount, _originChainId, _salt);
    }


    function getBridgedToken(
        address _token, 
        uint256 _chainId, 
        address _triggerAddress
    ) 
        public
        returns (address tokenAddress) 
    { 
        // Check if the bridged token already exists
        tokenAddress = getBridgedTokenStatic(_token, _chainId, _triggerAddress);  
        if(tokenAddress != address(0)){
            return tokenAddress;
        }

        // Else deploy bridged token
        tokenAddress = address(new BridgedToken());

        isBridgedToken[tokenAddress] = true;
        BridgeContract storage bridgeContract = networks[_chainId].bridgeContracts[_triggerAddress];

        bridgeContract.bridgedTokenToOrigin[tokenAddress] = _token;
        bridgeContract.originTokenToBridged[_token] = _token;
    }

    function getBridgedTokenStatic(
        address _token, 
        uint256 _chainId, 
        address _triggerAddress
    ) 
        public 
        view 
        returns (address) 
    {
        return networks[_chainId].bridgeContracts[_triggerAddress].originTokenToBridged[_token];
    }

    function markEvent(
        bytes32 _eventHash, 
        address _triggerAddress, 
        uint256 _triggerChain
    ) 
        public 
        view 
        returns (bytes32) 
    {
        return _eventHash.getMarkedEvent(_triggerAddress, _triggerChain);
    }

}