import os
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

# SQL Server Database Configuration
SQLSERVER_HOST = os.getenv("SQLSERVER_HOST", "127.0.0.1")
SQLSERVER_PORT = os.getenv("SQLSERVER_PORT", "1433")
SQLSERVER_NAME = os.getenv("SQLSERVER_NAME", "company_db")
SQLSERVER_USER = os.getenv("SQLSERVER_USER", "sa")
SQLSERVER_PASSWORD = os.getenv("SQLSERVER_PASSWORD", "1234")
SQLSERVER_DRIVER = os.getenv("SQLSERVER_DRIVER", "ODBC Driver 17 for SQL Server")
SQLSERVER_TRUSTED_CONNECTION = os.getenv("SQLSERVER_TRUSTED_CONNECTION", "no")

def build_connection_string(database=None, driver=None):
    db_name = database if database else SQLSERVER_NAME
    drv = driver if driver else SQLSERVER_DRIVER
    
    # If host includes instance name like localhost\SQLEXPRESS or port
    server_str = SQLSERVER_HOST
    if "," not in server_str and "\\" not in server_str and SQLSERVER_PORT:
        server_str = f"{SQLSERVER_HOST},{SQLSERVER_PORT}"
        
    if SQLSERVER_TRUSTED_CONNECTION.lower() in ("yes", "true", "1"):
        return (
            f"DRIVER={{{drv}}};"
            f"SERVER={server_str};"
            f"DATABASE={db_name};"
            f"Trusted_Connection=yes;"
            f"TrustServerCertificate=yes;"
        )
    else:
        return (
            f"DRIVER={{{drv}}};"
            f"SERVER={server_str};"
            f"DATABASE={db_name};"
            f"UID={SQLSERVER_USER};"
            f"PWD={SQLSERVER_PASSWORD};"
            f"TrustServerCertificate=yes;"
        )

SQLSERVER_CONN_STR = build_connection_string()
