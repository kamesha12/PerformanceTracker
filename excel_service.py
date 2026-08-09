import os
import logging
import threading
from typing import List, Dict, Any, Tuple
import pandas as pd

logger = logging.getLogger("app_logger")

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "uploads", "Intern Activity Sheet.xlsx")
excel_lock = threading.Lock()

DEFAULT_COLUMNS = [
    "S.No.",
    "Intern Name",
    "Branch",
    "Physical Visits",
    "Telecalling",
    "DSA/Connectors",
    "Promoters/Builders",
    "Weekly Visits",
    "Leads Achieved",
    "Marketing Activity",
    "Insight"
]

SAMPLE_DATA = [
    {
        "S.No.": 1,
        "Intern Name": "Aarav Sharma",
        "Branch": "North Zone - Delhi",
        "Physical Visits": 45,
        "Telecalling": 220,
        "DSA/Connectors": 12,
        "Promoters/Builders": 8,
        "Weekly Visits": 15,
        "Leads Achieved": 38,
        "Marketing Activity": 28,
        "Insight": "High conversion on telecalling leads. Excellent client follow-up."
    },
    {
        "S.No.": 2,
        "Intern Name": "Ananya Roy",
        "Branch": "West Zone - Mumbai",
        "Physical Visits": 62,
        "Telecalling": 180,
        "DSA/Connectors": 18,
        "Promoters/Builders": 14,
        "Weekly Visits": 20,
        "Leads Achieved": 45,
        "Marketing Activity": 32,
        "Insight": "Strong relationship with real estate promoters and channel partners."
    },
    {
        "S.No.": 3,
        "Intern Name": "Rohan Patel",
        "Branch": "West Zone - Ahmedabad",
        "Physical Visits": 38,
        "Telecalling": 250,
        "DSA/Connectors": 9,
        "Promoters/Builders": 6,
        "Weekly Visits": 12,
        "Leads Achieved": 29,
        "Marketing Activity": 22,
        "Insight": "Consistent outreach; potential to increase physical site visits."
    },
    {
        "S.No.": 4,
        "Intern Name": "Priya Nair",
        "Branch": "South Zone - Bengaluru",
        "Physical Visits": 54,
        "Telecalling": 195,
        "DSA/Connectors": 15,
        "Promoters/Builders": 11,
        "Weekly Visits": 18,
        "Leads Achieved": 42,
        "Marketing Activity": 30,
        "Insight": "Top performer in DSA connector acquisitions."
    },
    {
        "S.No.": 5,
        "Intern Name": "Vikram Singh",
        "Branch": "North Zone - Jaipur",
        "Physical Visits": 41,
        "Telecalling": 210,
        "DSA/Connectors": 11,
        "Promoters/Builders": 7,
        "Weekly Visits": 14,
        "Leads Achieved": 31,
        "Marketing Activity": 25,
        "Insight": "Steady weekly progress with strong regional promoter connections."
    },
    {
        "S.No.": 6,
        "Intern Name": "Sneha Kulkarni",
        "Branch": "West Zone - Pune",
        "Physical Visits": 49,
        "Telecalling": 235,
        "DSA/Connectors": 14,
        "Promoters/Builders": 10,
        "Weekly Visits": 16,
        "Leads Achieved": 36,
        "Marketing Activity": 27,
        "Insight": "Effective balance between telecalling outreach and site inspections."
    },
    {
        "S.No.": 7,
        "Intern Name": "Kabir Das",
        "Branch": "East Zone - Kolkata",
        "Physical Visits": 33,
        "Telecalling": 165,
        "DSA/Connectors": 8,
        "Promoters/Builders": 5,
        "Weekly Visits": 10,
        "Leads Achieved": 24,
        "Marketing Activity": 19,
        "Insight": "Targeting new promoter networks to boost lead volume."
    },
    {
        "S.No.": 8,
        "Intern Name": "Diya Verma",
        "Branch": "South Zone - Hyderabad",
        "Physical Visits": 58,
        "Telecalling": 205,
        "DSA/Connectors": 16,
        "Promoters/Builders": 12,
        "Weekly Visits": 19,
        "Leads Achieved": 40,
        "Marketing Activity": 31,
        "Insight": "Exceptional marketing campaign execution and lead closure rate."
    }
]

def init_excel_if_missing():
    """Ensure the uploads folder and Excel database file exist."""
    uploads_dir = os.path.dirname(EXCEL_PATH)
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir, exist_ok=True)
    
    if not os.path.exists(EXCEL_PATH):
        logger.info("Excel database missing. Creating initial dataset at %s", EXCEL_PATH)
        df = pd.DataFrame(SAMPLE_DATA)
        df.to_excel(EXCEL_PATH, index=False, engine='openpyxl')

def read_excel_data() -> Tuple[List[Dict[str, Any]], List[str]]:
    """Read the Excel database dynamically and return records + column headers."""
    init_excel_if_missing()
    with excel_lock:
        try:
            df = pd.read_excel(EXCEL_PATH, engine='openpyxl')
            # Fill NaN values appropriately
            df = df.fillna("")
            
            # Auto fix S.No. if present or missing
            if "S.No." in df.columns:
                df["S.No."] = range(1, len(df) + 1)
            
            columns = df.columns.tolist()
            records = df.to_dict(orient='records')
            
            # Clean numeric types for JSON safety
            cleaned_records = []
            for r in records:
                clean_r = {}
                for k, v in r.items():
                    if isinstance(v, (int, float)) and pd.isna(v):
                        clean_r[k] = 0
                    elif isinstance(v, (float,)):
                        clean_r[k] = int(v) if v.is_integer() else float(v)
                    else:
                        clean_r[k] = v
                cleaned_records.append(clean_r)
                
            return cleaned_records, columns
        except Exception as e:
            logger.error("Error reading Excel file: %s", str(e), exc_info=True)
            raise RuntimeError(f"Failed to read Excel database: {str(e)}")

def write_excel_data(df: pd.DataFrame):
    """Write DataFrame back to Excel file cleanly preserving columns."""
    init_excel_if_missing()
    with excel_lock:
        try:
            # Re-index S.No. dynamically if column exists
            if "S.No." in df.columns:
                df["S.No."] = range(1, len(df) + 1)
            
            df.to_excel(EXCEL_PATH, index=False, engine='openpyxl')
            logger.info("Successfully updated Excel database at %s", EXCEL_PATH)
        except Exception as e:
            logger.error("Error writing Excel file: %s", str(e), exc_info=True)
            raise RuntimeError(f"Failed to write to Excel database: {str(e)}")

def add_intern_record(new_record: Dict[str, Any]) -> Dict[str, Any]:
    """Add a new intern record to the Excel database."""
    records, columns = read_excel_data()
    df = pd.DataFrame(records)

    # Check duplicate intern name
    name_col = "Intern Name" if "Intern Name" in df.columns else columns[1]
    if name_col in df.columns:
        existing_names = [str(name).strip().lower() for name in df[name_col].values]
        new_name = str(new_record.get(name_col, "")).strip().lower()
        if new_name in existing_names:
            raise ValueError(f"An intern named '{new_record.get(name_col)}' already exists in the records.")

    # Prepare complete dictionary matching schema
    row_dict = {}
    for col in columns:
        if col == "S.No.":
            row_dict[col] = len(df) + 1
        elif col in new_record:
            val = new_record[col]
            # Convert numeric strings if possible
            if isinstance(val, str) and val.isdigit():
                val = int(val)
            row_dict[col] = val
        else:
            row_dict[col] = 0 if "Visits" in col or "Calling" in col or "Leads" in col or "Activity" in col else ""

    df = pd.concat([df, pd.DataFrame([row_dict])], ignore_index=True)
    write_excel_data(df)
    return row_dict

def update_intern_record(s_no: int, updated_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing intern record by S.No."""
    records, columns = read_excel_data()
    df = pd.DataFrame(records)

    if "S.No." not in df.columns:
        raise ValueError("Excel file missing 'S.No.' column required for updates.")

    idx_matches = df.index[df["S.No."] == s_no].tolist()
    if not idx_matches:
        raise ValueError(f"Record with S.No. {s_no} not found.")

    row_idx = idx_matches[0]

    for key, val in updated_data.items():
        if key in columns and key != "S.No.":
            # Type casting for numeric columns
            if isinstance(val, str) and val.isdigit():
                val = int(val)
            df.at[row_idx, key] = val

    write_excel_data(df)
    return df.iloc[row_idx].to_dict()

def delete_intern_record(s_no: int):
    """Delete an intern record by S.No."""
    records, columns = read_excel_data()
    df = pd.DataFrame(records)

    if "S.No." not in df.columns:
        raise ValueError("Excel file missing 'S.No.' column required for deletion.")

    df = df[df["S.No."] != s_no]
    write_excel_data(df)

def get_file_mtime() -> float:
    """Get last modification timestamp of Excel file."""
    if os.path.exists(EXCEL_PATH):
        return os.path.getmtime(EXCEL_PATH)
    return 0.0
