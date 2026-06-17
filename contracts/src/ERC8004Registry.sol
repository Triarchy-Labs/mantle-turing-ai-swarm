// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/Base64.sol";
import "openzeppelin-contracts/contracts/utils/Strings.sol";

/**
 * @title Sovereign ERC-8004 Agent Identity Registry
 * @dev Implementation of the ERC-8004 standard for Autonomous AI Agents.
 * Maps an agent's on-chain wallet to a persistent verifiable identity NFT.
 * Fully on-chain metadata generation with dynamic reputation attributes.
 */
contract ERC8004Registry is ERC721, Ownable {
    using Strings for uint256;
    using Strings for address;

    uint256 private _nextTokenId;

    string public constant IMAGE_URI = "https://raw.githubusercontent.com/Triarchy-Labs/mantle-turing-ai-swarm/main/contracts/assets/agent-nft.png";

    // Mapping from agent token ID to the controlling EOA/Contract
    mapping(uint256 => address) public agentControllers;

    // Mapping from agent token ID to reputation score (based on successful on-chain inferences)
    mapping(uint256 => uint256) public agentReputation;

    event AgentRegistered(uint256 indexed agentId, address indexed controller);
    event ReputationUpdated(uint256 indexed agentId, uint256 newReputation);

    constructor() ERC721("Trustless Agent Identity", "ERC8004") Ownable(msg.sender) {}

    /**
     * @notice Register a new AI Agent identity.
     * @param controller The address that will sign transactions for this agent.
     * @return agentId The newly minted ERC-8004 token ID.
     */
    function registerAgent(address controller) external onlyOwner returns (uint256 agentId) {
        agentId = ++_nextTokenId;
        _mint(controller, agentId);
        agentControllers[agentId] = controller;
        
        emit AgentRegistered(agentId, controller);
    }

    /**
     * @notice Update agent's reputation based on execution success.
     * @param agentId The ID of the agent.
     * @param scoreDelta The amount of reputation to add.
     */
    function addReputation(uint256 agentId, uint256 scoreDelta) external onlyOwner {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        
        agentReputation[agentId] += scoreDelta;
        emit ReputationUpdated(agentId, agentReputation[agentId]);
    }

    /**
     * @notice Returns fully on-chain JSON metadata for the agent NFT.
     * @dev Encodes name, description, image, and dynamic attributes (reputation, controller).
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory json = string(
            abi.encodePacked(
                '{"name":"Turing Agent #', tokenId.toString(),
                '","description":"Sovereign ERC-8004 Trustless AI Agent Identity on Mantle. This NFT represents a verifiable on-chain identity for an autonomous AI agent capable of executing flash liquidations and DeFi operations.",',
                '"image":"', IMAGE_URI, '",',
                '"attributes":[',
                    '{"trait_type":"Reputation","value":', agentReputation[tokenId].toString(), '},',
                    '{"trait_type":"Controller","value":"', agentControllers[tokenId].toHexString(), '"},',
                    '{"trait_type":"Network","value":"Mantle"},',
                    '{"trait_type":"Standard","value":"ERC-8004"}',
                ']}'
            )
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        // ERC-8004 interface ID (example: 0x80048004) - adjust if standard defines a specific one
        return interfaceId == bytes4(0x80048004) || super.supportsInterface(interfaceId);
    }
}
