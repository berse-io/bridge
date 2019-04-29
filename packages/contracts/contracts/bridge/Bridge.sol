pragma solidity ^0.5.0;

import "../events/EventListener.sol";
import "../events/EventEmitter.sol";
import "./BridgedToken.sol";
import "../libs/LibEvent.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BridgeCrosschainEvents {
    function hashEventData_Deposit(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _targetChainId,
        address _targetBridge
    ) 
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(
            _token,
            _receiver,
            _amount,
            _salt,
            _targetChainId,
            _targetBridge
        ));
    }

    function hashEventData_BridgedBurn(
        address _originToken,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _targetChainId,
        address _targetBridge
    ) 
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(
            _originToken,
            _receiver,
            _amount,
            _salt,
            _targetChainId,
            _targetBridge
        ));
    }
    
}


contract Bridge is BridgeCrosschainEvents {
    using LibEvent for bytes32;
    using SafeMath for uint256;

    mapping(bytes32 => bool) public processedEvents;

    EventListener public eventListener;
    EventEmitter public eventEmitter;

    event Deposit(
        address token,
        address receiver,
        uint256 amount,
        uint256 salt,
        uint256 targetChainId,
        address targetBridge,
        bytes32 eventHash
    );

    event BridgedMint(
        address bridgedToken,        
        address token,
        address receiver,
        uint256 amount,
        uint256 salt,
        uint256 originChainId,
        address originBridge,
        bytes32 eventHash
    );

    event BridgedBurn(
        address bridgedToken,
        address token,
        address receiver,
        uint256 amount,
        uint256 salt,
        uint256 targetChainId,
        address targetBridge,
        bytes32 eventHash
    );

    event Withdrawal(
        address token,
        address receiver,
        uint256 amount,
        uint256 salt,
        uint256 originChainId,
        address originBridge,
        bytes32 eventHash
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
        mapping(address => uint256) tokenReserves;
    }

    constructor(
        EventListener _eventListener, 
        EventEmitter _eventEmitter
    ) 
        public 
    {
        eventListener = _eventListener;
        eventEmitter = _eventEmitter;
    }

    function deposit(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _targetChainId,
        address _targetBridge
    )
        public
        returns (bytes32)
    {
        ERC20 token = ERC20(_token);
        BridgeContract storage bridgeContract = networks[_targetChainId].bridgeContracts[_targetBridge];

        require(
            token.transferFrom(msg.sender, address(this), _amount), 
            "TOKEN_TRANSFER_FAILED"
        );

        bytes32 eventDataHash = hashEventData_Deposit(
            _token,
            _receiver,
            _amount,
            _salt,
            _targetChainId,
            _targetBridge
        );

        bytes32 eventHash = eventEmitter.emitEvent(eventDataHash);

        emit Deposit(
            _token,
            _receiver,
            _amount,
            _salt,
            _targetChainId,
            _targetBridge,
            eventHash
        );
    }

    function issueBridged(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _originChainId,
        address _originBridge,
        
        bytes32 eventHash_check,
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _stateProofBitmap,
        bytes memory _stateProof
    )
        public
    {
        bytes32 eventDataHash = hashEventData_Deposit(
            _token,
            _receiver,
            _amount,
            _salt,
            eventEmitter.chainId(), 
            address(this)
        );

        bytes32 eventHash = LibEvent.getEventHash(eventDataHash, _originBridge, _originChainId);

        require(eventHash == eventHash_check, "EVENT_HASH_MISMATCH");

        // make sure event was not processed
        _checkEventProcessed(eventHash);
        
        require(
            eventListener.checkEvent(
                _originChainId,
                eventHash,
                _eventsProof,
                _eventsPaths,
                _stateProofBitmap,
                _stateProof
            ), 
            "EVENT_NOT_FOUND"
        );

        BridgedToken bridgeToken = BridgedToken(getOrCreateBridgedToken(_token, _originChainId, _originBridge));
        bridgeToken.mint(_receiver, _amount);

        emit BridgedMint(
            address(bridgeToken),
            _token, 
            _receiver, 
            _amount,
            _salt,
            _originChainId,
            _originBridge,
            eventHash
        );
    }

    function burnBridged(
        address _bridgeToken,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _targetChainId,
        address _targetBridge
    )
        public
    {
        BridgedToken bridgeToken = BridgedToken(_bridgeToken);
        bridgeToken.burn(msg.sender, _amount);

        BridgeContract storage bridgeContract = networks[_targetChainId].bridgeContracts[_targetBridge];
        address _originToken = bridgeContract.bridgedTokenToOrigin[_bridgeToken];

        bytes32 eventDataHash = hashEventData_BridgedBurn(
            _originToken,
            _receiver,
            _amount,
            _salt,
            _targetChainId,
            _targetBridge
        );

        bytes32 eventHash = eventEmitter.emitEvent(eventDataHash);

        emit BridgedBurn(
            address(bridgeToken),
            _originToken,
            _receiver,
            _amount,
            _salt,
            _targetChainId,
            _targetBridge,
            eventHash
        );
    }

    function withdraw(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _originChainId,
        address _originBridge,
        
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _stateProofBitmap,
        bytes memory _stateProof
    )
        public
    {
        bytes32 eventDataHash = hashEventData_BridgedBurn(
            _token,
            _receiver,
            _amount,
            _salt,
            eventEmitter.chainId(), 
            address(this)
        );

        bytes32 eventHash = LibEvent.getEventHash(eventDataHash, _originBridge, _originChainId);

        // make sure event was not processed
        _checkEventProcessed(eventHash);
        
        require(
            eventListener.checkEvent(
                _originChainId,
                eventHash,
                _eventsProof,
                _eventsPaths,
                _stateProofBitmap,
                _stateProof
            ), 
            "EVENT_NOT_FOUND"
        );

        // liamz: Stack too deep
        _withdraw1(
            _token,
            _receiver,
            _amount,
            _salt,
            _originChainId,
            _originBridge
        );

        emit Withdrawal(
            _token, 
            _receiver, 
            _amount,
            _salt,
            _originChainId,
            _originBridge,
            eventHash
        );
    }

    function _withdraw1(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _salt,
        uint256 _originChainId,
        address _originBridge
    )
        internal
    {
        BridgeContract storage bridgeContract = networks[_originChainId].bridgeContracts[_originBridge];

        ERC20 token = ERC20(_token);
        bridgeContract.tokenReserves[_token] = bridgeContract.tokenReserves[_token].sub(_amount);
        require(token.transfer(_receiver, _amount), "CLAIM_TRANSFER_FAILED");
    }

    function getOrCreateBridgedToken(
        address _originToken, 
        uint256 _originChainId, 
        address _originBridge
    ) 
        public
        returns (address bridgeToken) 
    { 
        // Check if the bridged token already exists
        bridgeToken = getBridgedToken(_originToken, _originChainId, _originBridge);  
        if(bridgeToken != address(0)){
            return bridgeToken;
        }

        // Else deploy bridged token
        bridgeToken = address(new BridgedToken());

        BridgeContract storage bridgeContract = networks[_originChainId].bridgeContracts[_originBridge];
        bridgeContract.bridgedTokenToOrigin[bridgeToken] = _originToken;
        bridgeContract.originTokenToBridged[_originToken] = bridgeToken;
    }

    function getBridgedToken(
        address _originToken, 
        uint256 _originChainId, 
        address _originBridge
    ) 
        public 
        view 
        returns (address) 
    {
        return networks[_originChainId].bridgeContracts[_originBridge].originTokenToBridged[_originToken];
    }

    function isBridgedToken(
        address _bridgedToken,
        uint256 _originChainId,
        address _originBridge
    )
        public
        view
        returns (bool)
    {
        return (networks[_originChainId].bridgeContracts[_originBridge].bridgedTokenToOrigin[_bridgedToken] != address(0));
    }
    

    function _checkEventProcessed(
        bytes32 eventHash
    ) 
        internal 
    {
        require(!processedEvents[eventHash], "EVENT_ALREADY_PROCESSED");
        processedEvents[eventHash] = true;
    }
}