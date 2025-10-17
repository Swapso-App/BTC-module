# btc-controller<code><a href="https://www.docker.com/" target="_blank"><img height="50" src="https://bitcoin.org/img/icons/logotop.svg?1700824099"></a></code>

## Initialize the Bitcoin Controller class

```

const bitcoinController = new KeyringController({
    // 12 words mnemonic to create wallet
    mnemonic: string,
    // network - type of network [TESTNET|MAINNET]
    // default is MAINNET even if no network is passed
    network: string (TESTNET | MAINNET)
});
```

## Methods

### Generate Keyring with 1 account or add new account

```
const keyringState = await bitcoinController.addAccount();
```

### Export the private key of an address present in the keyring

```
const privateKey = await bitcoinController.exportPrivateKey(address);
```

### Get all accounts in the keyring

```
const privateKey = await bitcoinController.getAccounts();
```

### Sign a transaction

```
const signedTx = await bitcoinController.signTransaction(bitcoinTx);

bitcoinTx: {from, to, amount, satPerByt}
```

### Sign a message

```
const signedMsg = await bitcoinController.signMessage(msgString, address);
```

### Get fees

```
const fees = await bitcoinController.getFees(rawTransaction);
```

### Get balance

```
const balance = await getBalance(address, network); // if network !== TESTNET then it will fetch mainnet balance
```
