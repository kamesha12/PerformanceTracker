import logging
from typing import List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("app_logger")

class ConnectionManager:
    """Manages active WebSocket connections and handles broadcasting live dashboard updates."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New WebSocket client connected. Total clients: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected. Total clients: %d", len(self.active_connections))

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning("Failed to send message to client: %s", str(e))
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        logger.info("Broadcasting live dashboard update to %d clients...", len(self.active_connections))
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning("Error broadcasting to connection: %s", str(e))
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()
