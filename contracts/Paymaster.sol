// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import { BasePaymaster } from "@account-abstraction/contracts/core/BasePaymaster.sol";
import { IEntryPoint } from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { UserOperation, UserOperationLib } from "@account-abstraction/contracts/interfaces/UserOperation.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Paymaster is BasePaymaster {
    event Log(address indexed paymaster, bytes indexed data);

    using UserOperationLib for UserOperation;

    uint256 lastBlockNumber = 0;
    uint256 lastBlockTimestamp = 0;
    uint256 lastGasPrice = 0;
    uint256 lastGasLeft = 0;

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        address paymaster = address(bytes20(userOp.paymasterAndData[:20]));
        bytes memory data = userOp.paymasterAndData[20:];
        emit Log(paymaster, data);

        address token = abi.decode(data, (address));

        // [Pass] no matter stake or not
        IERC20(token).balanceOf(userOp.sender);

        // [Error] unstaked paymaster accessed 0x7aedf613f6865fb7d74147768757b66c1bd7fbdc slot 0x8a1c82de58ad310be7c440d8bd60d39c7347bb7953c619d869bdf592c973e5bf
        // [Pass] after paymaster stake > MIN_STAKE_VALUE (configured by bundler)
        // IERC20(token).balanceOf(address(this));
        // IERC20(token).transferFrom(userOp.sender, address(this), 1);

        // [Error] paymaster has forbidden read from 0x7fd7e7cb7b54abced3183cc7a78ea7be78b49eec slot 0x7ce134a961d78589dec823a6f536bb188e0713eab16baf472e1020b44cb6554a
        // IERC20(token).balanceOf(address(entryPoint));

        // [Error] paymaster uses banned op code: NUMBER
        // lastBlockNumber = block.number;

        // [Error] paymaster uses banned op code: TIMESTAMP
        // lastBlockTimestamp = block.timestamp;

        // [Error] paymaster uses banned op code: GASPRICE
        // lastGasPrice = tx.gasprice;

        // [Error] paymaster uses banned op code: GAS
        // lastGasLeft = gasleft();

        // [Pass] but these can pass
        uint256 blockNumber = block.number;
        uint256 blockTimestamp = block.timestamp;
        uint256 gasPrice = tx.gasprice;
        uint256 gasLeft = gasleft();
        uint256 balance = address(this).balance;

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
