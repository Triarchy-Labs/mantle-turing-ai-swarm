// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DecisionVerifier} from "../src/DecisionVerifier.sol";

/**
 * @notice Deploys DecisionVerifier bound to the live v2 ERC-8004 registry on Mantle mainnet.
 *
 * Run (mainnet — costs gas, irreversible):
 *   forge script script/DeployVerifier.s.sol:DeployVerifier \
 *     --rpc-url https://rpc.mantle.xyz --broadcast --verify
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY  — deployer key (owner of the verifier)
 *   RISK_ORACLE_ADDRESS   — (optional) IRiskOracle for independent on-chain risk re-checks +
 *                           permissionless fraud proofs. If unset, the oracle gate is skipped
 *                           and executeIfVerified still enforces sig + risk-bound + expiry + nonce.
 */
contract DeployVerifier is Script {
    address constant REGISTRY = 0xEb271ece1aB2f72835556Ee67ad0BCA36a378a66;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracle = vm.envOr("RISK_ORACLE_ADDRESS", address(0));

        vm.startBroadcast(pk);

        DecisionVerifier verifier = new DecisionVerifier(REGISTRY);
        console.log("DecisionVerifier deployed at:", address(verifier));
        console.log("Bound to registry:", REGISTRY);

        if (oracle != address(0)) {
            verifier.setRiskOracle(oracle);
            console.log("Risk oracle set to:", oracle);
        } else {
            console.log("No risk oracle (sig + risk-bound + expiry + nonce still enforced).");
        }

        vm.stopBroadcast();
    }
}
