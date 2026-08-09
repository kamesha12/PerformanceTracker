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
from excel_service import init_excel_if_missing, get_file_mtime, EXCEL_PATH
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

# 2. File Watcher Background Task
async def excel_file_watcher():
    """Background loop watching for manual external edits to the Excel database."""
    last_mtime = get_file_mtime()
    logger.info("Excel file watcher started monitoring: %s (initial mtime: %f)", EXCEL_PATH, last_mtime)
    
    while True:
        try:
            await asyncio.sleep(1.5)  # Check file modification timestamp every 1.5 seconds
            current_mtime = get_file_mtime()
            if current_mtime > last_mtime:
                logger.info("External modification detected on Excel file! Reloading data & broadcasting update...")
                last_mtime = current_mtime
                
                # Fetch fresh aggregated payload
                payload = get_dashboard_payload()
                
                # Broadcast live update event to all connected WebSocket clients
                await manager.broadcast({
                    "event": "excel_updated",
                    "message": "Excel file was modified externally. Dashboard refreshed.",
                    "data": payload
                })
        except asyncio.CancelledError:
            logger.info("Excel watcher task stopped.")
            break
        except Exception as e:
            logger.error("Error in excel_file_watcher loop: %s", str(e))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Initializing Enterprise Performance Tracker Dashboard...")
    init_excel_if_missing()
    
    # Start background file watcher
    watcher_task = asyncio.create_task(excel_file_watcher())
    yield
    # Shutdown tasks
    watcher_task.cancel()
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
    """Renders the main enterprise dashboard HTML page."""
    return templates.TemplateResponse(request=request, name="index.html")

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
