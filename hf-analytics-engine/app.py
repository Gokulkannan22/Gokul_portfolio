from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pandas as pd
import numpy as np
import os

app = FastAPI(title="Interactive Analytics Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load real B2B SaaS dataset
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

try:
    monthly_revenue = pd.read_csv(os.path.join(DATA_DIR, "monthly_revenue.csv"))
    subscriptions = pd.read_csv(os.path.join(DATA_DIR, "subscriptions.csv"))
    customers = pd.read_csv(os.path.join(DATA_DIR, "customers.csv"))
    
    # Pre-process for quick endpoints
    monthly_revenue['month'] = pd.to_datetime(monthly_revenue['month'])
    monthly_revenue.sort_values('month', inplace=True)
    monthly_revenue['monthly_revenue'] = monthly_revenue['total_revenue'].diff().fillna(monthly_revenue['total_revenue'])
    monthly_revenue['DateStr'] = monthly_revenue['month'].dt.strftime('%b %Y')
    monthly_revenue['arpu'] = monthly_revenue['total_revenue'] / monthly_revenue['active_customers']
    
    customer_mrr = subscriptions.groupby('customer_id')['monthly_price'].sum().reset_index()
    customer_mrr.rename(columns={'monthly_price': 'MRR'}, inplace=True)
    merged_customers = pd.merge(customers, customer_mrr, on='customer_id', how='left').fillna({'MRR': 0})
except Exception as e:
    print("Error loading dataset:", e)
    monthly_revenue = pd.DataFrame()
    subscriptions = pd.DataFrame()
    merged_customers = pd.DataFrame()

@app.get("/revenue-trend")
def get_revenue_trend():
    if monthly_revenue.empty:
        return {"x": [], "y": [], "insight": "No data available."}
        
    monthly_rev = monthly_revenue.copy()
    
    first_month = monthly_rev['total_revenue'].iloc[0]
    last_month = monthly_rev['total_revenue'].iloc[-1]
    growth = ((last_month - first_month) / first_month) * 100 if first_month else 0
    
    insight = f"The AI platform tracked a total revenue {'growth' if growth > 0 else 'contraction'} of {abs(growth):.1f}% over the core observation period. Active customers significantly scaled from {monthly_rev['active_customers'].iloc[0]} to {monthly_rev['active_customers'].iloc[-1]}."
    
    return {
        "x": monthly_rev['DateStr'].tolist(),
        "y": monthly_rev['monthly_revenue'].round(2).tolist(),
        "insight": insight
    }

@app.get("/active-customers")
def get_active_customers():
    if monthly_revenue.empty:
        return {"x": [], "y": [], "insight": "No data available."}
        
    return {
        "x": monthly_revenue["DateStr"].tolist(),
        "y": monthly_revenue["active_customers"].tolist(),
        "insight": "Active customer base growth over time."
    }

@app.get("/churn-trend")
def get_churn_trend():
    if monthly_revenue.empty:
        return {"x": [], "y": [], "insight": "No data available."}
        
    return {
        "x": monthly_revenue["DateStr"].tolist(),
        "y": monthly_revenue["churn_count"].tolist(),
        "insight": "Monthly churn trend showing customer loss over time."
    }

@app.get("/arpu-trend")
def get_arpu_trend():
    if monthly_revenue.empty:
        return {"x": [], "y": [], "insight": "No data available."}
        
    return {
        "x": monthly_revenue["DateStr"].tolist(),
        "y": monthly_revenue["arpu"].round(2).tolist(),
        "insight": "Average Revenue Per User (ARPU) trend over time."
    }

@app.get("/correlation-heatmap")
def get_correlation_heatmap():
    if monthly_revenue.empty:
        return {"z": [], "x": [], "y": [], "insight": "No data available."}
        
    corr = monthly_revenue[["total_revenue", "active_customers", "churn_count", "arpu"]].corr().round(2)
    
    insight = "Correlation between total revenue, active customers, churn count, and ARPU."
    
    return {
        "z": corr.values.tolist(),
        "x": ["Total Revenue", "Active Customers", "Churn Count", "ARPU"],
        "y": ["Total Revenue", "Active Customers", "Churn Count", "ARPU"],
        "insight": insight
    }

app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
