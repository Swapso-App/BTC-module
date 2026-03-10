"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionVisualizer = void 0;
const axios_1 = __importDefault(require("axios"));
class TransactionVisualizer {
    constructor(network = 'MAINNET') {
        this.apiBaseUrl = network === 'TESTNET'
            ? 'https://mempool.space/testnet/api'
            : 'https://mempool.space/api';
    }
    /**
     * Fetches transaction data and constructs a visualization graph.
     * @param txId The transaction ID (hash) to analyze.
     * @returns VisualizationData object compatible with Vis.js
     */
    async analyzeTransaction(txId) {
        try {
            const response = await axios_1.default.get(`${this.apiBaseUrl}/tx/${txId}`);
            const tx = response.data;
            const nodes = [];
            const edges = [];
            // Central Node: The Transaction itself
            nodes.push({
                id: tx.txid,
                label: `TX\n${tx.txid.substring(0, 8)}...`,
                group: 'transaction',
                details: {
                    fullHash: tx.txid,
                    fee: tx.fee,
                    size: tx.size,
                    weight: tx.weight,
                    confirmed: tx.status.confirmed,
                    blockTime: tx.status.block_time ? new Date(tx.status.block_time * 1000).toLocaleString() : 'Pending'
                }
            });
            let totalInput = 0;
            let totalOutput = 0;
            // Process Inputs (VIN)
            tx.vin.forEach((input, index) => {
                let address = 'Unknown';
                let amount = 0;
                if (input.is_coinbase) {
                    // Coinbase inputs have no real sender — add a synthetic node and edge
                    const coinbaseNodeId = `coinbase-${index}-${tx.txid}`;
                    nodes.push({
                        id: coinbaseNodeId,
                        label: 'Coinbase\n(New Coins)',
                        group: 'input',
                        details: { coinbase: true, sequence: input.sequence }
                    });
                    edges.push({
                        from: coinbaseNodeId,
                        to: tx.txid,
                        label: 'Coinbase',
                        arrows: 'to',
                        color: { color: '#aaaaff' }
                    });
                }
                else if (input.prevout) {
                    address = input.prevout.scriptpubkey_address || 'Unknown Address';
                    amount = input.prevout.value;
                    totalInput += amount;
                    // Create a node for the Sender Address (deduped by address)
                    const addressNodeId = `addr-${address}`;
                    if (!nodes.find(n => n.id === addressNodeId)) {
                        nodes.push({
                            id: addressNodeId,
                            label: `${address.substring(0, 8)}...`,
                            group: 'address',
                            details: { address: address }
                        });
                    }
                    // Edge from Address to Transaction
                    edges.push({
                        from: addressNodeId,
                        to: tx.txid,
                        label: `${(amount / 100000000).toFixed(8)} BTC`,
                        value: amount,
                        arrows: 'to',
                        color: { color: '#ffaaaa' } // Inlet color
                    });
                }
            });
            // Process Outputs (VOUT)
            tx.vout.forEach((output) => {
                const address = output.scriptpubkey_address || 'OP_RETURN / Unparsed';
                const amount = output.value;
                totalOutput += amount;
                const existingNode = nodes.find(n => n.id === `addr-${address}`);
                const targetId = existingNode ? existingNode.id : `addr-${address}`;
                if (!existingNode) {
                    nodes.push({
                        id: targetId,
                        label: `${address.substring(0, 6)}...`,
                        group: 'address',
                        details: { address: address }
                    });
                }
                edges.push({
                    from: tx.txid,
                    to: targetId,
                    label: `${(amount / 100000000).toFixed(8)} BTC`,
                    value: amount,
                    arrows: 'to',
                    color: { color: '#aaffaa' } // Outlet color
                });
            });
            return {
                nodes,
                edges,
                summary: {
                    txid: tx.txid,
                    fee: tx.fee,
                    size: tx.size,
                    weight: tx.weight,
                    confirmed: tx.status.confirmed,
                    time: tx.status.block_time ? new Date(tx.status.block_time * 1000).toLocaleString() : 'Pending',
                    totalInput,
                    totalOutput
                }
            };
        }
        catch (error) {
            console.error("Error analyzing transaction:", error);
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to analyze transaction: ${msg}`);
        }
    }
}
exports.TransactionVisualizer = TransactionVisualizer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNhY3Rpb25WaXN1YWxpemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJhbnNhY3Rpb25WaXN1YWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGtEQUEwQjtBQTZFMUIsTUFBYSxxQkFBcUI7SUFHaEMsWUFBWSxVQUFpQyxTQUFTO1FBQ3BELElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxLQUFLLFNBQVM7WUFDckMsQ0FBQyxDQUFDLG1DQUFtQztZQUNyQyxDQUFDLENBQUMsMkJBQTJCLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBWTtRQUNuQyxJQUFJLENBQUM7WUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxPQUFPLElBQUksRUFBRSxDQUFDLENBQUM7WUFDL0UsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztZQUV6QixNQUFNLEtBQUssR0FBd0IsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUF3QixFQUFFLENBQUM7WUFFdEMsdUNBQXVDO1lBQ3ZDLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJO2dCQUNYLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSztnQkFDMUMsS0FBSyxFQUFFLGFBQWE7Z0JBQ3BCLE9BQU8sRUFBRTtvQkFDUCxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUk7b0JBQ2pCLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRztvQkFDWCxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7b0JBQ2IsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNO29CQUNqQixTQUFTLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTO29CQUM5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RUFBRSxFQUFFLENBQUMsR0FBRztvQkFDWCxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7b0JBQ2IsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNO29CQUNqQixTQUFTLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTO29CQUM5QixJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO29CQUMvRixVQUFVO29CQUNWLFdBQVc7aUJBQ1o7YUFDRixDQUFDO1FBRUosQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRCxNQUFNLEdBQUcsR0FBRyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkUsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzRCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBMUlELHNEQTBJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XHJcblxyXG5pbnRlcmZhY2UgVHhJbnB1dCB7XHJcbiAgdHhpZDogc3RyaW5nO1xyXG4gIHZvdXQ6IG51bWJlcjtcclxuICBwcmV2b3V0OiB7XHJcbiAgICBzY3JpcHRwdWJrZXk6IHN0cmluZztcclxuICAgIHNjcmlwdHB1YmtleV9hc206IHN0cmluZztcclxuICAgIHNjcmlwdHB1YmtleV90eXBlOiBzdHJpbmc7XHJcbiAgICBzY3JpcHRwdWJrZXlfYWRkcmVzczogc3RyaW5nO1xyXG4gICAgdmFsdWU6IG51bWJlcjtcclxuICB9O1xyXG4gIHNjcmlwdHNpZzogc3RyaW5nO1xyXG4gIHNjcmlwdHNpZ19hc206IHN0cmluZztcclxuICB3aXRuZXNzOiBzdHJpbmdbXTtcclxuICBpc19jb2luYmFzZTogYm9vbGVhbjtcclxuICBzZXF1ZW5jZTogbnVtYmVyO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVHhPdXRwdXQge1xyXG4gIHNjcmlwdHB1YmtleTogc3RyaW5nO1xyXG4gIHNjcmlwdHB1YmtleV9hc206IHN0cmluZztcclxuICBzY3JpcHRwdWJrZXlfdHlwZTogc3RyaW5nO1xyXG4gIHNjcmlwdHB1YmtleV9hZGRyZXNzOiBzdHJpbmc7XHJcbiAgdmFsdWU6IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFRyYW5zYWN0aW9uIHtcclxuICB0eGlkOiBzdHJpbmc7XHJcbiAgdmVyc2lvbjogbnVtYmVyO1xyXG4gIGxvY2t0aW1lOiBudW1iZXI7XHJcbiAgdmluOiBUeElucHV0W107XHJcbiAgdm91dDogVHhPdXRwdXRbXTtcclxuICBzaXplOiBudW1iZXI7XHJcbiAgd2VpZ2h0OiBudW1iZXI7XHJcbiAgZmVlOiBudW1iZXI7XHJcbiAgc3RhdHVzOiB7XHJcbiAgICBjb25maXJtZWQ6IGJvb2xlYW47XHJcbiAgICBibG9ja19oZWlnaHQ/OiBudW1iZXI7XHJcbiAgICBibG9ja19oYXNoPzogc3RyaW5nO1xyXG4gICAgYmxvY2tfdGltZT86IG51bWJlcjtcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZpc3VhbGl6YXRpb25Ob2RlIHtcclxuICBpZDogc3RyaW5nO1xyXG4gIGxhYmVsOiBzdHJpbmc7XHJcbiAgZ3JvdXA6ICd0cmFuc2FjdGlvbicgfCAnYWRkcmVzcycgfCAnaW5wdXQnIHwgJ291dHB1dCc7XHJcbiAgZGV0YWlscz86IGFueTsgLy8gQWRkaXRpb25hbCBpbmZvIGZvciB0b29sdGlwXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmlzdWFsaXphdGlvbkVkZ2Uge1xyXG4gIGZyb206IHN0cmluZztcclxuICB0bzogc3RyaW5nO1xyXG4gIGxhYmVsPzogc3RyaW5nOyAvLyBWYWx1ZSBvciBpbmRleFxyXG4gIHZhbHVlPzogbnVtYmVyOyAvLyBWaXN1YWwgd2VpZ2h0XHJcbiAgYXJyb3dzPzogc3RyaW5nO1xyXG4gIGNvbG9yPzoge1xyXG4gICAgY29sb3I6IHN0cmluZztcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZpc3VhbGl6YXRpb25EYXRhIHtcclxuICBub2RlczogVmlzdWFsaXphdGlvbk5vZGVbXTtcclxuICBlZGdlczogVmlzdWFsaXphdGlvbkVkZ2VbXTtcclxuICBzdW1tYXJ5OiB7XHJcbiAgICB0eGlkOiBzdHJpbmc7XHJcbiAgICBmZWU6IG51bWJlcjtcclxuICAgIHNpemU6IG51bWJlcjtcclxuICAgIHdlaWdodDogbnVtYmVyO1xyXG4gICAgY29uZmlybWVkOiBib29sZWFuO1xyXG4gICAgdGltZT86IHN0cmluZztcclxuICAgIHRvdGFsSW5wdXQ6IG51bWJlcjtcclxuICAgIHRvdGFsT3V0cHV0OiBudW1iZXI7XHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRyYW5zYWN0aW9uVmlzdWFsaXplciB7XHJcbiAgcHJpdmF0ZSBhcGlCYXNlVXJsOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKG5ldHdvcms6ICdNQUlOTkVUJyB8ICdURVNUTkVUJyA9ICdNQUlOTkVUJykge1xyXG4gICAgdGhpcy5hcGlCYXNlVXJsID0gbmV0d29yayA9PT0gJ1RFU1RORVQnIFxyXG4gICAgICA/ICdodHRwczovL21lbXBvb2wuc3BhY2UvdGVzdG5ldC9hcGknIFxyXG4gICAgICA6ICdodHRwczovL21lbXBvb2wuc3BhY2UvYXBpJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoZXMgdHJhbnNhY3Rpb24gZGF0YSBhbmQgY29uc3RydWN0cyBhIHZpc3VhbGl6YXRpb24gZ3JhcGguXHJcbiAgICogQHBhcmFtIHR4SWQgVGhlIHRyYW5zYWN0aW9uIElEIChoYXNoKSB0byBhbmFseXplLlxyXG4gICAqIEByZXR1cm5zIFZpc3VhbGl6YXRpb25EYXRhIG9iamVjdCBjb21wYXRpYmxlIHdpdGggVmlzLmpzXHJcbiAgICovXHJcbiAgYXN5bmMgYW5hbHl6ZVRyYW5zYWN0aW9uKHR4SWQ6IHN0cmluZyk6IFByb21pc2U8VmlzdWFsaXphdGlvbkRhdGE+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MuZ2V0PFRyYW5zYWN0aW9uPihgJHt0aGlzLmFwaUJhc2VVcmx9L3R4LyR7dHhJZH1gKTtcclxuICAgICAgY29uc3QgdHggPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICBcclxuICAgICAgY29uc3Qgbm9kZXM6IFZpc3VhbGl6YXRpb25Ob2RlW10gPSBbXTtcclxuICAgICAgY29uc3QgZWRnZXM6IFZpc3VhbGl6YXRpb25FZGdlW10gPSBbXTtcclxuICAgICAgXHJcbiAgICAgIC8vIENlbnRyYWwgTm9kZTogVGhlIFRyYW5zYWN0aW9uIGl0c2VsZlxyXG4gICAgICBub2Rlcy5wdXNoKHtcclxuICAgICAgICBpZDogdHgudHhpZCxcclxuICAgICAgICBsYWJlbDogYFRYXFxuJHt0eC50eGlkLnN1YnN0cmluZygwLCA4KX0uLi5gLFxyXG4gICAgICAgIGdyb3VwOiAndHJhbnNhY3Rpb24nLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGZ1bGxIYXNoOiB0eC50eGlkLFxyXG4gICAgICAgICAgZmVlOiB0eC5mZWUsXHJcbiAgICAgICAgICBzaXplOiB0eC5zaXplLFxyXG4gICAgICAgICAgd2VpZ2h0OiB0eC53ZWlnaHQsXHJcbiAgICAgICAgICBjb25maXJtZWQ6IHR4LnN0YXR1cy5jb25maXJtZWQsXHJcbiAgICAgICAgICBibG9ja1RpbWU6IHR4LnN0YXR1cy5ibG9ja190aW1lID8gbmV3IERhdGUodHguc3RhdHVzLmJsb2NrX3RpbWUgKiAxMDAwKS50b0xvY2FsZVN0cmluZygpIDogJ1BlbmRpbmcnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGxldCB0b3RhbElucHV0ID0gMDtcclxuICAgICAgbGV0IHRvdGFsT3V0cHV0ID0gMDtcclxuXHJcbiAgICAgIC8vIFByb2Nlc3MgSW5wdXRzIChWSU4pXHJcbiAgICAgIHR4LnZpbi5mb3JFYWNoKChpbnB1dCwgaW5kZXgpID0+IHtcclxuICAgICAgICBsZXQgYWRkcmVzcyA9ICdVbmtub3duJztcclxuICAgICAgICBsZXQgYW1vdW50ID0gMDtcclxuXHJcbiAgICAgICAgaWYgKGlucHV0LmlzX2NvaW5iYXNlKSB7XHJcbiAgICAgICAgICAvLyBDb2luYmFzZSBpbnB1dHMgaGF2ZSBubyByZWFsIHNlbmRlciDigJQgYWRkIGEgc3ludGhldGljIG5vZGUgYW5kIGVkZ2VcclxuICAgICAgICAgIGNvbnN0IGNvaW5iYXNlTm9kZUlkID0gYGNvaW5iYXNlLSR7aW5kZXh9LSR7dHgudHhpZH1gO1xyXG4gICAgICAgICAgbm9kZXMucHVzaCh7XHJcbiAgICAgICAgICAgIGlkOiBjb2luYmFzZU5vZGVJZCxcclxuICAgICAgICAgICAgbGFiZWw6ICdDb2luYmFzZVxcbihOZXcgQ29pbnMpJyxcclxuICAgICAgICAgICAgZ3JvdXA6ICdpbnB1dCcsXHJcbiAgICAgICAgICAgIGRldGFpbHM6IHsgY29pbmJhc2U6IHRydWUsIHNlcXVlbmNlOiBpbnB1dC5zZXF1ZW5jZSB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGVkZ2VzLnB1c2goe1xyXG4gICAgICAgICAgICBmcm9tOiBjb2luYmFzZU5vZGVJZCxcclxuICAgICAgICAgICAgdG86IHR4LnR4aWQsXHJcbiAgICAgICAgICAgIGxhYmVsOiAnQ29pbmJhc2UnLFxyXG4gICAgICAgICAgICBhcnJvd3M6ICd0bycsXHJcbiAgICAgICAgICAgIGNvbG9yOiB7IGNvbG9yOiAnI2FhYWFmZicgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5wcmV2b3V0KSB7XHJcbiAgICAgICAgICBhZGRyZXNzID0gaW5wdXQucHJldm91dC5zY3JpcHRwdWJrZXlfYWRkcmVzcyB8fCAnVW5rbm93biBBZGRyZXNzJztcclxuICAgICAgICAgIGFtb3VudCA9IGlucHV0LnByZXZvdXQudmFsdWU7XHJcbiAgICAgICAgICB0b3RhbElucHV0ICs9IGFtb3VudDtcclxuXHJcbiAgICAgICAgICAvLyBDcmVhdGUgYSBub2RlIGZvciB0aGUgU2VuZGVyIEFkZHJlc3MgKGRlZHVwZWQgYnkgYWRkcmVzcylcclxuICAgICAgICAgIGNvbnN0IGFkZHJlc3NOb2RlSWQgPSBgYWRkci0ke2FkZHJlc3N9YDtcclxuICAgICAgICAgIGlmICghbm9kZXMuZmluZChuID0+IG4uaWQgPT09IGFkZHJlc3NOb2RlSWQpKSB7XHJcbiAgICAgICAgICAgICBub2Rlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgaWQ6IGFkZHJlc3NOb2RlSWQsXHJcbiAgICAgICAgICAgICAgIGxhYmVsOiBgJHthZGRyZXNzLnN1YnN0cmluZygwLCA4KX0uLi5gLFxyXG4gICAgICAgICAgICAgICBncm91cDogJ2FkZHJlc3MnLFxyXG4gICAgICAgICAgICAgICBkZXRhaWxzOiB7IGFkZHJlc3M6IGFkZHJlc3MgfVxyXG4gICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEVkZ2UgZnJvbSBBZGRyZXNzIHRvIFRyYW5zYWN0aW9uXHJcbiAgICAgICAgICBlZGdlcy5wdXNoKHtcclxuICAgICAgICAgICAgZnJvbTogYWRkcmVzc05vZGVJZCxcclxuICAgICAgICAgICAgdG86IHR4LnR4aWQsXHJcbiAgICAgICAgICAgIGxhYmVsOiBgJHsoYW1vdW50IC8gMTAwMDAwMDAwKS50b0ZpeGVkKDgpfSBCVENgLFxyXG4gICAgICAgICAgICB2YWx1ZTogYW1vdW50LFxyXG4gICAgICAgICAgICBhcnJvd3M6ICd0bycsXHJcbiAgICAgICAgICAgIGNvbG9yOiB7IGNvbG9yOiAnI2ZmYWFhYScgfSAvLyBJbmxldCBjb2xvclxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFByb2Nlc3MgT3V0cHV0cyAoVk9VVClcclxuICAgICAgdHgudm91dC5mb3JFYWNoKChvdXRwdXQpID0+IHtcclxuICAgICAgICBjb25zdCBhZGRyZXNzID0gb3V0cHV0LnNjcmlwdHB1YmtleV9hZGRyZXNzIHx8ICdPUF9SRVRVUk4gLyBVbnBhcnNlZCc7XHJcbiAgICAgICAgY29uc3QgYW1vdW50ID0gb3V0cHV0LnZhbHVlO1xyXG4gICAgICAgIHRvdGFsT3V0cHV0ICs9IGFtb3VudDtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBleGlzdGluZ05vZGUgPSBub2Rlcy5maW5kKG4gPT4gbi5pZCA9PT0gYGFkZHItJHthZGRyZXNzfWApO1xyXG4gICAgICAgIGNvbnN0IHRhcmdldElkID0gZXhpc3RpbmdOb2RlID8gZXhpc3RpbmdOb2RlLmlkIDogYGFkZHItJHthZGRyZXNzfWA7XHJcblxyXG4gICAgICAgIGlmICghZXhpc3RpbmdOb2RlKSB7XHJcbiAgICAgICAgICBub2Rlcy5wdXNoKHtcclxuICAgICAgICAgICAgIGlkOiB0YXJnZXRJZCxcclxuICAgICAgICAgICAgIGxhYmVsOiBgJHthZGRyZXNzLnN1YnN0cmluZygwLCA2KX0uLi5gLFxyXG4gICAgICAgICAgICAgZ3JvdXA6ICdhZGRyZXNzJyxcclxuICAgICAgICAgICAgIGRldGFpbHM6IHsgYWRkcmVzczogYWRkcmVzcyB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVkZ2VzLnB1c2goe1xyXG4gICAgICAgICAgZnJvbTogdHgudHhpZCxcclxuICAgICAgICAgIHRvOiB0YXJnZXRJZCxcclxuICAgICAgICAgIGxhYmVsOiBgJHsoYW1vdW50IC8gMTAwMDAwMDAwKS50b0ZpeGVkKDgpfSBCVENgLFxyXG4gICAgICAgICAgdmFsdWU6IGFtb3VudCxcclxuICAgICAgICAgIGFycm93czogJ3RvJyxcclxuICAgICAgICAgIGNvbG9yOiB7IGNvbG9yOiAnI2FhZmZhYScgfSAvLyBPdXRsZXQgY29sb3JcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIG5vZGVzLFxyXG4gICAgICAgIGVkZ2VzLFxyXG4gICAgICAgIHN1bW1hcnk6IHtcclxuICAgICAgICAgIHR4aWQ6IHR4LnR4aWQsXHJcbiAgICAgICAgICBmZWU6IHR4LmZlZSxcclxuICAgICAgICAgIHNpemU6IHR4LnNpemUsXHJcbiAgICAgICAgICB3ZWlnaHQ6IHR4LndlaWdodCxcclxuICAgICAgICAgIGNvbmZpcm1lZDogdHguc3RhdHVzLmNvbmZpcm1lZCxcclxuICAgICAgICAgIHRpbWU6IHR4LnN0YXR1cy5ibG9ja190aW1lID8gbmV3IERhdGUodHguc3RhdHVzLmJsb2NrX3RpbWUgKiAxMDAwKS50b0xvY2FsZVN0cmluZygpIDogJ1BlbmRpbmcnLFxyXG4gICAgICAgICAgdG90YWxJbnB1dCxcclxuICAgICAgICAgIHRvdGFsT3V0cHV0XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGFuYWx5emluZyB0cmFuc2FjdGlvbjpcIiwgZXJyb3IpO1xyXG4gICAgICBjb25zdCBtc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGFuYWx5emUgdHJhbnNhY3Rpb246ICR7bXNnfWApO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXX0=