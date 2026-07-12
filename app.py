import os
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any, List

from data_generator import generate_startup_data
from model import train_models

app = FastAPI(title="Groundwork API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
clf_model = None
reg_model = None
model_metrics = None
startups_df = None

def init_system():
    global clf_model, reg_model, model_metrics, startups_df
    
    # Ensure data exists
    if not os.path.exists('data/startups.csv'):
        print("Data not found, generating...")
        generate_startup_data()
        
    startups_df = pd.read_csv('data/startups.csv')
    
    # Ensure models exist
    if not os.path.exists('models/classifier.joblib') or not os.path.exists('models/regressor.joblib'):
        print("Models not found, training...")
        train_models()
        
    try:
        clf_model = joblib.load('models/classifier.joblib')
        reg_model = joblib.load('models/regressor.joblib')
        model_metrics = joblib.load('models/metrics.joblib')
    except Exception as e:
        print(f"Error loading models: {e}. Retraining...")
        train_models()
        clf_model = joblib.load('models/classifier.joblib')
        reg_model = joblib.load('models/regressor.joblib')
        model_metrics = joblib.load('models/metrics.joblib')

# Initialize on import
init_system()

# Request schema
class StartupPredictionInput(BaseModel):
    sector: str
    stage: str
    founder_score: float
    team_size: int
    tam: float
    competitors: int
    revenue: float
    burn_rate: float
    total_raised: float
    yoy_growth: float
    mom_growth: float
    cac: float
    ltv: float
    nps: float
    churn: float
    traffic_growth: float

@app.get("/api/startups")
def get_startups():
    global startups_df
    if startups_df is None:
        init_system()
    records = startups_df.to_dict(orient="records")
    return records

@app.get("/api/metrics")
def get_metrics():
    global model_metrics
    if model_metrics is None:
        init_system()
    return model_metrics

class ChatMessage(BaseModel):
    message: str

@app.post("/api/chat")
def chat_bot(msg: ChatMessage):
    user_query = msg.message.lower().strip()
    reply = ""
    suggestions = []
    
    if "tam" in user_query or "market size" in user_query or "market address" in user_query:
        reply = (
            "**Total Addressable Market (TAM)** is the maximum annual revenue opportunity available if a startup captured 100% of its target sector. "
            "In venture capital, we generally target a TAM > $5 Billion. "
            "Think of TAM as the *total size of the market cake*. If the cake is tiny, even a large slice won't feed a massive company. "
            "Venture capitalist networks require large market sizes to accommodate hockey-stick return growth."
        )
        suggestions = ["What is LTV/CAC?", "How to evaluate a Seed startup?", "Tell me about Churn"]
        
    elif "burn rate" in user_query or "burn" in user_query or "monthly burn" in user_query:
        reply = (
            "**Monthly Burn Rate** is the net rate at which a company spends its cash reserves to cover operating expenses before reaching positive operational cash flow. "
            "For example, if a startup spends $50,000 a month and makes $10,000, its net monthly burn is $40,000. "
            "Think of it as *how fast fuel is consumed to keep the ship moving*. A high burn rate is dangerous if the runway is short."
        )
        suggestions = ["What is Runway?", "What is a safe runway margin?", "How does Groundwork classify risk?"]
        
    elif "runway" in user_query or "cash" in user_query or "solvency" in user_query:
        reply = (
            "**Capital Runway** measures the number of months a company can operate before running out of money, calculated as `Current Capital Reserves / Monthly Net Burn`. "
            "A standard, healthy runway for a startup is **18 to 24 months** to allow ample time to reach milestones or raise another funding round. "
            "Think of it as *the time remaining before the plane runs out of fuel*."
        )
        suggestions = ["What is Burn Rate?", "How is runway calculated?", "Tell me about Funding Stages"]
        
    elif "ltv" in user_query or "cac" in user_query or "unit economics" in user_query:
        reply = (
            "**LTV / CAC** is the unit economic efficiency ratio. "
            "**LTV (Customer Lifetime Value)** is the total net profit a customer brings over their lifespan, while **CAC (Customer Acquisition Cost)** is the cost to acquire one customer. "
            "In venture capital, **the golden ratio is > 3.0x** (meaning LTV should be at least three times the CAC). "
            "Think of LTV as *the weight of the fish caught* and CAC as *the cost of the bait*."
        )
        suggestions = ["Explain Churn Rate", "What is NPS?", "What makes a startup 'Strong Buy'?"]
        
    elif "churn" in user_query or "attrition" in user_query or "retention" in user_query:
        reply = (
            "**Churn Rate** is the percentage of customers who cancel their subscriptions or stop buying each month. "
            "High churn (e.g., > 5% monthly for SaaS) is a major red flag because it indicates customers are unhappy with the product. "
            "Think of it as *water leaking out of the bottom of the bucket*. No matter how much money you spend on marketing (pouring water in), the bucket will empty."
        )
        suggestions = ["Read Case #1 (Leaky SaaS)", "What is LTV/CAC?", "How is churn calculated?"]
        
    elif "nps" in user_query or "promoter" in user_query or "satisfaction" in user_query:
        reply = (
            "**Net Promoter Score (NPS)** ranges from -100 to +100 and measures customer satisfaction and willingness to recommend the product to others. "
            "An NPS score above **+40** indicates strong Product-Market Fit (PMF). "
            "Think of NPS as *the volume of cheers from the audience*."
        )
        suggestions = ["What is Product-Market Fit?", "Explain LTV/CAC", "Tell me about Churn"]
        
    elif "groundwork" in user_query or "model" in user_query or "accuracy" in user_query or "random forest" in user_query:
        reply = (
            "**Groundwork** is an ML-powered predictor that uses Random Forest Classifier and Regressor models. "
            "The model is trained on a simulated cohort of 1,000 startups across key parameters like TAM, YoY growth, founder index, and unit economics. "
            "Groundwork achieves a **classification accuracy of ~84%** and captures **76% of variance (R² score)** for ROI predictions."
        )
        suggestions = ["What are ML Diagnostics?", "What is R2 score?", "View Feature Importance weights"]
        
    elif "stage" in user_query or "funding" in user_query or "pre-seed" in user_query or "seed" in user_query or "series a" in user_query or "series b" in user_query:
        reply = (
            "Startups raise capital in progressive rounds: \n"
            "1. **Pre-seed**: Idea phase, building prototype (MVP). VCs audit founder experience.\n"
            "2. **Seed**: Product validation, early sales. VCs evaluate TAM and NPS.\n"
            "3. **Series A**: Market scaling. VCs focus heavily on unit economics (LTV/CAC > 3x).\n"
            "4. **Series B**: Full market expansion. VCs evaluate retention, runway, and competitors."
        )
        suggestions = ["How to invest in Seed?", "What is Series A?", "Go to Practice Arena"]
        
    elif "invest" in user_query or "criteria" in user_query or "how to buy" in user_query:
        reply = (
            "When analyzing an investment, Groundwork looks for these threshold indicators: \n"
            "• **LTV / CAC Ratio**: Ideal is > 3.0x (unit-economic efficiency).\n"
            "• **Capital Runway**: Ideal is > 18 months (solvency buffer).\n"
            "• **Monthly Churn**: Ideal is < 2.0% (customer retention).\n"
            "• **YoY Revenue Growth**: Ideal is > 80% (top-line scale velocity).\n"
            "• **TAM**: Ideal is > $5 Billion (growth capacity ceiling)."
        )
    elif "market" in user_query or "stock" in user_query or "broker" in user_query or "groww" in user_query or "zerodha" in user_query or "upstox" in user_query:
        reply = (
            "The broader investment market includes public equities (stocks), mutual funds, and fixed-income assets. "
            "While Groundwork focuses on high-growth venture capital (private startups), public stock investing is highly recommended for balanced diversification. "
            "You can invest in public stocks and mutual funds using registered platforms like **Zerodha** (known for its robust technical indicators) and **Groww** (known for its simple, beginner-friendly UI). "
            "Private startup investments (VC) are high-risk with multi-year lock-ins, whereas public markets offer instant trading liquidity."
        )
        suggestions = ["What are VC guidelines?", "How to invest in Seed?", "What is LTV/CAC?"]
        
    else:
        reply = (
            "Hello! I am **NIFTY**, your investment copilot. I can help you answer questions about: \n"
            "• **Startup Vetting Metrics** (TAM, Churn, LTV/CAC, Burn Rate, Runway).\n"
            "• **Funding Stages** (Pre-seed, Seed, Series A, Series B).\n"
            "• **Groundwork ML Architecture** (Diagnostics, feature importances).\n"
            "• **Investment Guidelines** (when to buy, when to pass)."
        )
        suggestions = ["What is LTV/CAC?", "Explain Burn Rate", "How does Groundwork work?"]
        
    return {"reply": reply, "suggestions": suggestions}


@app.post("/api/predict")
def predict_startup(input_data: StartupPredictionInput):
    global clf_model, reg_model
    if clf_model is None or reg_model is None:
        init_system()
        
    runway = round(input_data.total_raised / input_data.burn_rate, 1) if input_data.burn_rate > 0 else 99.0
    ltv_cac = round(input_data.ltv / input_data.cac, 2) if input_data.cac > 0 else 0.0
    
    input_dict = input_data.model_dump()
    input_dict['runway'] = runway
    input_dict['ltv_cac'] = ltv_cac
    
    input_df = pd.DataFrame([input_dict])
    
    try:
        growth_class = clf_model.predict(input_df)[0]
        growth_probs = clf_model.predict_proba(input_df)[0]
        classes = clf_model.classes_
        
        prob_dict = {cls: float(prob) for cls, prob in zip(classes, growth_probs)}
        predicted_roi = float(reg_model.predict(input_df)[0])
        predicted_roi = max(0.0, round(predicted_roi, 2))
        
        high_prob = prob_dict.get('High', 0.0)
        med_prob = prob_dict.get('Medium', 0.0)
        success_score = round((high_prob * 100) + (med_prob * 40) + (min(10.0, predicted_roi) * 4), 1)
        success_score = max(5.0, min(99.0, success_score))
        
        if success_score >= 75.0 and predicted_roi >= 4.0:
            recommendation = "Strong Buy"
            rec_color = "#10B981" # Emerald Green
            rec_details = "This startup demonstrates elite unit economics, a large addressable market, and strong founder scoring. The risk-adjusted return profile is exceptionally high."
        elif success_score >= 50.0 and predicted_roi >= 1.8:
            recommendation = "Buy"
            rec_color = "#3B82F6" # Blue
            rec_details = "Solid indicators across core metrics. Moderate runway risk or competition may exist, but the growth vector points to a viable return on capital."
        elif success_score >= 35.0 or predicted_roi >= 1.0:
            recommendation = "Hold"
            rec_color = "#F59E0B" # Amber/Yellow
            rec_details = "Promising signs, but unit economics (e.g., LTV/CAC) or founder metrics are average. Wait for further validation or milestones before investing."
        else:
            recommendation = "Pass"
            rec_color = "#EF4444" # Red
            rec_details = "High burn rate, low customer efficiency, or restricted runway. The data suggests a high probability of capital loss; investment is not recommended at this stage."
            
        # Strengths and Risks
        strengths = []
        risks = []
        
        if input_data.founder_score >= 8.0:
            strengths.append("Exceptional founding team experience.")
        elif input_data.founder_score < 4.0:
            risks.append("Relatively inexperienced founders; team capability requires assessment.")
            
        if ltv_cac >= 4.0:
            strengths.append(f"Outstanding unit economics (LTV/CAC = {ltv_cac:.1f}x).")
        elif ltv_cac < 2.0:
            risks.append(f"Inefficient unit economics (LTV/CAC = {ltv_cac:.1f}x; ideal is > 3.0x).")
            
        if runway >= 18.0:
            strengths.append(f"Healthy capital runway ({runway:.1f} months).")
        elif runway < 9.0:
            risks.append(f"Tight runway of {runway:.1f} months. Requires imminent refinancing.")
            
        if input_data.yoy_growth >= 100.0:
            strengths.append(f"Hyper-growth trajectory ({input_data.yoy_growth:.1f}% YoY).")
        elif input_data.yoy_growth < 25.0:
            risks.append(f"Stagnating growth ({input_data.yoy_growth:.1f}% YoY).")
            
        if input_data.tam >= 25.0:
            strengths.append(f"Large Addressable Market (TAM = ${input_data.tam:.1f}B).")
        elif input_data.tam < 3.0:
            risks.append(f"Niche/Restricted market size (TAM = ${input_data.tam:.1f}B).")
            
        if input_data.nps >= 50:
            strengths.append(f"Strong product market fit (NPS = {input_data.nps}).")
        elif input_data.nps < 15:
            risks.append(f"Weak customer satisfaction (NPS = {input_data.nps}).")
            
        if not strengths:
            strengths.append("Stable team operations and revenue structures.")
        if not risks:
            risks.append("Standard market competitive pressures.")
            
        return {
            "success": True,
            "growth_class": growth_class,
            "probabilities": prob_dict,
            "predicted_roi": predicted_roi,
            "success_score": success_score,
            "recommendation": recommendation,
            "rec_color": rec_color,
            "rec_details": rec_details,
            "runway": runway,
            "ltv_cac": ltv_cac,
            "strengths": strengths,
            "risks": risks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# Mount static folder
os.makedirs('static', exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    # Render assigns a dynamic port via environment, we bind to 0.0.0.0 for external access
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
