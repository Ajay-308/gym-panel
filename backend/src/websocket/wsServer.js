const { WebSocketServer, WebSocket } = require("ws");

let wss = null;

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log(`WebSocket client connected (total: ${wss.clients.size})`);
    ws.on("close", () => {
      console.log(`WebSocket disconnected (remaining: ${wss.clients.size})`);
    });
    ws.on("error", (err) => {
      console.error("WebSocket client error:", err.message);
    });
    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        timestamp: new Date().toISOString(),
      }),
    );
  });

  wss.on("error", (err) => {
    console.error("WebSocket server error:", err.message);
  });

  console.log("WebSocket server on /ws");
  return wss;
}

function broadcast(event) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

function broadcastCheckin(payload) {
  broadcast({ type: "CHECKIN_EVENT", ...payload });
}

function broadcastCheckout(payload) {
  broadcast({ type: "CHECKOUT_EVENT", ...payload });
}

function broadcastPayment(payload) {
  broadcast({ type: "PAYMENT_EVENT", ...payload });
}

function broadcastAnomalyDetected(payload) {
  broadcast({ type: "ANOMALY_DETECTED", ...payload });
}

function broadcastAnomalyResolved(payload) {
  broadcast({ type: "ANOMALY_RESOLVED", ...payload });
}

function getClientCount() {
  return wss ? wss.clients.size : 0;
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastCheckin,
  broadcastCheckout,
  broadcastPayment,
  broadcastAnomalyDetected,
  broadcastAnomalyResolved,
  getClientCount,
};
