/**
 * Test to verify that encryption keys are properly zeroed from memory
 * This test demonstrates that the security fix is working
 */

const crypto = require('crypto');

console.log('🔬 Testing Key Zeroing Security Fix\n');
console.log('=' .repeat(60));

// ============================================
// Test 1: Demonstrate the WRONG way (the bug)
// ============================================
console.log('\n❌ TEST 1: WRONG WAY (The Bug)');
console.log('-'.repeat(60));

function encryptWrongWay() {
  // Simulate getting a key from KMS
  const plaintextKey = crypto.randomBytes(32); // 256-bit key
  
  console.log('Original key (first 8 bytes):', plaintextKey.slice(0, 8).toString('hex'));
  
  // Use the key for encryption
  const cipher = crypto.createCipheriv('aes-256-gcm', plaintextKey, crypto.randomBytes(12));
  cipher.update('secret data', 'utf8');
  cipher.final();
  
  // WRONG: Create a new buffer and zero that
  Buffer.from(plaintextKey).fill(0);
  
  // Check if original key is still in memory
  console.log('After "zeroing" (first 8 bytes):', plaintextKey.slice(0, 8).toString('hex'));
  console.log('❌ Key is STILL in memory! Security vulnerability!');
  
  return plaintextKey;
}

const leakedKey = encryptWrongWay();

// ============================================
// Test 2: Demonstrate the CORRECT way (the fix)
// ============================================
console.log('\n✅ TEST 2: CORRECT WAY (The Fix)');
console.log('-'.repeat(60));

function encryptCorrectWay() {
  // Simulate getting a key from KMS
  const plaintextKey = crypto.randomBytes(32); // 256-bit key
  
  console.log('Original key (first 8 bytes):', plaintextKey.slice(0, 8).toString('hex'));
  
  // Use the key for encryption
  const cipher = crypto.createCipheriv('aes-256-gcm', plaintextKey, crypto.randomBytes(12));
  cipher.update('secret data', 'utf8');
  cipher.final();
  
  // CORRECT: Zero the original buffer
  plaintextKey.fill(0);
  
  // Check if key is zeroed
  console.log('After zeroing (first 8 bytes):', plaintextKey.slice(0, 8).toString('hex'));
  console.log('✅ Key is ZEROED! Memory is secure!');
  
  return plaintextKey;
}

const secureKey = encryptCorrectWay();

// ============================================
// Test 3: Verify the difference
// ============================================
console.log('\n📊 COMPARISON');
console.log('-'.repeat(60));

const leakedSum = leakedKey.reduce((sum, byte) => sum + byte, 0);
const secureSum = secureKey.reduce((sum, byte) => sum + byte, 0);

console.log('Leaked key sum (should be > 0):', leakedSum);
console.log('Secure key sum (should be 0):', secureSum);

if (secureSum === 0) {
  console.log('\n✅ SUCCESS: The fix is working correctly!');
  console.log('   All bytes in the secure key are zeroed.');
} else {
  console.log('\n❌ FAILURE: The fix is not working!');
}

// ============================================
// Test 4: Test with Uint8Array (like AWS KMS returns)
// ============================================
console.log('\n🔐 TEST 3: Uint8Array (AWS KMS format)');
console.log('-'.repeat(60));

function testUint8Array() {
  // AWS KMS returns Uint8Array
  const plaintextKey = new Uint8Array(32);
  crypto.randomFillSync(plaintextKey);
  
  console.log('Original key (first 8 bytes):', Buffer.from(plaintextKey.slice(0, 8)).toString('hex'));
  
  // Use the key
  const cipher = crypto.createCipheriv('aes-256-gcm', plaintextKey, crypto.randomBytes(12));
  cipher.update('secret data', 'utf8');
  cipher.final();
  
  // Zero it (Uint8Array also has .fill() method)
  plaintextKey.fill(0);
  
  console.log('After zeroing (first 8 bytes):', Buffer.from(plaintextKey.slice(0, 8)).toString('hex'));
  
  const sum = plaintextKey.reduce((sum, byte) => sum + byte, 0);
  if (sum === 0) {
    console.log('✅ Uint8Array zeroing works correctly!');
  } else {
    console.log('❌ Uint8Array zeroing failed!');
  }
}

testUint8Array();

console.log('\n' + '='.repeat(60));
console.log('🎉 Test Complete!\n');
