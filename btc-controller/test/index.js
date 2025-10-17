var assert = require('assert');
const bitcoinMessage = require('bitcoinjs-message')
const { KeyringController: Bitcoin, getBalance } = require('../src/index')
const {
    HD_WALLET_12_MNEMONIC,
    TEST_ADDRESS_1,
    TEST_ADDRESS_2,
    HD_WALLET_12_MNEMONIC_TEST_OTHER,
    EXTERNAL_ACCOUNT_PRIVATE_KEY,
    EXTERNAL_ACCOUNT_ADDRESS,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_1,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_2,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_3,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_4,
    TESTING_MESSAGE_1,
    TESTING_MESSAGE_2,
    TESTING_MESSAGE_3,
    BITCOIN_NETWORK: {
        TESTNET,
        MAINNET
    },
    TRANSFER_BTC: {
        BTC_AMOUNT,
        BTC_RECEIVER
    }
} = require('./constants')

const BTC_TXN_PARAM = {
    to: BTC_RECEIVER,
    amount: BTC_AMOUNT,
}

const opts = {
    mnemonic: HD_WALLET_12_MNEMONIC,
    network: TESTNET
}

describe('Initialize wallet ', () => {
    const bitcoinWallet = new Bitcoin(opts)

    it("Should generate new address ", async () => {
        const wallet = await bitcoinWallet.addAccount()
        assert(wallet.address === TEST_ADDRESS_1, "Added address should be " + TEST_ADDRESS_1)
        const wallet2 = await bitcoinWallet.addAccount()
        assert(wallet2.address === TEST_ADDRESS_2, "Added address should be " + TEST_ADDRESS_2)
    })

    it("Should get accounts", async () => {
        const acc = await bitcoinWallet.getAccounts()
        assert(acc.length === 2, "Should have 2 addresses")
    })

    it("Should get privateKey ", async () => {
        const acc = await bitcoinWallet.getAccounts()
        const result = await bitcoinWallet.exportPrivateKey(acc[0])
        assert(result.privateKey)
    })

    it("Sign message", async () => {
        const acc = await bitcoinWallet.getAccounts()

        const signedMessage1 = await bitcoinWallet.signMessage(TESTING_MESSAGE_1, acc[0])
        assert(bitcoinMessage.verify(TESTING_MESSAGE_1, acc[0], signedMessage1.signedMessage), "Should verify message 1")

        const signedMessage2 = await bitcoinWallet.signMessage(TESTING_MESSAGE_2, acc[0])
        assert(bitcoinMessage.verify(TESTING_MESSAGE_2, acc[0], signedMessage2.signedMessage), "Should verify message 2")

        const signedMessage3 = await bitcoinWallet.signMessage(TESTING_MESSAGE_3, acc[0])
        assert(bitcoinMessage.verify(TESTING_MESSAGE_3, acc[0], signedMessage3.signedMessage), "Should verify message 3")
    })

    it("Get fees, invalid argument", async () => {
        try {
            const acc = await bitcoinWallet.getAccounts()
            const result = await bitcoinWallet.getFees(acc[0]);
        } catch (err) {
            assert.equal(err.message, "Request failed with status code 404", "Should throw 404 error")
        }
        
    })

    it("Get fees, valid argument", async () => {
        const acc = await bitcoinWallet.getAccounts()
        BTC_TXN_PARAM['from'] = acc[0]
        
        const response = await bitcoinWallet.getFees(BTC_TXN_PARAM)
        let actualResponse = Object.keys(response)
        let expectedResponse = ['transactionSize', 'fees']
        assert.deepEqual(actualResponse, expectedResponse, "Should have transactionSize and fees")

        let satPerByte = Object.keys(response.fees);
        let expected = [ 'slow', 'standard', 'fast' ]
        assert.deepEqual(satPerByte, expected, "Should have slow, standard, fast fees")
    })

    it("Sign Transaction using estimated fee", async () => {
        const acc = await bitcoinWallet.getAccounts()
        BTC_TXN_PARAM['from'] = acc[0]

        let response = await bitcoinWallet.getFees(BTC_TXN_PARAM)
        BTC_TXN_PARAM['satPerByte'] = response.fees.slow.satPerByte
        const { signedTransaction } = await bitcoinWallet.signTransaction(BTC_TXN_PARAM);
        assert(signedTransaction)
    })

    it("Sign Transaction should fail and throw error", async () => {
        try {
            const acc = await bitcoinWallet.getAccounts()
            BTC_TXN_PARAM['from'] = acc[0]
            const { signedTransaction } = await bitcoinWallet.signTransaction(BTC_TXN_PARAM);
        } catch (err) {
            assert(err.message)
        }
    })

    it("Sign Transaction custom satPerByte", async () => {
        const acc = await bitcoinWallet.getAccounts()
        BTC_TXN_PARAM['from'] = acc[0]
        BTC_TXN_PARAM['satPerByte'] = 15
        const { signedTransaction } = await bitcoinWallet.signTransaction(BTC_TXN_PARAM);
        assert(signedTransaction)
    })

    it("Should import correct account ", async () => {
       
        const address = await bitcoinWallet.importWallet(EXTERNAL_ACCOUNT_PRIVATE_KEY)
        assert(address.toLowerCase() === EXTERNAL_ACCOUNT_ADDRESS.toLowerCase(), "Wrong address")
        
        assert(bitcoinWallet.importedWallets.length === 1, "Should have 1 imported wallet")
    })

    it("Should get balance of the address ", async () => {
        const acc = await bitcoinWallet.getAccounts()
        const result = await getBalance(acc[0], opts.network)
        assert(result.balance)
    })

})