import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse, StreamingResponse

from excel_service import (
    read_excel_data,
    add_intern_record,
    update_intern_record,
    delete_intern_record,
    EXCEL_PATH
)
from dashboard_service import get_dashboard_payload
from pdf_service import generate_pdf_report
from websocket import manager

logger = logging.getLogger("app_logger")
router = APIRouter()

@router.get("/interns", summary="Retrieve all intern records directly from Excel")
def get_interns():
    """Returns all records and dynamic dynamic schema column list from Excel."""
    try:
        records, columns = read_excel_data()
        return {"status": "success", "records": records, "columns": columns}
    except Exception as e:
        logger.error("API Error in /interns: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard", summary="Retrieve aggregated dashboard analytics")
def get_dashboard(
    search: Optional[str] = Query("", description="Search term for Intern Name or Branch"),
    sort_by: Optional[str] = Query("", description="Sort by column name (name, physical, telecalling, leads, marketing)"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc")
):
    """Calculates summary KPIs, chart datasets, and table records."""
    try:
        payload = get_dashboard_payload(search_query=search, sort_by=sort_by, sort_order=sort_order)
        return {"status": "success", "data": payload}
    except Exception as e:
        logger.error("API Error in /dashboard: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/intern", summary="Add a new intern record to Excel")
async def create_intern(payload: Dict[str, Any]):
    """Inserts a new intern into Excel and broadcasts real-time WebSocket update."""
    try:
        if not payload.get("Intern Name"):
            raise HTTPException(status_code=400, detail="Intern Name is required.")

        record = add_intern_record(payload)
        
        # Broadcast real-time update to all connected WebSocket clients
        dashboard_data = get_dashboard_payload()
        await manager.broadcast({
            "event": "excel_updated",
            "message": f"Intern '{record.get('Intern Name')}' added successfully.",
            "data": dashboard_data
        })
        
        return {"status": "success", "message": "Intern record added successfully.", "data": record}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("API Error in POST /intern: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/intern/{s_no}", summary="Update an existing intern record in Excel")
async def update_intern(s_no: int, payload: Dict[str, Any]):
    """Updates an existing intern record by S.No. and broadcasts WebSocket update."""
    try:
        updated = update_intern_record(s_no, payload)
        
        # Broadcast update to all clients
        dashboard_data = get_dashboard_payload()
        await manager.broadcast({
            "event": "excel_updated",
            "message": f"Record #{s_no} updated successfully.",
            "data": dashboard_data
        })
        
        return {"status": "success", "message": "Intern record updated successfully.", "data": updated}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("API Error in PUT /intern/%d: %s", s_no, str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/intern/{s_no}", summary="Delete an intern record from Excel")
async def delete_intern(s_no: int):
    """Deletes an intern record by S.No. and broadcasts WebSocket update."""
    try:
        delete_intern_record(s_no)
        
        dashboard_data = get_dashboard_payload()
        await manager.broadcast({
            "event": "excel_updated",
            "message": f"Record #{s_no} deleted successfully.",
            "data": dashboard_data
        })
        
        return {"status": "success", "message": f"Intern #{s_no} deleted."}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("API Error in DELETE /intern/%d: %s", s_no, str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/excel", summary="Download the raw master Excel database")
def download_excel():
    """Serves the latest Excel file for download."""
    try:
        return FileResponse(
            path=EXCEL_PATH,
            filename="Intern Activity Sheet.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        logger.error("API Error in /download/excel: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/pdf", summary="Generate and download executive PDF report")
def download_pdf():
    """Generates an executive PDF report containing summary stats, clean tables, and formatting."""
    try:
        dashboard_data = get_dashboard_payload()
        records = dashboard_data["records"]
        summary = dashboard_data["summary"]
        columns = dashboard_data["columns"]
        
        pdf_bytes = generate_pdf_report(records, summary, columns)
        
        return StreamingResponse(
            content=iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=Enterprise_Performance_Tracker_Report.pdf"
            }
        )
    except Exception as e:
        logger.error("API Error in /download/pdf: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
