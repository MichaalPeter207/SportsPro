# =============================================================
#  machine_learning/evaluate.py
#  Model Evaluation Script (Updated)
# =============================================================

import os
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report, confusion_matrix
)
from preprocess import load_sample_data, preprocess

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'saved_models', 'xgboost_model.pkl')


def evaluate():
    print("=" * 50)
    print("  MODEL EVALUATION REPORT")
    print("=" * 50)

    df = load_sample_data()
    X, y = preprocess(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    if not os.path.exists(MODEL_PATH):
        print("\nERROR: Model not found. Please run train_model.py first.")
        return

    model = joblib.load(MODEL_PATH)
    print("\nModel loaded successfully.")

    y_pred       = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    accuracy  = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall    = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1        = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    roc_auc   = roc_auc_score(y_test, y_pred_proba, multi_class='ovr', average='weighted')

    print("\n--- PERFORMANCE METRICS ---")
    print(f"Accuracy:   {accuracy:.4f}  ({accuracy*100:.2f}%)")
    print(f"Precision:  {precision:.4f}")
    print(f"Recall:     {recall:.4f}")
    print(f"F1-Score:   {f1:.4f}")
    print(f"ROC-AUC:    {roc_auc:.4f}")

    print("\n--- CLASSIFICATION REPORT ---")
    target_names = ['Away Win', 'Draw', 'Home Win']
    print(classification_report(y_test, y_pred, target_names=target_names))

    print("--- CONFUSION MATRIX ---")
    cm = confusion_matrix(y_test, y_pred)
    print(f"{'':12} Away Win   Draw   Home Win")
    labels = ['Away Win', 'Draw    ', 'Home Win']
    for label, row in zip(labels, cm):
        print(f"{label:12} {row[0]:8}  {row[1]:5}  {row[2]:8}")

    print("\n--- FEATURE IMPORTANCE ---")
    # Use the actual feature names from the model
    feature_names = list(X.columns)
    importances   = model.feature_importances_
    sorted_idx    = np.argsort(importances)[::-1]

    for i in sorted_idx:
        bar = "█" * int(importances[i] * 40)
        print(f"  {feature_names[i]:20} {importances[i]:.4f}  {bar}")

    print("\n" + "=" * 50)
    print("  EVALUATION COMPLETE")
    print("=" * 50)

    return {
        'accuracy':  round(accuracy, 4),
        'precision': round(precision, 4),
        'recall':    round(recall, 4),
        'f1_score':  round(f1, 4),
        'roc_auc':   round(roc_auc, 4),
    }


if __name__ == '__main__':
    evaluate()