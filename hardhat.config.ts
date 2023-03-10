import "dotenv/config"
import "tsconfig-paths/register"

import "hardhat-gas-reporter"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan"
import "@nomicfoundation/hardhat-chai-matchers"
import "@typechain/hardhat"

import chai from "chai"
import chaiAsPromised from "chai-as-promised"
chai.use(chaiAsPromised)

const accounts = [process.env.OPERATOR_PRIVATE_KEY]

module.exports = {
    networks: {},
    solidity: {
        compilers: [
            {
                version: "0.8.7",
                settings: {
                    optimizer: {
                        enabled: true,
                    },
                },
            },
        ],
    },
    mocha: {
        timeout: 60000,
    },
}
