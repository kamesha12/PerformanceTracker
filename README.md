# Enterprise Performance Tracker Dashboard

An enterprise-grade, real-time **Performance Tracker Dashboard** built with Python (**FastAPI, Pandas, OpenPyXL, Uvicorn, ReportLab**) and **HTML5, Bootstrap 5, Vanilla JavaScript, Plotly.js, and WebSockets**.

Designed with a high-end corporate aesthetic inspired by **Microsoft Power BI, Microsoft Fabric, Azure Portal, and Tableau**, featuring dark/light theme switching, executive PDF report export, instant multi-field searching/sorting, smart viewport-clamped hover detail popovers, and bi-directional real-time Excel database synchronization.

---

## 🌟 Comprehensive Application Features

### 1. Excel Database Single Source of Truth
- **No SQL Database Required**: Reads directly from `uploads/Intern Activity Sheet.xlsx` as the master database.
- **Dynamic Schema Recognition**: Header column names are detected directly from the Excel sheet.
- **Resilient Data Parsing**: Built-in `safe_int()` parser converts non-numeric strings (such as `'nil'`, `'N/A'`, `'-'`), `None`, and floats safely to `0` without throwing errors.
- **Auto-Generated S.No.**: Automatically recalculates sequential `S.No.` (1 to N) while excluding it from user entry forms.

### 2. Bi-Directional Real-Time Synchronization
- **Instant UI Updates**: Adding or editing intern records in the UI immediately updates `uploads/Intern Activity Sheet.xlsx`.
- **Automatic External File Watcher**: Background file watcher monitors modification timestamps (`mtime`) every 1.5 seconds. Manual edits made to the Excel file outside the application automatically reload the dataset and broadcast live updates to all connected browser tabs via **WebSockets** without requiring page reloads or server restarts.

### 3. Microsoft Power BI / Fabric Aesthetic Layout
- **Left Section (60% width - Analytics Visualizations)**:
  1. **Donut Chart**: Onboarding / Leads Achieved per intern with custom percentage tooltips.
  2. **Horizontal Bar Chart**: Telecalling count per intern, sorted descending with rounded bars and clean mouse pointer interaction.
  3. **Line Chart**: Physical Visits per intern with smooth splines and markers.
  4. **Vertical Bar Chart**: Marketing Activity count per intern with vibrant gradients.
- **Right Section (40% width - Executive Summary & Mini Table)**:
  - **8 Animated Summary Cards**: Total Interns, Physical Visits, Telecalling, Weekly Visits, Leads Achieved, Marketing Activities, DSA/Connectors, Promoters/Builders with number counter roll animations.
  - **Clean Mini Table (No Horizontal Scrolling)**: Displaying #, Intern Name, Branch, Leads Achieved, and Actions.
  - **Smart Viewport-Clamped Hover Detail Card**: Hovering over any intern row displays a floating glassmorphism popover showing full activity metrics, DSA/connectors, promoters/builders, and complete insight text. Automatically adjusts vertical position so the card stays 100% visible inside screen bounds.
  - **Side-by-Side Action Buttons**: Edit and Delete buttons placed neatly together. Detail hover popovers automatically hide when hovering over action buttons for unblocked interaction.

### 4. Theme Support (Light & Dark Modes)
- Dark / Light mode toggle button in the top application header.
- Selected theme is saved in `localStorage` and automatically restored upon reopening.
- Changing theme updates the entire page background, cards, tables, modals, navbar, and Plotly chart color palettes dynamically.

### 5. Executive PDF & Excel Downloads
- **Download Excel**: Serves the latest raw `Intern Activity Sheet.xlsx` file.
- **Download PDF Report**: Generates a professional landscape PDF report via ReportLab featuring executive branding, KPI summary statistics, full formatted data table, timestamp, and running page numbers ("Page X of Y").

### 6. Interactive Search & Multi-Column Sorting
- **Instant Live Search**: Search input filters table records, summary cards, and Plotly charts concurrently by Intern Name or Branch.
- **Multi-Column Sorting**: Sort dropdown (Name, Physical Visits, Telecalling, Leads, Marketing Activity) with Ascending/Descending toggle button.

### 7. Dynamic Form Modals
- **Add Intern Modal**: Dynamic form matching Excel column schema (excluding S.No.), duplicate name warning check, and numeric validation.
- **Edit Intern Modal**: Pre-fills existing record details, saves directly to Excel, and updates the entire dashboard instantly.

---

## 📁 Project Architecture & File Structure

```
D:\git\PerformanceTracker\
├── app.py                     # FastAPI application setup, static mounting, background file watcher
├── routes.py                  # REST API endpoints (GET /interns, GET /dashboard, POST /intern, PUT /intern/{id}, /download/*)
├── excel_service.py           # Thread-safe Excel engine (Pandas, OpenPyXL) & sample data generator
├── dashboard_service.py       # KPI metrics aggregation & Plotly visualization payloads with safe_int parser
├── websocket.py               # WebSocket ConnectionManager for broadcasting live updates
├── models.py                  # Pydantic schemas for data validation
├── pdf_service.py             # Executive PDF Report Generator (ReportLab landscape report)
├── requirements.txt           # Dependency specifications
├── README.md                  # Comprehensive setup & usage guide
├── templates/
│   └── index.html             # Single-page dashboard HTML template
├── static/
│   ├── css/
│   │   └── style.css          # Power BI / Fabric inspired CSS with Light & Dark tokens
│   └── js/
│       └── app.js             # Client JS: WebSockets, Plotly charts, hover detail popovers, theme switching
├── uploads/
│   └── Intern Activity Sheet.xlsx  # Master Excel database
└── logs/
    └── app.log                # Production log file
```

---

## 🚀 How to Launch the Application

### Option A: Launching via VS Code (Recommended)

1. **Open Project in VS Code**:
   - Launch **Visual Studio Code**.
   - Go to **File** -> **Open Folder...** (or press `Ctrl + K, Ctrl + O`).
   - Select the folder **`D:\git\PerformanceTracker`** and click **Select Folder**.

2. **Open Integrated Terminal**:
   - Open terminal by clicking **Terminal** -> **New Terminal** (or press `Ctrl + ~`).
   - Ensure the current terminal directory is `D:\git\PerformanceTracker`.

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   *(If Python 3.13 is installed explicitly, run: `C:\Python313\python.exe -m pip install -r requirements.txt`)*

4. **Start the Application**:
   ```bash
   uvicorn app:app --reload
   ```
   *(Or run: `C:\Python313\python.exe -m uvicorn app:app --reload`)*

5. **Open Browser**:
   Once the console displays `INFO: Uvicorn running on http://127.0.0.1:8000`, open your web browser at:
   ```
   http://127.0.0.1:8000
   ```

---

### Option B: Launching via Standard Command Line / Terminal (PowerShell / CMD)

1. **Open Command Prompt or PowerShell**.
2. **Navigate to the Project Directory**:
   ```bash
   cd /d D:\git\PerformanceTracker
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Start the Server**:
   ```bash
   uvicorn app:app --reload --port 8000
   ```
5. **Access Application**:
   Open browser at `http://127.0.0.1:8000`.

---

## 📊 REST APIs Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/interns` | Returns all records and dynamic schema columns directly from Excel. |
| `GET` | `/dashboard` | Returns aggregated KPI summary cards, chart datasets, and records. Supports `search`, `sort_by`, `sort_order`. |
| `POST` | `/intern` | Inserts a new intern into Excel and broadcasts WebSockets update. |
| `PUT` | `/intern/{s_no}` | Updates an existing intern record in Excel and broadcasts WebSockets update. |
| `DELETE` | `/intern/{s_no}` | Deletes an intern record from Excel. |
| `GET` | `/download/excel` | Serves the master `Intern Activity Sheet.xlsx` file for download. |
| `GET` | `/download/pdf` | Generates and downloads a styled corporate landscape PDF report. |
| `WS` | `/ws` | WebSocket endpoint for real-time live synchronization. |
