import { useEffect, useRef, useState, useCallback } from "react";

function wsUrl() {
  const p = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${p}//${window.location.host}/ws`;
}

export function useWebSocket(handlers) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const w = new WebSocket(wsUrl());
    wsRef.current = w;
    w.onopen = () => setConnected(true);
    w.onclose = () => setConnected(false);
    w.onerror = () => setConnected(false);
    w.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const h = handlersRef.current;
        if (msg.type === "CHECKIN_EVENT" && h.onCheckin) h.onCheckin(msg);
        if (msg.type === "CHECKOUT_EVENT" && h.onCheckout) h.onCheckout(msg);
        if (msg.type === "PAYMENT_EVENT" && h.onPayment) h.onPayment(msg);
        if (msg.type === "ANOMALY_DETECTED" && h.onAnomaly) h.onAnomaly(msg);
        if (msg.type === "ANOMALY_RESOLVED" && h.onAnomalyResolved) {
          h.onAnomalyResolved(msg);
        }
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    connect();
    const id = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.CLOSED) connect();
    }, 3000);
    return () => {
      clearInterval(id);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, reconnect: connect };
}
