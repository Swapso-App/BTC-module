document.addEventListener('DOMContentLoaded', () => {
  const txInput = document.getElementById('tx-input');
  const networkSelect = document.getElementById('network-select');
  const btnVisualize = document.getElementById('btn-visualize');
  const loading = document.getElementById('loading');
  const errorMessage = document.getElementById('error-message');
  const visualizationContainer = document.getElementById('visualization-container');
  const txSummary = document.getElementById('tx-summary');
  const nodeDetails = document.getElementById('node-details');
  const networkBadge = document.getElementById('network-badge');

  let nodes, edges, networkGraph;
  let lastData = null; // stored for export
  let lastTxId = null;

  // Auto-apply network from URL param (e.g. ?network=TESTNET)
  const urlParams = new URLSearchParams(window.location.search);
  const urlNetwork = urlParams.get('network');
  if (urlNetwork && (urlNetwork === 'MAINNET' || urlNetwork === 'TESTNET')) {
    networkSelect.value = urlNetwork;
  }
  networkBadge.textContent = networkSelect.value;

  // Pre-fill txid from URL param if present
  const urlTxid = urlParams.get('txid');
  if (urlTxid) txInput.value = urlTxid;

  networkSelect.addEventListener('change', (e) => {
    networkBadge.textContent = e.target.value;
  });

  btnVisualize.addEventListener('click', async () => {
    const txId = txInput.value.trim();
    const network = networkSelect.value;

    if (!txId) {
      showError('Please enter a transaction ID');
      return;
    }

    showLoading(true);
    showError(null);
    visualizationContainer.classList.add('hidden');

    try {
      const response = await fetch(`/api/visualize/${txId}?network=${network}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      renderGraph(data);
      renderSummary(data.summary);
      lastData = data;
      lastTxId = txId;
      visualizationContainer.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      showError(err.message || 'Failed to load transaction data');
    } finally {
      showLoading(false);
    }
  });

  function showError(msg) {
    if (msg) {
      errorMessage.textContent = msg;
      errorMessage.classList.remove('hidden');
    } else {
      errorMessage.classList.add('hidden');
    }
  }

  function showLoading(isLoading) {
    if (isLoading) loading.classList.remove('hidden');
    else loading.classList.add('hidden');
  }

  function renderSummary(summary) {
    txSummary.innerHTML = `
      <p><strong>TXID:</strong> <a href="#" onclick="navigator.clipboard.writeText('${summary.txid}')" title="Copy">${summary.txid.substring(0, 10)}...</a></p>
      <p><strong>Fee:</strong> ${summary.fee} sats</p>
      <p><strong>Total Input:</strong> ${(summary.totalInput / 100000000).toFixed(8)} BTC</p>
      <p><strong>Total Output:</strong> ${(summary.totalOutput / 100000000).toFixed(8)} BTC</p>
      <p><strong>Size:</strong> ${summary.size} bytes</p>
      <p><strong>Status:</strong> ${summary.confirmed ? 'Confirmed' : 'Unconfirmed'}</p>
      <p><strong>Time:</strong> ${summary.time}</p>
    `;
  }

  function renderGraph(data) {
    // Create datasets
    nodes = new vis.DataSet(data.nodes.map(n => ({
      ...n,
      color: getNodeColor(n.group),
      shape: getNodeShape(n.group),
      font: { color: n.group === 'transaction' ? '#ffffff' : '#e6edf3', size: 12 }
    })));
    
    edges = new vis.DataSet(data.edges);

    const container = document.getElementById('mynetwork');
    const graphData = { nodes: nodes, edges: edges };
    const options = {
      layout: {
        hierarchical: {
          direction: "LR", // Left to Right
          sortMethod: "directed",
          levelSeparation: 250,
          nodeSpacing: 100
        }
      },
      edges: {
        smooth: {
          type: 'cubicBezier',
          forceDirection: 'horizontal',
          roundness: 0.4
        },
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        color: { color: '#444c56', highlight: '#f7931a', hover: '#e6edf3' },
        width: 1.5
      },
      physics: false,
      nodes: {
        borderWidth: 1,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 8 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    };

    networkGraph = new vis.Network(container, graphData, options);

    networkGraph.on("click", function (params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        showNodeDetails(node);
      }
    });
  }

  function getNodeColor(group) {
    switch(group) {
      case 'transaction': return '#F7931A'; // Bitcoin Orange
      case 'address': return '#97C2FC';
      default: return '#DDDDDD';
    }
  }

  function getNodeShape(group) {
    switch(group) {
      case 'transaction': return 'box';
      case 'address': return 'ellipse';
      default: return 'dot';
    }
  }

  function showNodeDetails(node) {
    let html = `<h4>${node.label}</h4>`;
    if (node.details) {
      for (const [key, value] of Object.entries(node.details)) {
        html += `<p><strong>${key}:</strong> ${value}</p>`;
      }
    } else {
      html += `<p>No details available</p>`;
    }
    nodeDetails.innerHTML = html;
  }

  // ── Export helpers ──────────────────────────────────────────

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    if (!lastData) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      network: networkSelect.value,
      txid: lastTxId,
      summary: lastData.summary,
      nodes: lastData.nodes,
      edges: lastData.edges,
    };
    downloadFile(JSON.stringify(payload, null, 2), `tx-${lastTxId.substring(0, 10)}.json`, 'application/json');
  }

  function exportCSV() {
    if (!lastData) return;
    const s = lastData.summary;
    const rows = [
      ['Type', 'Field', 'Value'],
      ['Summary', 'TXID', s.txid],
      ['Summary', 'Network', networkSelect.value],
      ['Summary', 'Fee (sats)', s.fee],
      ['Summary', 'Total Input (BTC)', (s.totalInput / 1e8).toFixed(8)],
      ['Summary', 'Total Output (BTC)', (s.totalOutput / 1e8).toFixed(8)],
      ['Summary', 'Size (bytes)', s.size],
      ['Summary', 'Status', s.confirmed ? 'Confirmed' : 'Unconfirmed'],
      ['Summary', 'Time', s.time],
      [],
      ['Nodes', 'ID', 'Label', 'Group'],
      ...lastData.nodes.map(n => ['Node', n.id, n.label.replace(/\n/g, ' '), n.group]),
      [],
      ['Edges', 'From', 'To', 'Label'],
      ...lastData.edges.map(e => ['Edge', e.from, e.to, e.label || '']),
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `tx-${lastTxId.substring(0, 10)}.csv`, 'text/csv');
  }

  function exportPNG() {
    if (!networkGraph) return;
    const canvas = networkGraph.getCanvas ? networkGraph.getCanvas() :
                   document.querySelector('#mynetwork canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `tx-${lastTxId.substring(0, 10)}-graph.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function copyReport() {
    if (!lastData) return;
    const s = lastData.summary;
    const net = networkSelect.value;
    const inputNodes  = lastData.nodes.filter(n => n.group === 'address' && lastData.edges.some(e => e.to === lastData.summary.txid && e.from === n.id));
    const outputNodes = lastData.nodes.filter(n => n.group === 'address' && lastData.edges.some(e => e.from === lastData.summary.txid && e.to === n.id));
    const lines = [
      '═══════════════════════════════════════',
      '  Bitcoin Transaction Report',
      '═══════════════════════════════════════',
      `  Network   : ${net}`,
      `  TXID      : ${s.txid}`,
      `  Status    : ${s.confirmed ? 'Confirmed' : 'Unconfirmed'}`,
      `  Time      : ${s.time}`,
      `  Fee       : ${s.fee} sats`,
      `  Size      : ${s.size} bytes`,
      `  Input     : ${(s.totalInput / 1e8).toFixed(8)} BTC`,
      `  Output    : ${(s.totalOutput / 1e8).toFixed(8)} BTC`,
      '───────────────────────────────────────',
      `  Inputs (${inputNodes.length}):`,
      ...inputNodes.map(n => `    • ${n.details && n.details.address ? n.details.address : n.label}`),
      '───────────────────────────────────────',
      `  Outputs (${outputNodes.length}):`,
      ...outputNodes.map(n => `    • ${n.details && n.details.address ? n.details.address : n.label}`),
      '═══════════════════════════════════════',
      `  Generated by Swapso Wallet Visualizer`,
      `  ${new Date().toLocaleString()}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => showToast('Report copied to clipboard'))
      .catch(() => showToast('Copy failed'));
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'viz-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-png').addEventListener('click', exportPNG);
  document.getElementById('btn-copy-report').addEventListener('click', copyReport);

});
