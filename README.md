# Enterprise Performance Tracker Dashboard - Microsoft SQL Server Engine (`company_db`)

An enterprise-grade, real-time **Performance Tracker Dashboard** built with Python (**FastAPI, Microsoft SQL Server, pyodbc, Pandas, OpenPyXL, Uvicorn, ReportLab**) and **HTML5, Bootstrap 5, Vanilla JavaScript, Plotly.js, and WebSockets**.

Designed with a high-end corporate aesthetic inspired by **Microsoft Power BI, Microsoft Fabric, Azure Portal, and Tableau**, featuring dark/light theme switching, executive PDF report export, instant multi-field searching/sorting, smart viewport-clamped hover detail popovers, and pure Microsoft SQL Server database synchronization (`company_db`).

---

## 🌟 Application Features & Architecture Highlights

### 1. Pure Microsoft SQL Server Database Engine (`company_db`)
- **No File Dependencies**: All intern records, activity metrics, and insights are stored and managed directly inside **Microsoft SQL Server** in database **`company_db`** (table `dbo.intern_performance`).
- **Separate Configuration (`config.py` & `.env`)**: Database connection parameters are maintained cleanly in `config.py` and `.env`.
- **In-Memory Excel Export**: `/download/excel` dynamically generates an in-memory `.xlsx` file (`BytesIO`) directly from SQL Server records on-the-fly without writing temporary files to disk.

---

## 🗄️ SQL Server Connection Configuration & DDL Queries

### 1. Environment Configuration (`.env` & `config.py`)
Database settings are specified in `D:\git\PerformanceTracker\.env`:

```env
# Microsoft SQL Server Environment Configuration
SQLSERVER_HOST=127.0.0.1
SQLSERVER_PORT=1433
SQLSERVER_NAME=company_db
SQLSERVER_USER=sa
SQLSERVER_PASSWORD=1234
SQLSERVER_DRIVER=ODBC Driver 17 for SQL Server
SQLSERVER_TRUSTED_CONNECTION=no
```

---

### 2. Microsoft SQL Server T-SQL Script (`schema_sqlserver.sql`)

Run the script in **SQL Server Management Studio (SSMS)**, **Azure Data Studio**, or **sqlcmd** to manually set up your SQL Server database:

```sql
-- 1. Create Database company_db
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'company_db')
BEGIN
    CREATE DATABASE company_db;
END
GO

USE company_db;
GO

-- 2. Create Table intern_performance
IF OBJECT_ID('dbo.intern_performance', 'U') IS NOT NULL
    DROP TABLE dbo.intern_performance;
GO

CREATE TABLE dbo.intern_performance (
    s_no INT IDENTITY(1,1) PRIMARY KEY,
    intern_name NVARCHAR(255) NOT NULL,
    branch NVARCHAR(255),
    physical_visits INT DEFAULT 0,
    telecalling INT DEFAULT 0,
    dsa_connectors INT DEFAULT 0,
    promoters_builders INT DEFAULT 0,
    weekly_visits INT DEFAULT 0,
    leads_achieved INT DEFAULT 0,
    marketing_activity INT DEFAULT 0,
    insight NVARCHAR(MAX)
);
GO
```

---

## 🚀 How to Run the Application

### Launch Command (PowerShell):
```powershell
C:\Python313\python.exe -m uvicorn app:app --reload
```
Open **`http://127.0.0.1:8000`** in your browser!
