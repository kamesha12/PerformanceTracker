from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class InternRecord(BaseModel):
    s_no: Optional[int] = Field(None, alias="S.No.")
    intern_name: str = Field(..., alias="Intern Name")
    branch: str = Field(..., alias="Branch")
    physical_visits: int = Field(0, alias="Physical Visits")
    telecalling: int = Field(0, alias="Telecalling")
    dsa_connectors: int = Field(0, alias="DSA/Connectors")
    promoters_builders: int = Field(0, alias="Promoters/Builders")
    weekly_visits: int = Field(0, alias="Weekly Visits")
    leads_achieved: int = Field(0, alias="Leads Achieved")
    marketing_activity: int = Field(0, alias="Marketing Activity")
    insight: Optional[str] = Field("", alias="Insight")

    class Config:
        populate_by_name = True

class DynamicInternPayload(BaseModel):
    data: Dict[str, Any]

class SummaryCards(BaseModel):
    total_interns: int = 0
    total_physical_visits: int = 0
    total_telecalling: int = 0
    total_weekly_visits: int = 0
    total_leads_achieved: int = 0
    total_marketing_activities: int = 0
    total_dsa_connectors: int = 0
    total_promoters_builders: int = 0

class ChartData(BaseModel):
    donut_leads: List[Dict[str, Any]]
    bar_telecalling: List[Dict[str, Any]]
    line_physical_visits: List[Dict[str, Any]]
    bar_marketing: List[Dict[str, Any]]

class DashboardResponse(BaseModel):
    summary: SummaryCards
    charts: ChartData
    records: List[Dict[str, Any]]
    columns: List[str]
    last_updated: str

class BulkDeleteRequest(BaseModel):
    s_nos: List[int]

class BulkUpdateRequest(BaseModel):
    s_nos: List[int]
    update_data: Dict[str, Any]
