// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title OuroborosBond
 * @notice Skin-in-the-game for an autonomous agent. An operator stakes a bond behind an agent id;
 *         when DecisionVerifier proves a verdict fraudulent (agent under-reported risk), the
 *         verifier calls `onViolation`, which slashes part of the bond — rewarding the challenger
 *         who caught it and sending the rest to the treasury.
 *
 * @dev This is the accountability layer behind the $OUROBOROS idea: the token/bond is not a meme,
 *      it is a slashable guarantee tied to the on-chain fraud proof in DecisionVerifier. No Turing
 *      Test 2026 finalist tied an economic bond to a permissionless fraud proof like this.
 *      Bonds are held in native MNT for simplicity; the same shape works for an ERC-20 $OUROBOROS.
 */
contract OuroborosBond is Ownable {
    /// @notice The only address allowed to trigger a slash (the DecisionVerifier).
    address public verifier;
    /// @notice Where the non-reward portion of a slash goes.
    address public treasury;

    /// @notice Fraction of the remaining bond slashed per proven violation (basis points).
    uint256 public slashBps = 5000;      // 50%
    /// @notice Fraction of the slashed amount paid to the challenger (basis points).
    uint256 public challengerBps = 5000; // 50% of the slash

    mapping(uint256 => uint256) public bondOf;   // agentId => staked amount
    mapping(uint256 => address) public stakerOf; // agentId => who may withdraw

    uint256 private _locked = 1;

    event Staked(uint256 indexed agentId, address indexed staker, uint256 amount, uint256 newBond);
    event Withdrawn(uint256 indexed agentId, address indexed staker, uint256 amount, uint256 newBond);
    event Slashed(uint256 indexed agentId, uint256 slashed, address indexed challenger, uint256 challengerReward, uint256 toTreasury, uint256 newBond);
    event VerifierUpdated(address indexed verifier);
    event TreasuryUpdated(address indexed treasury);
    event ParamsUpdated(uint256 slashBps, uint256 challengerBps);

    modifier nonReentrant() {
        require(_locked == 1, "reentrant");
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address treasury_) Ownable(msg.sender) {
        require(treasury_ != address(0), "treasury=0");
        treasury = treasury_;
    }

    function setVerifier(address verifier_) external onlyOwner {
        verifier = verifier_;
        emit VerifierUpdated(verifier_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "treasury=0");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setParams(uint256 slashBps_, uint256 challengerBps_) external onlyOwner {
        require(slashBps_ <= 10000 && challengerBps_ <= 10000, "bps>100%");
        slashBps = slashBps_;
        challengerBps = challengerBps_;
        emit ParamsUpdated(slashBps_, challengerBps_);
    }

    /// @notice Stake (or top up) a bond behind an agent. The first staker owns the withdrawal right.
    function stake(uint256 agentId) external payable {
        require(msg.value > 0, "no value");
        address s = stakerOf[agentId];
        require(s == address(0) || s == msg.sender, "not staker");
        if (s == address(0)) stakerOf[agentId] = msg.sender;
        bondOf[agentId] += msg.value;
        emit Staked(agentId, msg.sender, msg.value, bondOf[agentId]);
    }

    /// @notice Withdraw unslashed bond. Only the original staker.
    function withdraw(uint256 agentId, uint256 amount) external nonReentrant {
        require(msg.sender == stakerOf[agentId], "not staker");
        require(amount > 0 && amount <= bondOf[agentId], "bad amount");
        bondOf[agentId] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(agentId, msg.sender, amount, bondOf[agentId]);
    }

    /// @notice Slash on a proven violation. Only callable by the wired DecisionVerifier.
    function onViolation(uint256 agentId, address challenger) external nonReentrant {
        require(msg.sender == verifier, "not verifier");
        uint256 bond = bondOf[agentId];
        if (bond == 0) {
            emit Slashed(agentId, 0, challenger, 0, 0, 0);
            return;
        }
        uint256 slashAmt = (bond * slashBps) / 10000;
        bondOf[agentId] = bond - slashAmt;

        uint256 reward = (slashAmt * challengerBps) / 10000;
        uint256 toTreasury = slashAmt - reward;

        if (reward > 0 && challenger != address(0)) {
            (bool r, ) = challenger.call{value: reward}("");
            require(r, "reward failed");
        } else {
            toTreasury += reward; // no challenger -> all to treasury
        }
        if (toTreasury > 0) {
            (bool t, ) = treasury.call{value: toTreasury}("");
            require(t, "treasury failed");
        }
        emit Slashed(agentId, slashAmt, challenger, reward, toTreasury, bondOf[agentId]);
    }
}
