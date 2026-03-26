import json
from collections import defaultdict

from fastapi import WebSocket


class NotificationWebSocketManager:
    """
    Simple in-memory connection manager.

    Good for single-process dev.
    For multi-instance production, back this with Redis pub/sub.
    """

    def __init__(self):
        self.active_connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, payload: dict):
        sockets = list(self.active_connections.get(user_id, set()))
        dead = []

        for socket in sockets:
            try:
                await socket.send_text(json.dumps(payload))
            except Exception:
                dead.append(socket)

        for socket in dead:
            self.disconnect(user_id, socket)


notification_ws_manager = NotificationWebSocketManager()