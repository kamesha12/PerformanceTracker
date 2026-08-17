from typing import Dict, Any
from datetime import datetime
from db_service import get_all_records

def get_dashboard_payload(search_query: str = "", sort_by: str = "", sort_order: str = "asc") -> Dict[str, Any]:
    """
    Returns executive analytics summary, chart visualization arrays, 
    and table records directly from Microsoft SQL Server database.
    """
    data = get_all_records(search_query=search_query, sort_by=sort_by, sort_order=sort_order)
    data["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return data
