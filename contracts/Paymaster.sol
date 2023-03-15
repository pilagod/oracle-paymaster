// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import { BasePaymaster } from "@account-abstraction/contracts/core/BasePaymaster.sol";
import { IEntryPoint } from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { UserOperation, UserOperationLib } from "@account-abstraction/contracts/interfaces/UserOperation.sol";

contract Paymaster is BasePaymaster {
    using UserOperationLib for UserOperation;

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    )
        internal
        pure
        override
        returns (bytes memory context, uint256 validationData)
    {
        (userOp, userOpHash, maxCost);
        return (bytes(""), 0);
    }

    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal pure override {
        (mode, context, actualGasCost); // unused params
    }
}
