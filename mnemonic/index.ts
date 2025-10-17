import crypto from "crypto";
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";
import * as bip39 from "bip39";

const kmsClient = new KMSClient({
  region: process.env.WALLET_KMS_AWS_REGION,
  credentials: {
    accessKeyId: process.env.WALLET_KMS_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.WALLET_KMS_AWS_SECRET_ACCESS_KEY,
  },
});

const KMS_KEY_ID = process.env.WALLET_KMS_KEY_ID;

/**
 * NEW FORMAT: Encrypt with KMS for new wallets
 */
export const encryptMnemonic = async () => {

  const dataKeyResponse = await kmsClient.send(
    new GenerateDataKeyCommand({
      KeyId: KMS_KEY_ID,
      KeySpec: "AES_256",
    })
  );

  const plaintextKey = dataKeyResponse.Plaintext;
  const encryptedDataKey = dataKeyResponse.CiphertextBlob;

  const mnemonic = bip39.generateMnemonic();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", plaintextKey!, iv);

  const encrypted = Buffer.concat([
    cipher.update(mnemonic, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedMnemonic: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    encryptedDataKey: Buffer.from(encryptedDataKey!).toString("base64"),
  };
};

/**
 * BACKWARDS COMPATIBLE: Works with old data (no encryptedDataKey) AND new data (with encryptedDataKey)
 * Old wallets use the legacy ENCRYPTION_SECRET key
 * New wallets use AWS KMS
 */
export const decryptMnemonic = async (encryptedData: {
  encryptedMnemonic: string;
  iv: string;
  authTag: string;
  encryptedDataKey?: string;
}) => {
  if (!encryptedData || typeof encryptedData !== "object") {
    throw new Error("Invalid encrypted data object");
  }

  const { encryptedMnemonic, iv, authTag, encryptedDataKey } = encryptedData;

  if (!encryptedMnemonic || !iv || !authTag || !encryptedDataKey) {
    throw new Error("Missing required encryption fields");
  }

  try {
    let plaintextKey: Buffer;

    const decryptResponse = await kmsClient.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(encryptedDataKey, "base64"),
      })
    );

    plaintextKey = Buffer.from(decryptResponse.Plaintext!);

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      plaintextKey,
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedMnemonic, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error: any) {
    console.error("Decryption error:", error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
};