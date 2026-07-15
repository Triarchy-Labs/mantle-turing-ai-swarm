// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DecisionAttestor} from "../src/DecisionAttestor.sol";

/**
 * @notice Deploys DecisionAttestor bound to the live v2 ERC-8004 registry on Mantle mainnet.
 *
 * Run (mainnet — costs gas, irreversible):
 *   forge script script/DeployAttestor.s.sol:DeployAttestor \
 *     --rpc-url https://rpc.mantle.xyz --broadcast --verify
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY  — deployer/agent-controller key (owner of the new attestor)
 *   SETTLER_ADDRESS       — (optional) distinct address allowed to settle realized PnL.
 *                           MUST differ from the agent controller, else settlement reverts
 *                           (self-rating blocked). If unset, settler is left at 0x0 and
 *                           verdicts still record fine; set it later via setSettler().
 */
contract DeployAttestor is Script {
    // Live v2 ERC-8004 registry (Sourcify-verified) — see contracts/broadcast/run-latest.json
    address constant REGISTRY = 0xEb271ece1aB2f72835556Ee67ad0BCA36a378a66;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address settler = vm.envOr("SETTLER_ADDRESS", address(0));

        vm.startBroadcast(pk);

        DecisionAttestor attestor = new DecisionAttestor(REGISTRY);
        console.log("DecisionAttestor deployed at:", address(attestor));
        console.log("Bound to registry:", REGISTRY);

        if (settler != address(0)) {
            attestor.setSettler(settler);
            console.log("Settler set to:", settler);
        } else {
            console.log("Settler unset (set later via setSettler); verdict recording works regardless.");
        }

        vm.stopBroadcast();
    }
}
