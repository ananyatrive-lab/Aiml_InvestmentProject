import pandas as pd
import numpy as np
import os

def generate_startup_data(n_samples=1000, seed=42):
    np.random.seed(seed)
    
    sectors = ['AI', 'SaaS', 'FinTech', 'HealthTech', 'CleanTech', 'E-Commerce', 'EdTech']
    stages = ['Pre-seed', 'Seed', 'Series A', 'Series B']
    locations = ['SF Bay Area', 'New York', 'London', 'Berlin', 'Bangalore', 'Remote', 'Austin']
    
    data = []
    
    for i in range(n_samples):
        startup_id = f"ST-{10000 + i}"
        name = f"Startup {10000 + i}"
        sector = np.random.choice(sectors)
        stage = np.random.choice(stages, p=[0.4, 0.35, 0.18, 0.07])
        location = np.random.choice(locations)
        
        # Core metrics
        founder_score = round(np.random.uniform(1.0, 10.0), 1)
        team_size = int(np.random.negative_binomial(10, 0.4) + 2) # Mostly small teams
        if stage == 'Pre-seed':
            team_size = max(2, min(5, team_size))
        elif stage == 'Seed':
            team_size = max(3, min(12, team_size))
        elif stage == 'Series A':
            team_size = max(8, min(35, team_size))
        else: # Series B
            team_size = max(20, team_size)
            
        tam = round(np.random.exponential(15.0) + 1.0, 1) # TAM in Billions
        competitors = int(np.random.poisson(5) + 1)
        
        # Financials based on stage
        if stage == 'Pre-seed':
            revenue = round(np.random.exponential(2000.0), 2)
            burn_rate = round(np.random.uniform(5000.0, 15000.0), 2)
            total_raised = round(np.random.uniform(50000.0, 250000.0), 2)
        elif stage == 'Seed':
            revenue = round(np.random.uniform(5000.0, 30000.0), 2)
            burn_rate = round(np.random.uniform(15000.0, 50000.0), 2)
            total_raised = round(np.random.uniform(250000.0, 1500000.0), 2)
        elif stage == 'Series A':
            revenue = round(np.random.uniform(30000.0, 120000.0), 2)
            burn_rate = round(np.random.uniform(50000.0, 150000.0), 2)
            total_raised = round(np.random.uniform(1500000.0, 6000000.0), 2)
        else: # Series B
            revenue = round(np.random.uniform(120000.0, 500000.0), 2)
            burn_rate = round(np.random.uniform(120000.0, 400000.0), 2)
            total_raised = round(np.random.uniform(6000000.0, 25000000.0), 2)
            
        runway = round(total_raised / burn_rate, 1) if burn_rate > 0 else 99.0
        
        # Growth / product metrics
        yoy_growth = round(np.random.normal(60.0, 40.0) + (10.0 * founder_score), 1)
        yoy_growth = max(5.0, yoy_growth) # Floor it
        
        mom_growth = round((yoy_growth / 12.0) + np.random.normal(0, 1.0), 1)
        mom_growth = max(-10.0, mom_growth)
        
        cac = round(np.random.exponential(150.0) + 10.0, 2)
        ltv = round(cac * (np.random.uniform(1.5, 6.0) + (0.3 * founder_score)), 2)
        ltv_cac = round(ltv / cac, 2)
        
        nps = int(np.random.normal(40, 20) + (2.5 * founder_score))
        nps = max(-100, min(100, nps))
        
        churn = round(max(0.5, np.random.exponential(5.0) - (0.2 * founder_score)), 2)
        traffic_growth = round(np.random.normal(15.0, 10.0) + (mom_growth * 0.5), 1)
        
        # Calculate a Growth potential index (0 to 100)
        efficiency = (revenue / burn_rate) if burn_rate > 0 else 1.0
        growth_index = (
            0.15 * (yoy_growth / 10.0) + 
            0.15 * (founder_score * 10.0) + 
            0.15 * (ltv_cac * 10.0) + 
            0.15 * (min(100, tam) * 1.0) + 
            0.10 * (nps + 100) / 2.0 +
            0.10 * (min(100, traffic_growth * 2)) +
            0.10 * (min(50, runway) * 2.0) +
            0.10 * (min(10, efficiency * 10.0) * 10.0)
        )
        
        # Add random noise
        growth_index += np.random.normal(0, 8.0)
        growth_score = max(5.0, min(98.0, round(growth_index, 1)))
        
        # Growth class
        if growth_score < 45.0:
            growth_class = 'Low'
        elif growth_score < 75.0:
            growth_class = 'Medium'
        else:
            growth_class = 'High'
            
        # ROI Multiple prediction target
        if growth_score < 40.0:
            roi = round(np.random.choice([0.0, 0.2, 0.5, 1.0], p=[0.6, 0.2, 0.15, 0.05]), 2)
        elif growth_score < 70.0:
            roi = round(np.random.exponential(1.5) + 0.5, 2)
        else:
            # Power law returns
            roi = round(np.random.choice([
                0.0, 
                np.random.uniform(1.5, 3.5), 
                np.random.uniform(3.5, 10.0), 
                np.random.uniform(10.0, 50.0)
            ], p=[0.1, 0.5, 0.3, 0.1]), 2)
            
        data.append({
            'startup_id': startup_id,
            'name': name,
            'sector': sector,
            'stage': stage,
            'location': location,
            'founder_score': founder_score,
            'team_size': team_size,
            'tam': tam,
            'competitors': competitors,
            'revenue': revenue,
            'burn_rate': burn_rate,
            'total_raised': total_raised,
            'runway': runway,
            'yoy_growth': yoy_growth,
            'mom_growth': mom_growth,
            'cac': cac,
            'ltv': ltv,
            'ltv_cac': ltv_cac,
            'nps': nps,
            'churn': churn,
            'traffic_growth': traffic_growth,
            'growth_score': growth_score,
            'growth_class': growth_class,
            'roi': roi
        })
        
    df = pd.DataFrame(data)
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/startups.csv', index=False)
    print(f"Generated {n_samples} startups in data/startups.csv")

if __name__ == "__main__":
    generate_startup_data()
