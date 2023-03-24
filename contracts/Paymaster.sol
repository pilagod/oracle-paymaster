// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import { BasePaymaster } from "@account-abstraction/contracts/core/BasePaymaster.sol";
import { IEntryPoint } from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { UserOperation, UserOperationLib } from "@account-abstraction/contracts/interfaces/UserOperation.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ERC20Mintable } from "./token/ERC20Mintable.sol";

contract Paymaster is BasePaymaster {
    event Log(address indexed paymaster, bytes indexed data, bytes indexed context);
    event LogPostOp(bytes indexed context);
    event LogGas(uint256 indexed gas);

    using UserOperationLib for UserOperation;

    uint256 count = 0;

    uint256 lastBalance = 0;
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
        (userOp, userOpHash, maxCost);

        address paymaster = address(bytes20(userOp.paymasterAndData[:20]));
        bytes memory data = userOp.paymasterAndData[20:];

        address token = abi.decode(data, (address));

        // [Error] unstaked paymaster accessed 0x7aedf613f6865fb7d74147768757b66c1bd7fbdc slot 0x8a1c82de58ad310be7c440d8bd60d39c7347bb7953c619d869bdf592c973e5bf
        // [Pass] after paymaster stake > MIN_STAKE_VALUE (configured by bundler)
        // count += 1;

        // [Pass] no matter stake or not
        uint256 balance = IERC20(token).balanceOf(userOp.sender);

        // [Error] unstaked paymaster accessed 0x7aedf613f6865fb7d74147768757b66c1bd7fbdc slot 0x8a1c82de58ad310be7c440d8bd60d39c7347bb7953c619d869bdf592c973e5bf
        // [Pass] after paymaster stake > MIN_STAKE_VALUE (configured by bundler)
        // IERC20(token).balanceOf(address(this));
        // IERC20(token).transferFrom(userOp.sender, address(this), 1);

        // [Error] paymaster has forbidden read from 0x7fd7e7cb7b54abced3183cc7a78ea7be78b49eec slot 0x7ce134a961d78589dec823a6f536bb188e0713eab16baf472e1020b44cb6554a
        // IERC20(token).balanceOf(address(entryPoint));

        // [Error] paymaster uses banned op code: SELFBALANCE
        // lastBalance = address(this).balance;

        // [Error] paymaster uses banned op code: NUMBER
        // lastBlockNumber = block.number;

        // [Error] paymaster uses banned op code: TIMESTAMP
        // lastBlockTimestamp = block.timestamp;

        // [Error] paymaster uses banned op code: GASPRICE
        // lastGasPrice = tx.gasprice;

        // [Error] paymaster uses banned op code: GAS
        // lastGasLeft = gasleft();

        // [Error] paymaster uses banned op code: NUMBER
        //   * when update return values (context, validationData) afterward
        //   * when update storage afterward
        //   * when if block contains revert/return statement
        // [Pass] otherwise the op codes will pass
        // uint256 blockNumber = block.number;
        // if (block.number > 10000) {
        //     revert("reason");
        // }
        // if (block.number > 10000) {
        //     return (bytes(""), 0);
        // }

        context = abi.encode(userOp.sender, token);

        emit Log(paymaster, data, context);
    }

    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        (mode, context, actualGasCost); // unused params

        emit LogPostOp(context);

        (address sender, address token) = abi.decode(context, (address, address));

        // [Error] i = 78, gas left not enough, which causes bundler go into dead loop
        // i = 77, gas left = 0x736 = 1846
        // for (uint i = 0; i < 77; i++) {
        //     emit LogGas(gasleft());
        // }

        // [Pass]
        // count += 1;
        // lastBalance = address(this).balance;
        // lastBlockNumber = block.number;
        // lastBlockTimestamp = block.timestamp;

        // [Pass]
        // uint256 balance = IERC20(token).balanceOf(sender);
        // IERC20(token).transferFrom(sender, address(this), 1);
        // IERC20(token).transfer(sender, 1);

        // [Pass]
        // address other = address(uint160(123));
        // IERC20(token).balanceOf(address(other));
        // ERC20Mintable(token).mint(other, 100);

        // [Pass]
        // if (block.number > 10000) {
        //     revert("reason");
        // }
        // if (block.number > 10000) {
        //     return;
        // }
    }
}
