import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from routes import router
from websocket import manager
from dashboard_service import get_dashboard_payload

# 1. Setup Application Logging
LOGS_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "app.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("app_logger")

from db_service import init_db, get_all_records

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Initializing Enterprise Performance Tracker Dashboard (Microsoft SQL Server Engine)...")
    asyncio.create_task(asyncio.to_thread(init_db))
    yield
    logger.info("Application shutdown complete.")

app = FastAPI(
    title="Performance Tracker - Enterprise Analytics Application",
    version="2.0.0",
    description="Enterprise Analytics Dashboard inspired by Microsoft Power BI & Fabric",
    lifespan=lifespan
)

# Enable CORS for maximum flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files and Templates
BASE_DIR = os.path.dirname(__file__)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Include API Routes
app.include_router(router)

from fastapi.responses import Response

@app.get("/", summary="Render Dashboard UI")
def render_index(request: Request):
    """Renders the main enterprise dashboard HTML page with pre-populated SQL Server data."""
    data = get_dashboard_payload()
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={
            "records": data.get("records", []), 
            "columns": data.get("columns", []),
            "summary": data.get("summary", {})
        }
    )

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Favicon handler to prevent 404 log clutter."""
    return Response(status_code=204)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time live synchronization."""
    await manager.connect(websocket)
    try:
        # Send initial dashboard payload on connection
        initial_data = get_dashboard_payload()
        await manager.send_personal_message({
            "event": "connected",
            "message": "Connected to Performance Tracker Live WebSockets",
            "data": initial_data
        }, websocket)
        
        while True:
            # Keep connection open and listen for ping/heartbeats
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket error: %s", str(e))
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
