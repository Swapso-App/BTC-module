const API = '';

const state = {
  walletId: null,
  address: null,
  network: 'TESTNET',
  balance: { confirmed: 0, unconfirmed: 0, total: 0 },
  fees: { slow: 1, standard: 2, fast: 5 },
  selectedFee: 'slow',
};

const $ = (id) => document.getElementById(id);

const views = {
  onboarding: $('view-onboarding'),
  mnemonic: $('view-mnemonic'),
  dashboard: $('view-dashboard'),
  send: $('view-send'),
  receive: $('view-receive'),
};


function showView(name) {
  Object.values(views).forEach((v) => v.classList.add('hidden'));
  views[name].classList.remove('hidden');

  const header = $('main-header');
  if (name === 'onboarding' || name === 'mnemonic') {
    header.classList.add('hidden');
  } else {
    header.classList.remove('hidden');
  }
}

function showLoading(text = 'Loading...') {
  $('loading-text').textContent = text;
  $('loading').classList.remove('hidden');
}

function hideLoading() {
  $('loading').classList.add('hidden');
}

function showToast(message, type = 'info') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}


async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function createWallet() {
  showLoading('Creating wallet...');
  try {
    const network = $('select-network').value;
    const data = await api('POST', '/api/wallet/create', { network });

    state.walletId = data.walletId;
    state.address = data.address;
    state.network = data.network;

    displayMnemonic(data.mnemonic);
    showView('mnemonic');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function restoreWallet() {
  const mnemonic = $('input-mnemonic').value.trim();
  if (!mnemonic) return showToast('Enter your mnemonic phrase', 'error');

  showLoading('Restoring wallet...');
  try {
    const network = $('select-network').value;
    const data = await api('POST', '/api/wallet/restore', { mnemonic, network });

    state.walletId = data.walletId;
    state.address = data.address;
    state.network = data.network;

    enterDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function importKey() {
  const privateKey = $('input-private-key').value.trim();
  if (!privateKey) return showToast('Enter a private key', 'error');

  showLoading('Importing wallet...');
  try {
    const network = $('select-network').value;
    const data = await api('POST', '/api/wallet/import-key', { privateKey, network });

    state.walletId = data.walletId;
    state.address = data.address;
    state.network = data.network;

    enterDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function displayMnemonic(mnemonic) {
  const container = $('mnemonic-words');
  container.innerHTML = '';
  const words = mnemonic.split(' ');
  words.forEach((word, i) => {
    const div = document.createElement('div');
    div.className = 'mnemonic-word';
    div.innerHTML = `<span class="word-num">${i + 1}</span>${word}`;
    container.appendChild(div);
  });
}

function enterDashboard() {
  $('network-badge').textContent = state.network;
  $('wallet-address').textContent = truncateAddress(state.address);
  $('wallet-address').title = state.address + ' (click to copy)';
  showView('dashboard');
  refreshBalance();
  refreshHistory();
  refreshFees();
}

async function refreshBalance() {
  try {
    const data = await api('GET', `/api/wallet/${state.walletId}/balance/${state.address}`);
    state.balance = data;

    const btc = (data.confirmed / 1e8).toFixed(8);
    $('balance-btc').textContent = btc;
    $('balance-sats').textContent = `${data.confirmed.toLocaleString()} sats`;
  } catch (err) {
    console.error('Balance fetch failed:', err);
  }
}

async function refreshHistory() {
  try {
    const data = await api('GET', `/api/wallet/${state.walletId}/history/${state.address}`);
    renderTransactions(data.transactions);
  } catch (err) {
    console.error('History fetch failed:', err);
  }
}

async function refreshFees() {
  try {
    const data = await api('GET', `/api/fees?network=${state.network}`);
    state.fees = data;
    $('fee-slow').textContent = `~${data.slow} sat/vB`;
    $('fee-standard').textContent = `~${data.standard} sat/vB`;
    $('fee-fast').textContent = `~${data.fast} sat/vB`;
  } catch (err) {
    console.error('Fee fetch failed:', err);
  }
}

function renderTransactions(txs) {
  const container = $('tx-list');

  if (!txs || txs.length === 0) {
    container.innerHTML = '<div class="tx-empty">No transactions yet</div>';
    return;
  }

  container.innerHTML = txs.slice(0, 20).map((tx) => {
    const isIncoming = tx.outputs.some((o) => o.address === state.address) &&
                       !tx.inputs.some((i) => i.address === state.address);

    const amount = isIncoming
      ? tx.outputs.filter((o) => o.address === state.address).reduce((s, o) => s + o.value, 0)
      : tx.inputs.filter((i) => i.address === state.address).reduce((s, i) => s + i.value, 0);

    const amountBtc = (amount / 1e8).toFixed(8);
    const timeStr = tx.blockTime
      ? new Date(tx.blockTime * 1000).toLocaleDateString()
      : 'Pending';

    return `
      <div class="tx-item">
        <div class="tx-info">
          <div class="tx-id">${tx.txid}</div>
          <div class="tx-time">${timeStr}</div>
        </div>
        <div>
          <div class="tx-amount ${isIncoming ? 'incoming' : 'outgoing'}">
            ${isIncoming ? '+' : '-'}${amountBtc} BTC
          </div>
          <div class="tx-status ${tx.confirmed ? 'confirmed' : 'pending'}">
            ${tx.confirmed ? 'Confirmed' : 'Pending'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function sendTransaction() {
  const to = $('send-to').value.trim();
  const amount = parseInt($('send-amount').value, 10);

  let hasError = false;
  const toError = $('send-to-error');
  const amountError = $('send-amount-error');
  toError.classList.add('hidden');
  amountError.classList.add('hidden');

  if (!to) {
    toError.textContent = 'Recipient address is required';
    toError.classList.remove('hidden');
    hasError = true;
  }

  if (!amount || amount < 546) {
    amountError.textContent = 'Minimum amount is 546 satoshis (dust limit)';
    amountError.classList.remove('hidden');
    hasError = true;
  }

  if (amount > state.balance.confirmed) {
    amountError.textContent = 'Insufficient balance';
    amountError.classList.remove('hidden');
    hasError = true;
  }

  if (hasError) return;

  showLoading('Signing & broadcasting...');
  try {
    const satPerByte = state.fees[state.selectedFee];
    const data = await api('POST', `/api/wallet/${state.walletId}/send`, {
      from: state.address,
      to,
      amount,
      satPerByte,
    });

    showToast(`Transaction sent! TXID: ${data.txid.slice(0, 16)}...`, 'success');
    $('send-to').value = '';
    $('send-amount').value = '';
    showView('dashboard');
    refreshBalance();
    refreshHistory();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function showReceive() {
  $('receive-address').textContent = state.address;
  showView('receive');

  // Generate QR code
  const canvas = $('qr-canvas');
  if (typeof QRCode !== 'undefined') {
    QRCode.toCanvas(canvas, `bitcoin:${state.address}`, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }
}


async function exportPrivateKey() {
  showLoading('Exporting key...');
  try {
    const data = await api('GET', `/api/wallet/${state.walletId}/export/${state.address}`);
    $('exported-key').textContent = data.privateKey;
    $('export-result').classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}


function truncateAddress(addr) {
  if (!addr) return '';
  return addr.length > 20 ? `${addr.slice(0, 12)}...${addr.slice(-8)}` : addr;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function logout() {
  state.walletId = null;
  state.address = null;
  state.balance = { confirmed: 0, unconfirmed: 0, total: 0 };
  $('export-result').classList.add('hidden');
  $('restore-form').classList.add('hidden');
  $('import-form').classList.add('hidden');
  $('input-mnemonic').value = '';
  $('input-private-key').value = '';
  showView('onboarding');
}


$('btn-create').addEventListener('click', createWallet);

$('btn-show-restore').addEventListener('click', () => {
  $('restore-form').classList.toggle('hidden');
  $('import-form').classList.add('hidden');
});

$('btn-show-import').addEventListener('click', () => {
  $('import-form').classList.toggle('hidden');
  $('restore-form').classList.add('hidden');
});

$('btn-restore').addEventListener('click', restoreWallet);
$('btn-import').addEventListener('click', importKey);

// Mnemonic confirmation
$('mnemonic-confirm').addEventListener('change', (e) => {
  $('btn-mnemonic-continue').disabled = !e.target.checked;
});

$('btn-mnemonic-continue').addEventListener('click', enterDashboard);

// Dashboard
$('btn-send').addEventListener('click', () => {
  showView('send');
  refreshFees();
});
$('btn-receive').addEventListener('click', showReceive);
$('btn-refresh').addEventListener('click', () => {
  refreshBalance();
  refreshHistory();
  showToast('Refreshed', 'success');
});

$('wallet-address').addEventListener('click', () => {
  copyToClipboard(state.address);
});

$('btn-export-key').addEventListener('click', exportPrivateKey);
$('btn-copy-key').addEventListener('click', () => {
  copyToClipboard($('exported-key').textContent);
});

// Send view
$('btn-back-send').addEventListener('click', () => showView('dashboard'));
$('btn-confirm-send').addEventListener('click', sendTransaction);

// Fee selector
document.querySelectorAll('.fee-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fee-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedFee = btn.dataset.speed;
  });
});

// Receive view
$('btn-back-receive').addEventListener('click', () => showView('dashboard'));
$('btn-copy-address').addEventListener('click', () => {
  copyToClipboard(state.address);
});

// Header
$('btn-logout').addEventListener('click', logout);

showView('onboarding');
