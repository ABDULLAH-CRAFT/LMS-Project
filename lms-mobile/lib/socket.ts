// Lazily creates (and reuses) ONE socket.io connection to the backend's
// /payments namespace — the mobile counterpart of
// lms-frontend/src/lib/socket.ts. The only real difference is that
// tokens live in SecureStore here instead of localStorage, so getting
// one is async.
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./storage/tokenStorage";
import { API_BASE_URL } from "../constants/config";

let socket: Socket | null = null;

export async function getPaymentSocket(): Promise<Socket | null> {
  const token = await getAccessToken();
  if (!token) return null; // not logged in — nothing to connect for

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(`${API_BASE_URL}/payments`, {
      auth: { token },
      autoConnect: false,
      // Skip the polling-transport upgrade dance — React Native's WebSocket
      // works fine directly and this avoids probing issues some RN/Hermes
      // setups have with engine.io's default "polling first" behavior.
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
  } else {
    // token may have changed since the socket was created (re-login)
    socket.auth = { token };
  }

  socket.connect();
  return socket;
}

export function disconnectPaymentSocket() {
  socket?.disconnect();
  socket = null;
}
