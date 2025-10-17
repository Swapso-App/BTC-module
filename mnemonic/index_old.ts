import crypto from "crypto";
import * as bip39 from "bip39";

async function generateMnemonic() {
  const mnemonic = bip39.generateMnemonic();
  return mnemonic;
}

export const encryptMnemonic = async () => {
  const mnemonic = await generateMnemonic();
  const ENCRYPTION_SECRET = Buffer.from(
    process.env.ENCRYPTION_SECRET!,
    "base64"
  );

  if (ENCRYPTION_SECRET.length !== 32) {
    throw new Error(
      "ENCRYPTION_SECRET must be a 256-bit key (32 bytes in base64)."
    );
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_SECRET, iv);

  const encrypted = Buffer.concat([
    cipher.update(mnemonic, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedMnemonic: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
};

export const decryptMnemonic = (encryptedData: {
  encryptedMnemonic: string;
  iv: string;
  authTag: string;
}) => {
  if (!encryptedData || typeof encryptedData !== "object") {
    throw new Error("Invalid encrypted data object");
  }

  const { encryptedMnemonic, iv, authTag } = encryptedData;

  if (!encryptedMnemonic || !iv || !authTag) {
    throw new Error("Missing required encryption fields");
  }

  const ENCRYPTION_SECRET = Buffer.from(
    process.env.ENCRYPTION_SECRET!,
    "base64"
  );

  if (ENCRYPTION_SECRET.length !== 32) {
    throw new Error(
      "ENCRYPTION_SECRET must be a 256-bit key (32 bytes in base64)."
    );
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      ENCRYPTION_SECRET,
      Buffer.from(iv, "base64")
    );

    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedMnemonic, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};
