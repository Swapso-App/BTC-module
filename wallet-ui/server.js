const Module = require("module");
const walletNodeModules = require("path").join(__dirname, "node_modules");

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  try {
    return origLoad.call(this, request, parent, isMain);
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      const resolved = require.resolve(request, { paths: [walletNodeModules] });
      return origLoad.call(this, resolved, parent, isMain);
    }
    throw err;
  }
};

const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const bip39 = require("bip39");
const axios = require("axios");

const { KeyringController } = require("../btc-controller/src/index");

const app = express();
const PORT = process.env.PORT || 0;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const walletStore = new Map();

function getWallet(walletId) {
  const entry = walletStore.get(walletId);
  if (!entry)
    throw new Error("Wallet not found. Create or restore a wallet first.");
  return entry;
}

const chainBackend = {
  getBaseUrl(networkType) {
    return networkType === "TESTNET"
      ? "https://blockstream.info/testnet/api"
      : "https://blockstream.info/api";
  },

  async getBalance(address, networkType) {
    const url = `${this.getBaseUrl(networkType)}/address/${address}`;
    const { data } = await axios.get(url);
    const confirmed =
      data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    const unconfirmed =
      data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
    return { confirmed, unconfirmed, total: confirmed + unconfirmed };
  },

  async getHistory(address, networkType) {
    const url = `${this.getBaseUrl(networkType)}/address/${address}/txs`;
    const { data } = await axios.get(url);
    return data.map((tx) => ({
      txid: tx.txid,
      confirmed: tx.status.confirmed,
      blockHeight: tx.status.block_height || null,
      blockTime: tx.status.block_time || null,
      fee: tx.fee,
      inputs: tx.vin.map((v) => ({
        address: v.prevout ? v.prevout.scriptpubkey_address : null,
        value: v.prevout ? v.prevout.value : 0,
      })),
      outputs: tx.vout.map((v) => ({
        address: v.scriptpubkey_address || null,
        value: v.value,
      })),
    }));
  },

  async getFeeEstimates(networkType) {
    const url = `${this.getBaseUrl(networkType)}/fee-estimates`;
    const { data } = await axios.get(url);
    return {
      slow: Math.ceil(data["6"] || 1),
      standard: Math.ceil(data["3"] || 2),
      fast: Math.ceil(data["1"] || 5),
    };
  },

  async broadcast(rawTx, networkType) {
    const url = `${this.getBaseUrl(networkType)}/tx`;
    const { data } = await axios.post(url, rawTx, {
      headers: { "Content-Type": "text/plain" },
    });
    return data;
  },
};

app.post("/api/wallet/create", async (req, res) => {
  try {
    const { network = "TESTNET" } = req.body;
    const mnemonic = bip39.generateMnemonic();
    const walletId = crypto.randomUUID();

    // Initialize KeyringController from btc-controller engine
    const controller = new KeyringController({ mnemonic, network });
    const { address } = await controller.addAccount();

    walletStore.set(walletId, { controller, networkType: network });

    res.json({
      walletId,
      mnemonic,
      address,
      network,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create wallet" });
  }
});

app.post("/api/wallet/restore", async (req, res) => {
  try {
    const { mnemonic, network = "TESTNET" } = req.body;

    if (!mnemonic || !bip39.validateMnemonic(mnemonic)) {
      return res.status(400).json({ error: "Invalid mnemonic phrase" });
    }

    const walletId = crypto.randomUUID();
    const controller = new KeyringController({ mnemonic, network });
    const { address } = await controller.addAccount();

    walletStore.set(walletId, { controller, networkType: network });

    res.json({ walletId, address, network });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to restore wallet" });
  }
});

app.post("/api/wallet/import-key", async (req, res) => {
  try {
    const { privateKey, network = "TESTNET" } = req.body;

    if (!privateKey) {
      return res.status(400).json({ error: "Private key is required" });
    }

    const walletId = crypto.randomUUID();
    const mnemonic = bip39.generateMnemonic();
    const controller = new KeyringController({ mnemonic, network });
    const address = await controller.importWallet(privateKey);

    walletStore.set(walletId, {
      controller,
      networkType: network,
      importedOnly: true,
    });

    res.json({ walletId, address, network });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to import key" });
  }
});

app.get("/api/wallet/:id/accounts", async (req, res) => {
  try {
    const { controller } = getWallet(req.params.id);
    const accounts = await controller.getAccounts();
    res.json({ accounts });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/wallet/:id/balance/:address", async (req, res) => {
  try {
    const { networkType } = getWallet(req.params.id);
    const balance = await chainBackend.getBalance(
      req.params.address,
      networkType,
    );
    res.json(balance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/wallet/:id/history/:address", async (req, res) => {
  try {
    const { networkType } = getWallet(req.params.id);
    const history = await chainBackend.getHistory(
      req.params.address,
      networkType,
    );
    res.json({ transactions: history });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/fees", async (req, res) => {
  try {
    const network = req.query.network || "TESTNET";
    const fees = await chainBackend.getFeeEstimates(network);
    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/wallet/:id/send", async (req, res) => {
  try {
    const { controller, networkType } = getWallet(req.params.id);
    const { from, to, amount, satPerByte } = req.body;

    if (!from || !to || !amount) {
      return res
        .status(400)
        .json({ error: "from, to, and amount are required" });
    }

    const { signedTransaction } = await controller.signTransaction({
      from,
      to,
      amount: Number(amount),
      satPerByte: Number(satPerByte) || undefined,
    });

    const txid = await chainBackend.broadcast(signedTransaction, networkType);

    res.json({ success: true, txid });
  } catch (err) {
    res.status(400).json({ error: err.message || "Transaction failed" });
  }
});

app.get("/api/wallet/:id/export/:address", async (req, res) => {
  try {
    if (process.env.ALLOW_PRIVATE_KEY_EXPORT !== "true") {
      return res.status(403).json({
        error:
          "Private key export is disabled. Set ALLOW_PRIVATE_KEY_EXPORT=true to enable.",
      });
    }

    const { controller } = getWallet(req.params.id);
    const { privateKey } = await controller.exportPrivateKey(
      req.params.address,
    );
    res.json({ privateKey });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = app.listen(PORT, () => {
  const actualPort = server.address().port;
  console.log(`\n  Swapso Wallet UI running at http://localhost:${actualPort}`);
  console.log(`  Network: Demo mode (Testnet by default)`);
  console.log(
    `  Private key export: ${process.env.ALLOW_PRIVATE_KEY_EXPORT === "true" ? "ENABLED" : "DISABLED"}\n`,
  );
});
