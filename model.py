import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, accuracy_score, mean_absolute_error, r2_score

from data_generator import generate_startup_data

def train_models():
    csv_path = 'data/startups.csv'
    if not os.path.exists(csv_path):
        print("Dataset not found. Generating data first...")
        generate_startup_data()
        
    df = pd.read_csv(csv_path)
    
    # Define features
    num_features = [
        'founder_score', 'team_size', 'tam', 'competitors', 'revenue', 
        'burn_rate', 'total_raised', 'runway', 'yoy_growth', 'mom_growth', 
        'cac', 'ltv', 'ltv_cac', 'nps', 'churn', 'traffic_growth'
    ]
    cat_features = ['sector', 'stage']
    
    X = df[num_features + cat_features]
    y_class = df['growth_class']
    y_reg = df['roi']
    
    # Split datasets
    X_train, X_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42
    )
    
    # Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_features)
        ]
    )
    
    # 1. Classification Model
    clf_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, max_depth=12))
    ])
    
    clf_pipeline.fit(X_train, y_class_train)
    y_class_pred = clf_pipeline.predict(X_test)
    clf_acc = accuracy_score(y_class_test, y_class_pred)
    print(f"Classifier Accuracy: {clf_acc:.4f}")
    print(classification_report(y_class_test, y_class_pred))
    
    # 2. Regression Model
    reg_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42, max_depth=12))
    ])
    
    reg_pipeline.fit(X_train, y_reg_train)
    y_reg_pred = reg_pipeline.predict(X_test)
    reg_mae = mean_absolute_error(y_reg_test, y_reg_pred)
    reg_r2 = r2_score(y_reg_test, y_reg_pred)
    print(f"Regressor MAE: {reg_mae:.4f}")
    print(f"Regressor R2 Score: {reg_r2:.4f}")
    
    # Get feature importances from classifier
    onehot_cols = clf_pipeline.named_steps['preprocessor'].named_transformers_['cat'].get_feature_names_out(cat_features).tolist()
    feature_names = num_features + onehot_cols
    importances = clf_pipeline.named_steps['classifier'].feature_importances_
    
    feature_importance_dict = sorted(
        zip(feature_names, importances),
        key=lambda x: x[1],
        reverse=True
    )
    
    # Map importances back to display labels
    importance_summary = {}
    for feat, imp in feature_importance_dict:
        base_feat = feat
        for cat in cat_features:
            if feat.startswith(cat + '_'):
                base_feat = cat
                break
        importance_summary[base_feat] = importance_summary.get(base_feat, 0) + imp
        
    sorted_importance_summary = sorted(importance_summary.items(), key=lambda x: x[1], reverse=True)
    
    # Save directory
    os.makedirs('models', exist_ok=True)
    
    # Save pipelines and helper info
    joblib.dump(clf_pipeline, 'models/classifier.joblib')
    joblib.dump(reg_pipeline, 'models/regressor.joblib')
    
    metrics = {
        'classifier_accuracy': float(clf_acc),
        'regressor_mae': float(reg_mae),
        'regressor_r2': float(reg_r2),
        'feature_importances': sorted_importance_summary,
        'feature_names': feature_names
    }
    
    joblib.dump(metrics, 'models/metrics.joblib')
    print("Models and metrics saved successfully in models/")

if __name__ == "__main__":
    train_models()
