import { HttpRpcClient, SimpleAccountAPI } from "@account-abstraction/sdk"
import { hexlify } from "@ethersproject/bytes"
import { JsonRpcSigner } from "@ethersproject/providers"
import { toUtf8Bytes } from "@ethersproject/strings"
import { expect } from "chai"
import { ethers } from "hardhat"

import { BUNDLER_URL, ENTRYPOINT_ADDRESS } from "~/config"
import { ERC20Mintable, Paymaster } from "~/typechain-types"

function wrapGethSigner(signer: JsonRpcSigner) {
    signer["signMessage"] = async function (message) {
        const data =
            typeof message === "string" ? toUtf8Bytes(message) : message
        const address = await this.getAddress()
        return await this.provider.send("personal_sign", [
            hexlify(data),
            address.toLowerCase(),
            "",
        ])
    }
    return signer
}

describe("Bundler", () => {
    let account: SimpleAccountAPI
    let bundler: HttpRpcClient
    let paymaster: Paymaster
    let token: ERC20Mintable

    before(async () => {
        console.log("entry point address:", ENTRYPOINT_ADDRESS)

        const signer = wrapGethSigner(ethers.provider.getSigner())

        bundler = new HttpRpcClient(
            BUNDLER_URL,
            ENTRYPOINT_ADDRESS,
            (await ethers.provider.getNetwork()).chainId,
        )

        const accountFactory = await ethers.getContractFactory("Account")
        const accountContract = await accountFactory
            .connect(signer)
            .deploy(ENTRYPOINT_ADDRESS)
        account = new SimpleAccountAPI({
            provider: ethers.provider,
            entryPointAddress: ENTRYPOINT_ADDRESS,
            accountAddress: accountContract.address,
            owner: signer,
        })
        console.log("account address:", await account.getAccountAddress())

        // Topup account balance
        await signer.sendTransaction({
            to: await account.getAccountAddress(),
            value: ethers.utils.parseEther("0.1"),
        })

        const paymasterFactory = await ethers.getContractFactory("Paymaster")
        paymaster = await paymasterFactory
            .connect(signer)
            .deploy(ENTRYPOINT_ADDRESS)
        console.log("paymaster address:", paymaster.address)

        // Deposit for paymaster to entry point
        await paymaster
            .connect(signer)
            .deposit({ value: ethers.utils.parseEther("0.1") })

        // Stake for paymaster on entry point
        await paymaster.connect(signer).addStake(120, {
            value: ethers.utils.parseEther("0.1"),
        })

        const tokenFactory = await ethers.getContractFactory("ERC20Mintable")
        token = await tokenFactory.connect(signer).deploy("TKN", "TKN")
        console.log("token address:", token.address)

        // Mint token to account
        await token
            .connect(signer)
            .mint(account.getAccountAddress(), ethers.utils.parseEther("100"))

        // Approve paymaster to transfer account's token
        const op = await account.createSignedUserOp({
            target: token.address,
            data: token.interface.encodeFunctionData("approve", [
                paymaster.address,
                ethers.constants.MaxUint256,
            ]),
        })
        const opHash = await bundler.sendUserOpToBundler(op)
        const txHash = await account.getUserOpReceipt(opHash)
        await ethers.provider.getTransactionReceipt(txHash!)
    })

    it("should be able to mint token", async () => {
        const mintAmount = ethers.utils.parseEther("100")

        const balanceBefore = await token.balanceOf(account.getAccountAddress())

        let op = await account.createUnsignedUserOp({
            target: token.address,
            data: token.interface.encodeFunctionData("mint", [
                await account.getAccountAddress(),
                mintAmount.toString(),
            ]),
        })
        op = await account.signUserOp(op)

        const opHash = await bundler.sendUserOpToBundler(op)
        console.log("op hash:", opHash)
        const txHash = await account.getUserOpReceipt(opHash)
        console.log("tx hash:", txHash)
        const receipt = await ethers.provider.getTransactionReceipt(txHash!)
        console.log("receipt:", receipt)

        const balanceAfter = await token.balanceOf(account.getAccountAddress())
        expect(balanceAfter.sub(balanceBefore)).to.equal(mintAmount)
    })

    it("should be able to pay by paymaster", async () => {
        const mintAmount = ethers.utils.parseEther("100")

        const ethBalanceBefore = await ethers.provider.getBalance(
            account.getAccountAddress(),
        )
        const tokenBalanceBefore = await token.balanceOf(
            account.getAccountAddress(),
        )

        let op = await account.createUnsignedUserOp({
            target: token.address,
            data: token.interface.encodeFunctionData("mint", [
                await account.getAccountAddress(),
                mintAmount.toString(),
            ]),
        })
        op.paymasterAndData = ethers.utils.solidityPack(
            ["address", "bytes"],
            [
                paymaster.address,
                ethers.utils.defaultAbiCoder.encode(
                    ["address"],
                    [token.address],
                ),
            ],
        )
        console.log("paymaster data", op.paymasterAndData)
        const { preVerificationGas, signature, ...partialOp } = op
        op.preVerificationGas = await account.getPreVerificationGas(partialOp)
        op = await account.signUserOp(op)

        const opHash = await bundler.sendUserOpToBundler(op)
        const txHash = await account.getUserOpReceipt(opHash)
        const receipt = await ethers.provider.getTransactionReceipt(txHash!)
        console.log("receipt:", receipt.logs)

        const ethBalanceAfter = await ethers.provider.getBalance(
            account.getAccountAddress(),
        )
        const tokenBalanceAfter = await token.balanceOf(
            account.getAccountAddress(),
        )
        expect(ethBalanceAfter).to.equal(ethBalanceBefore)
        expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.equal(mintAmount)
    })
})
