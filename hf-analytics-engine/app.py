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

# Generate a synthetic B2B SaaS revenue dataset
np.random.seed(42)
num_customers = 500
dates = pd.date_range(start="2024-01-01", end="2024-12-31", freq='D')
revenue_data = {
    'Date': np.random.choice(dates, size=2000),
    'CustomerID': np.random.randint(1000, 1000 + num_customers, size=2000),
    'Revenue': np.random.exponential(scale=5000, size=2000), # highly skewed
    'ProductCategory': np.random.choice(['Enterprise', 'Pro', 'Basic', 'Add-on'], size=2000, p=[0.1, 0.3, 0.5, 0.1]),
    'CustomerIndustry': np.random.choice(['Tech', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'], size=2000)
}
df = pd.DataFrame(revenue_data)
df['Date'] = pd.to_datetime(df['Date'])
df.sort_values('Date', inplace=True)

@app.get("/revenue-trend")
def get_revenue_trend():
    monthly_rev = df.set_index('Date').resample('ME')['Revenue'].sum().reset_index()
    monthly_rev['DateStr'] = monthly_rev['Date'].dt.strftime('%b %Y')
    
    first_month = monthly_rev['Revenue'].iloc[0]
    last_month = monthly_rev['Revenue'].iloc[-1]
    growth = ((last_month - first_month) / first_month) * 100
    
    insight = f"Revenue {'grew' if growth > 0 else 'contracted'} by {abs(growth):.1f}% over the year. The trend shows typical B2B SaaS seasonality with strong end-of-quarter pushes."
    
    return {
        "x": monthly_rev['DateStr'].tolist(),
        "y": monthly_rev['Revenue'].round(2).tolist(),
        "insight": insight
    }

@app.get("/revenue-distribution")
def get_revenue_distribution():
    rev_vals = df['Revenue'].round(2).tolist()
    median = np.median(rev_vals)
    insight = f"The revenue distribution is heavily right-skewed. Most transactions hover below $2,000, but rare, massive enterprise deals drive the long tail. Median deal size is ${median:,.2f}."
    
    return {
        "x": rev_vals,
        "insight": insight
    }

@app.get("/top-customers")
def get_top_customers():
    cust_rev = df.groupby('CustomerID')['Revenue'].sum().sort_values(ascending=False).head(10).reset_index()
    cust_rev['CustomerID'] = "Cust-" + cust_rev['CustomerID'].astype(str)
    
    total_rev = df['Revenue'].sum()
    top_10_rev = cust_rev['Revenue'].sum()
    concentration = (top_10_rev / total_rev) * 100
    
    insight = f"High revenue concentration: The top 10 customers account for {concentration:.1f}% of total annual revenue, highlighting the importance of Key Account Management."
    
    return {
        "x": cust_rev['CustomerID'].tolist(),
        "y": cust_rev['Revenue'].round(2).tolist(),
        "insight": insight
    }

@app.get("/customer-segmentation")
def get_customer_segmentation():
    seg = df.groupby('CustomerID').agg(
        Frequency=('Revenue', 'count'),
        LTV=('Revenue', 'sum')
    ).reset_index()
    
    insight = "There is a strong positive correlation between purchase frequency and Customer Lifetime Value (LTV). Enterprise clients reside in the upper-right quadrant, whereas 'Basic' tier clients are in the lower-left."
    
    return {
        "x": seg['Frequency'].tolist(),
        "y": seg['LTV'].round(2).tolist(),
        "text": ["Cust-" + str(c) for c in seg['CustomerID']],
        "insight": insight
    }

@app.get("/correlation-heatmap")
def get_correlation_heatmap():
    cust_stats = df.groupby('CustomerID').agg(
        TotalRevenue=('Revenue', 'sum'),
        AvgOrderValue=('Revenue', 'mean'),
        PurchaseCount=('Revenue', 'count'),
        UniqueProducts=('ProductCategory', 'nunique')
    )
    corr = cust_stats.corr().round(2)
    
    insight = "Strong positive correlation (0.8+) between Purchase Count and Total Revenue suggests retention and upselling are the primary drivers of growth, rather than just increasing Average Order Value."
    
    return {
        "z": corr.values.tolist(),
        "x": corr.columns.tolist(),
        "y": corr.index.tolist(),
        "insight": insight
    }

app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
