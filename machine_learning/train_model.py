import os
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from preprocess import load_sample_data, preprocess

MODEL_DIR  = os.path.join(os.path.dirname(__file__), 'saved_models')
MODEL_PATH = os.path.join(MODEL_DIR, 'xgboost_model.pkl')


def train():
    print("=" * 50)
    print("  SPORTS LEAGUE - ML MODEL TRAINING (IMPROVED)")
    print("=" * 50)

    print("\n[1/4] Loading and preprocessing data...")
    df = load_sample_data()
    X, y = preprocess(df)

    print("\n[2/4] Splitting data into train/test sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples:  {len(X_test)}")

    print("\n[3/4] Training improved XGBoost model...")
    model = XGBClassifier(
        n_estimators     = 200,
        max_depth        = 6,
        learning_rate    = 0.05,
        subsample        = 0.85,
        colsample_bytree = 0.85,
        min_child_weight = 3,
        gamma            = 0.1,
        reg_alpha        = 0.1,
        reg_lambda       = 1.0,
        random_state     = 42,
        eval_metric      = 'mlogloss',
        verbosity        = 0,
    )

    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    print("Model training complete!")

    print("\n[4/4] Saving model...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")

    print("\n" + "=" * 50)
    print("  TRAINING COMPLETE!")
    print("=" * 50)
    return model, X_test, y_test


if __name__ == '__main__':
    model, X_test, y_test = train()
    print("\nRun evaluate.py to see performance metrics.")