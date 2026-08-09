from typing import List, Dict, Any
from datetime import datetime
import pandas as pd
from excel_service import read_excel_data

def safe_int(val: Any) -> int:
    """Safely convert any value (including 'nil', 'N/A', '-', None, float) to integer."""
    if val is None or pd.isna(val):
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    val_str = str(val).strip().lower()
    if not val_str or val_str in ['nil', 'n/a', 'none', '-', 'null']:
        return 0
    try:
        return int(float(val_str))
    except (ValueError, TypeError):
        return 0

def get_dashboard_payload(search_query: str = "", sort_by: str = "", sort_order: str = "asc") -> Dict[str, Any]:
    """
    Compute executive analytics summary, chart visualization arrays, 
    and table records from Excel source data with resilient numeric parsing.
    """
    records, columns = read_excel_data()

    # 1. Filter by search query if provided (case-insensitive substring on Intern Name or Branch)
    filtered_records = []
    query = search_query.strip().lower()
    for r in records:
        intern_name = str(r.get("Intern Name", "")).lower()
        branch = str(r.get("Branch", "")).lower()
        if not query or query in intern_name or query in branch:
            filtered_records.append(r)

    # 2. Sort records if requested
    if sort_by and filtered_records:
        reverse = (sort_order.lower() == "desc")
        
        field_map = {
            "name": "Intern Name",
            "physical": "Physical Visits",
            "telecalling": "Telecalling",
            "leads": "Leads Achieved",
            "marketing": "Marketing Activity"
        }
        col_key = field_map.get(sort_by.lower(), sort_by)

        if col_key in filtered_records[0]:
            def sort_key(item):
                val = item.get(col_key, 0)
                if isinstance(val, str):
                    if val.strip().isdigit():
                        return safe_int(val)
                    return val.lower()
                return safe_int(val)
            
            filtered_records.sort(key=sort_key, reverse=reverse)

    # 3. Calculate Executive Summary Stats safely
    total_interns = len(filtered_records)
    total_physical_visits = sum(safe_int(r.get("Physical Visits")) for r in filtered_records)
    total_telecalling = sum(safe_int(r.get("Telecalling")) for r in filtered_records)
    total_weekly_visits = sum(safe_int(r.get("Weekly Visits")) for r in filtered_records)
    total_leads_achieved = sum(safe_int(r.get("Leads Achieved")) for r in filtered_records)
    total_marketing_activities = sum(safe_int(r.get("Marketing Activity")) for r in filtered_records)
    total_dsa_connectors = sum(safe_int(r.get("DSA/Connectors")) for r in filtered_records)
    total_promoters_builders = sum(safe_int(r.get("Promoters/Builders")) for r in filtered_records)

    summary_cards = {
        "total_interns": total_interns,
        "total_physical_visits": total_physical_visits,
        "total_telecalling": total_telecalling,
        "total_weekly_visits": total_weekly_visits,
        "total_leads_achieved": total_leads_achieved,
        "total_marketing_activities": total_marketing_activities,
        "total_dsa_connectors": total_dsa_connectors,
        "total_promoters_builders": total_promoters_builders
    }

    # 4. Prepare Plotly Chart Data Arrays

    # Donut Chart: Leads Achieved
    donut_leads = []
    for r in filtered_records:
        leads = safe_int(r.get("Leads Achieved"))
        pct = round((leads / total_leads_achieved * 100), 1) if total_leads_achieved > 0 else 0
        donut_leads.append({
            "labels": str(r.get("Intern Name", "Unknown")),
            "values": leads,
            "percentage": pct
        })

    # Horizontal Bar Chart: Telecalling (Sorted High to Low)
    bar_telecalling = []
    telecalling_sorted = sorted(filtered_records, key=lambda x: safe_int(x.get("Telecalling")), reverse=True)
    for r in telecalling_sorted:
        bar_telecalling.append({
            "name": str(r.get("Intern Name", "Unknown")),
            "count": safe_int(r.get("Telecalling"))
        })

    # Line Chart: Physical Visits
    line_physical_visits = []
    for r in filtered_records:
        line_physical_visits.append({
            "name": str(r.get("Intern Name", "Unknown")),
            "visits": safe_int(r.get("Physical Visits"))
        })

    # Vertical Bar Chart: Marketing Activity
    bar_marketing = []
    for r in filtered_records:
        bar_marketing.append({
            "name": str(r.get("Intern Name", "Unknown")),
            "count": safe_int(r.get("Marketing Activity"))
        })

    chart_data = {
        "donut_leads": donut_leads,
        "bar_telecalling": bar_telecalling,
        "line_physical_visits": line_physical_visits,
        "bar_marketing": bar_marketing
    }

    return {
        "summary": summary_cards,
        "charts": chart_data,
        "records": filtered_records,
        "columns": columns,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
