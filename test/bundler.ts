import { HttpRpcClient, SimpleAccountAPI } from "@account-abstraction/sdk"
import { hexlify } from "@ethersproject/bytes"
import { JsonRpcSigner } from "@ethersproject/providers"
import { toUtf8Bytes } from "@ethersproject/strings"
import { expect } from "chai"
import { ethers } from "hardhat"

import { BUNDLER_URL, ENTRYPOINT_ADDRESS } from "~/config"
import { ERC20Mintable } from "~/typechain-types"

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
    let token: ERC20Mintable

    before(async () => {
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

        const tokenFactory = await ethers.getContractFactory("ERC20Mintable")
        token = await tokenFactory.connect(signer).deploy("TKN", "TKN")
        console.log("token address:", token.address)

        await signer.sendTransaction({
            to: await account.getAccountAddress(),
            value: ethers.utils.parseEther("0.01"),
        })
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
})
