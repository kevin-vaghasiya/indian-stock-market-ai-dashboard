from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StockQuote(BaseModel):
    symbol: str
    company_name: str = ""
    ltp: float  # last traded price
    change: float = 0.0
    percent_change: float = 0.0
    open: float = 0.0
    high: float = 0.0
    low: float = 0.0
    prev_close: float = 0.0
    volume: int = 0


class CompanyInfo(BaseModel):
    symbol: str
    company_name: str = ""
    sector: str = ""
    industry: str = ""
    market_cap: float = 0.0
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    eps: Optional[float] = None
    debt_to_equity: Optional[float] = None
    roe: Optional[float] = None
    book_value: Optional[float] = None
    face_value: Optional[float] = None
    fifty_two_week_high: float = 0.0
    fifty_two_week_low: float = 0.0
    description: str = ""


class NewsItem(BaseModel):
    title: str
    link: str
    published: str = ""
    source: str = ""


class OrderCreate(BaseModel):
    symbol: str
    company_name: str = ""
    side: str  # BUY, SELL
    order_type: str = "MARKET"  # MARKET, LIMIT, STOP_LOSS
    quantity: int
    limit_price: Optional[float] = None


class OrderResponse(BaseModel):
    id: int
    symbol: str
    company_name: str
    order_type: str
    side: str
    quantity: int
    limit_price: Optional[float]
    executed_price: Optional[float]
    status: str
    created_at: datetime
    executed_at: Optional[datetime]

    class Config:
        from_attributes = True


class PositionResponse(BaseModel):
    id: int
    symbol: str
    company_name: str
    quantity: int
    avg_buy_price: float
    current_price: float = 0.0
    unrealized_pnl: float = 0.0
    unrealized_pnl_percent: float = 0.0
    realized_pnl: float
    invested_value: float = 0.0

    class Config:
        from_attributes = True


class WalletResponse(BaseModel):
    cash_balance: float
    invested_value: float
    total_value: float
    total_pnl: float
    total_pnl_percent: float


class AlertCreate(BaseModel):
    symbol: str
    percent_target: float = 5.0
    base_price: float
    direction: str = "ABOVE"
