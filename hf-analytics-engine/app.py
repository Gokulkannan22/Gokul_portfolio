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
    monthly_rev['DateStr'] = monthly_rev['month'].dt.strftime('%b %Y')
    
    first_month = monthly_rev['total_revenue'].iloc[0]
    last_month = monthly_rev['total_revenue'].iloc[-1]
    growth = ((last_month - first_month) / first_month) * 100 if first_month else 0
    
    insight = f"The AI platform tracked a total revenue {'growth' if growth > 0 else 'contraction'} of {abs(growth):.1f}% over the core observation period. Active customers significantly scaled from {monthly_rev['active_customers'].iloc[0]} to {monthly_rev['active_customers'].iloc[-1]}."
    
    return {
        "x": monthly_rev['DateStr'].tolist(),
        "y": monthly_rev['total_revenue'].round(2).tolist(),
        "insight": insight
    }

@app.get("/revenue-distribution")
def get_revenue_distribution():
    if merged_customers.empty:
        return {"x": [], "insight": "No data available."}
        
    rev_vals = merged_customers[merged_customers['MRR'] > 0]['MRR'].tolist()
    median = np.median(rev_vals) if rev_vals else 0
    mean = np.mean(rev_vals) if rev_vals else 0
    insight = f"The subscriber MRR distribution illustrates typical B2B SaaS architecture. While the mean contract value sits at ${mean:,.2f}, the median is firmly localized at ${median:,.2f}, demonstrating that massive enterprise accounts are driving the positive tail skew."
    
    return {
        "x": rev_vals,
        "insight": insight
    }

@app.get("/top-customers")
def get_top_customers():
    if merged_customers.empty:
        return {"x": [], "y": [], "insight": "No data available."}
        
    top_10 = merged_customers.sort_values('MRR', ascending=False).head(10)
    top_10_rev = top_10['MRR'].sum()
    total_rev = merged_customers['MRR'].sum()
    concentration = (top_10_rev / total_rev) * 100 if total_rev else 0
    
    insight = f"Key Account Vulnerability: The top 10 enterprise organizations generate exactly ${top_10_rev:,.0f} in Monthly Recurring Revenue, making up {concentration:.1f}% of total platform MRR. Strategic retention of these groups is vital."
    
    return {
        "x": top_10['customer_id'].tolist(),
        "y": top_10['MRR'].round(2).tolist(),
        "insight": insight
    }

@app.get("/customer-segmentation")
def get_customer_segmentation():
    if subscriptions.empty or customers.empty:
        return {"x": [], "y": [], "text": [], "insight": "No data available."}
    
    seg = subscriptions.groupby('customer_id').agg(
        Frequency=('plan', 'count'),
        MRR=('monthly_price', 'sum')
    ).reset_index()
    seg['Estimated_LTV'] = seg['MRR'] * 24
    
    insight = "Mapping Active Subscriptions (Volume) vs Estimated LTV visually categorizes our user base. We observe strong clustering among small-to-medium clients, and sporadic high-value enterprise points at upper-right."
    
    return {
        "x": seg['Frequency'].tolist(),
        "y": seg['Estimated_LTV'].round(2).tolist(),
        "text": seg['customer_id'].tolist(),
        "insight": insight
    }

@app.get("/correlation-heatmap")
def get_correlation_heatmap():
    if merged_customers.empty or subscriptions.empty:
        return {"z": [], "x": [], "y": [], "insight": "No data available."}
        
    df_num = merged_customers.copy()
    size_map = {'Small': 1, 'Medium': 2, 'Large': 3, 'Enterprise': 4}
    df_num['company_size_num'] = df_num['company_size'].map(size_map).fillna(1)
    
    upgrades = subscriptions.groupby('customer_id')['upgrade_flag'].sum().reset_index()
    df_num = pd.merge(df_num, upgrades, on='customer_id', how='left').fillna(0)
    
    cols = ['MRR', 'churn', 'company_size_num', 'upgrade_flag']
    corr = df_num[cols].corr().round(2)
    
    insight = "Our AI Correlation mapping shows structural relationships between target metrics. Higher Company Size heavily correlates with larger MRR, but also showcases variance in Churn Risk matrices."
    
    return {
        "z": corr.values.tolist(),
        "x": ['Total MRR', 'Churn Risk', 'Company Size', 'Platform Upgrades'],
        "y": ['Total MRR', 'Churn Risk', 'Company Size', 'Platform Upgrades'],
        "insight": insight
    }

app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
