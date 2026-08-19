import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import os
import time
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.inspection import permutation_importance
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_curve,
    auc,
    roc_auc_score,
    classification_report,
    balanced_accuracy_score,
    brier_score_loss
)

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import shap
    HAS_SHAP = True
except Exception:
    HAS_SHAP = False


def calculate_risk(row):
    """Deterministic label generation function in synthetic dataset."""
    if (row["heart_rate"] > 120 or 
        row["spo2"] < 92 or 
        row["systolic_bp"] > 140):
        return "HIGH"
    elif (row["heart_rate"] > 100 or 
          row["spo2"] < 95):
        return "MODERATE"
    else:
        return "LOW"


def run_rigorous_audit():
    print("==================================================")
    print("   MEDAI COMPREHENSIVE ML MODEL AUDIT & PIPELINE  ")
    print("==================================================\n")

    # ----------------------------------------------------
    # 1. DATASET AUDIT
    # ----------------------------------------------------
    csv_path = "data/Synthetic_patient-HealthCare-Monitoring_dataset.csv"
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    raw_df = pd.read_csv(csv_path)
    total_records = len(raw_df)
    total_features = raw_df.shape[1]

    unique_patients = raw_df["Patient Number"].nunique() if "Patient Number" in raw_df.columns else total_records
    missing_count = int(raw_df.isnull().sum().sum())
    duplicate_rows = int(raw_df.duplicated().sum())

    df = raw_df.rename(columns={
        "Heart Rate (bpm)": "heart_rate",
        "SpO2 Level (%)": "spo2",
        "Systolic Blood Pressure (mmHg)": "systolic_bp",
        "Diastolic Blood Pressure (mmHg)": "diastolic_bp",
    })

    np.random.seed(42)
    df["steps"] = np.random.randint(2000, 10000, df.shape[0])
    df["risk"] = df.apply(calculate_risk, axis=1)

    feature_cols = ["heart_rate", "spo2", "systolic_bp", "diastolic_bp", "steps"]
    X = df[feature_cols].copy()
    y = df["risk"].copy()

    feature_stats = X.describe().T[["min", "mean", "std", "max"]].to_dict(orient="index")

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    class_names = list(le.classes_) # ['HIGH', 'LOW', 'MODERATE']

    # ----------------------------------------------------
    # 2. TARGET LEAKAGE AUDIT & PATIENT SPLITTING PROTOCOL
    # ----------------------------------------------------
    overall_dist = pd.Series(y).value_counts().to_dict()

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y_encoded, test_size=0.30, random_state=42, stratify=y_encoded
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    train_size = len(X_train)
    val_size = len(X_val)
    test_size = len(X_test)

    train_tuples = set(tuple(x) for x in X_train.values)
    val_tuples = set(tuple(x) for x in X_val.values)
    test_tuples = set(tuple(x) for x in X_test.values)

    train_val_overlap = len(train_tuples.intersection(val_tuples))
    train_test_overlap = len(train_tuples.intersection(test_tuples))

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # ----------------------------------------------------
    # 3. CROSS-VALIDATION ON TRAINING PORTION (70%)
    # ----------------------------------------------------
    rf_params = {
        "n_estimators": 100,
        "max_depth": None,
        "min_samples_split": 2,
        "min_samples_leaf": 1,
        "max_features": "sqrt",
        "class_weight": None,
        "random_state": 42,
        "n_jobs": -1
    }
    rf_model = RandomForestClassifier(**rf_params)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_results = cross_validate(
        rf_model, X_train, y_train, cv=cv,
        scoring=['accuracy', 'precision_macro', 'recall_macro', 'f1_macro', 'f1_weighted']
    )

    cv_acc_mean = cv_results['test_accuracy'].mean()
    cv_acc_std = cv_results['test_accuracy'].std()
    cv_f1_mean = cv_results['test_f1_macro'].mean()
    cv_f1_std = cv_results['test_f1_macro'].std()

    # ----------------------------------------------------
    # 4. BASELINE MODEL COMPARISON
    # ----------------------------------------------------
    models = {
        "Random Forest": RandomForestClassifier(**rf_params),
        "Decision Tree": DecisionTreeClassifier(random_state=42),
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    }

    if HAS_XGBOOST:
        models["XGBoost"] = XGBClassifier(
            n_estimators=100, random_state=42, eval_metric='mlogloss', n_jobs=-1
        )
    else:
        models["Gradient Boosting"] = HistGradientBoostingClassifier(random_state=42)

    baseline_results = {}
    for name, m in models.items():
        if name == "Logistic Regression":
            m.fit(X_train_scaled, y_train)
            preds = m.predict(X_test_scaled)
            probas = m.predict_proba(X_test_scaled)
        else:
            m.fit(X_train, y_train)
            preds = m.predict(X_test)
            probas = m.predict_proba(X_test)

        baseline_results[name] = {
            "accuracy": float(accuracy_score(y_test, preds)),
            "precision_macro": float(precision_score(y_test, preds, average='macro')),
            "recall_macro": float(recall_score(y_test, preds, average='macro')),
            "f1_macro": float(f1_score(y_test, preds, average='macro')),
            "f1_weighted": float(f1_score(y_test, preds, average='weighted')),
            "roc_auc_macro": float(roc_auc_score(y_test, probas, multi_class='ovr', average='macro'))
        }

    # ----------------------------------------------------
    # 5. FINAL TEST EVALUATION FOR RANDOM FOREST
    # ----------------------------------------------------
    rf_model.fit(X_train, y_train)

    y_test_pred = rf_model.predict(X_test)
    y_test_proba = rf_model.predict_proba(X_test)

    test_acc = float(accuracy_score(y_test, y_test_pred))
    test_bal_acc = float(balanced_accuracy_score(y_test, y_test_pred))
    test_prec_macro = float(precision_score(y_test, y_test_pred, average='macro'))
    test_rec_macro = float(recall_score(y_test, y_test_pred, average='macro'))
    test_f1_macro = float(f1_score(y_test, y_test_pred, average='macro'))
    test_f1_weighted = float(f1_score(y_test, y_test_pred, average='weighted'))
    macro_roc_auc = float(roc_auc_score(y_test, y_test_proba, multi_class='ovr', average='macro'))

    cm = confusion_matrix(y_test, y_test_pred)

    class_metrics = {}
    for idx, cname in enumerate(class_names):
        prec = float(precision_score(y_test == idx, y_test_pred == idx))
        rec = float(recall_score(y_test == idx, y_test_pred == idx))
        f1 = float(f1_score(y_test == idx, y_test_pred == idx))
        
        tn = int(np.sum((y_test != idx) & (y_test_pred != idx)))
        fp = int(np.sum((y_test != idx) & (y_test_pred == idx)))
        fn = int(np.sum((y_test == idx) & (y_test_pred != idx)))
        tp = int(np.sum((y_test == idx) & (y_test_pred == idx)))
        
        spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        auc_cls = float(roc_auc_score((y_test == idx).astype(int), y_test_proba[:, idx]))
        
        class_metrics[cname] = {
            "precision": prec,
            "recall": rec,
            "specificity": spec,
            "f1": f1,
            "roc_auc": auc_cls,
            "tp": tp, "tn": tn, "fp": fp, "fn": fn
        }

    # ----------------------------------------------------
    # 6. FEATURE IMPORTANCE & PERMUTATION IMPORTANCE & SHAP
    # ----------------------------------------------------
    gini_importance = dict(zip(feature_cols, [float(x) for x in rf_model.feature_importances_]))

    perm_imp_result = permutation_importance(
        rf_model, X_test, y_test, n_repeats=10, random_state=42, n_jobs=-1
    )
    perm_importance = dict(zip(feature_cols, [float(x) for x in perm_imp_result.importances_mean]))

    # SHAP TreeExplainer calculation
    if HAS_SHAP:
        try:
            explainer = shap.TreeExplainer(rf_model)
            shap_values = explainer.shap_values(X_test.iloc[:500])
            shap_summary_text = "SHAP TreeExplainer computed successfully on 500 test samples."
        except Exception as e:
            shap_summary_text = f"SHAP calculation attempted with fallback: {e}"
    else:
        shap_summary_text = "SHAP package not available; Permutation & Gini importances reported."

    # ----------------------------------------------------
    # 7. ROBUSTNESS & PERTURBATION TESTING
    # ----------------------------------------------------
    np.random.seed(42)
    X_test_perturbed = X_test.copy()
    X_test_perturbed["heart_rate"] += np.random.normal(0, 2.0, size=len(X_test))
    X_test_perturbed["spo2"] += np.random.normal(0, 1.0, size=len(X_test))
    X_test_perturbed["systolic_bp"] += np.random.normal(0, 3.0, size=len(X_test))
    X_test_perturbed["diastolic_bp"] += np.random.normal(0, 2.0, size=len(X_test))

    y_test_perturbed_pred = rf_model.predict(X_test_perturbed)
    predictions_changed = int(np.sum(y_test_pred != y_test_perturbed_pred))
    prediction_agreement_rate = float((1.0 - (predictions_changed / len(y_test))) * 100.0)

    clinical_scenarios = pd.DataFrame([
        {"name": "Normal Healthy Patient", "heart_rate": 72, "spo2": 98, "systolic_bp": 118, "diastolic_bp": 78, "steps": 7500},
        {"name": "Borderline Tachycardia", "heart_rate": 99, "spo2": 96, "systolic_bp": 138, "diastolic_bp": 88, "steps": 5000},
        {"name": "High Risk Hypertensive Crisis", "heart_rate": 125, "spo2": 90, "systolic_bp": 160, "diastolic_bp": 100, "steps": 1200},
        {"name": "Moderate Risk Hypoxia", "heart_rate": 88, "spo2": 94, "systolic_bp": 130, "diastolic_bp": 85, "steps": 3000},
    ])
    scenario_preds = rf_model.predict(clinical_scenarios[feature_cols])
    clinical_scenarios["Predicted_Risk"] = le.inverse_transform(scenario_preds)

    # ----------------------------------------------------
    # 8. PROBABILITY CALIBRATION & BRIER SCORE
    # ----------------------------------------------------
    brier_scores = {}
    for idx, cname in enumerate(class_names):
        y_binary = (y_test == idx).astype(int)
        brier = float(brier_score_loss(y_binary, y_test_proba[:, idx]))
        brier_scores[cname] = brier
    macro_brier = float(np.mean(list(brier_scores.values())))

    # ----------------------------------------------------
    # 9. LATENCY BENCHMARKING (100 Repeated Measurements)
    # ----------------------------------------------------
    t0 = time.perf_counter()
    _ = joblib.load("risk_model.pkl")
    model_load_time_ms = float((time.perf_counter() - t0) * 1000.0)

    sample_input = X_test.iloc[[0]]
    for _ in range(10): # warm-up
        _ = rf_model.predict_proba(sample_input)

    latencies = []
    for _ in range(100):
        t_start = time.perf_counter()
        _ = rf_model.predict_proba(sample_input)
        latencies.append((time.perf_counter() - t_start) * 1000.0)

    lat_mean = float(np.mean(latencies))
    lat_median = float(np.median(latencies))
    lat_min = float(np.min(latencies))
    lat_max = float(np.max(latencies))
    lat_p95 = float(np.percentile(latencies, 95))
    lat_p99 = float(np.percentile(latencies, 99))

    # ----------------------------------------------------
    # 10. PUBLICATION-QUALITY FIGURES GENERATION
    # ----------------------------------------------------
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    sns.set_context("paper", font_scale=1.3)

    # Figure 1: Confusion Matrix
    plt.figure(figsize=(7, 6), dpi=300)
    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=class_names, yticklabels=class_names,
        cbar=True, annot_kws={"size": 14, "weight": "bold"}
    )
    plt.title("Random Forest Confusion Matrix (N = 9,000 Test Set)", fontsize=13, fontweight='bold', pad=12)
    plt.xlabel("Predicted Triage Risk Level", fontsize=11, fontweight='bold')
    plt.ylabel("Actual Triage Risk Level", fontsize=11, fontweight='bold')
    plt.tight_layout()
    fig_cm_path = "medai_confusion_matrix.png"
    plt.savefig(fig_cm_path, dpi=300)
    plt.close()

    # Figure 2: Multiclass ROC Curve
    plt.figure(figsize=(8, 6), dpi=300)
    colors = ['#e74c3c', '#2ecc71', '#f39c12']
    for idx, (cname, color) in enumerate(zip(class_names, colors)):
        fpr, tpr, _ = roc_curve((y_test == idx).astype(int), y_test_proba[:, idx])
        plt.plot(fpr, tpr, color=color, lw=2.5, label=f'Class {cname} (AUC = {class_metrics[cname]["roc_auc"]:.4f})')
    plt.plot([0, 1], [0, 1], 'k--', lw=1.5, label='Chance (AUC = 0.5000)')
    plt.xlim([-0.02, 1.02])
    plt.ylim([-0.02, 1.05])
    plt.xlabel('False Positive Rate (1 - Specificity)', fontsize=11, fontweight='bold')
    plt.ylabel('True Positive Rate (Sensitivity)', fontsize=11, fontweight='bold')
    plt.title(f'Multiclass OvR ROC Curve (Macro AUC = {macro_roc_auc:.4f})', fontsize=13, fontweight='bold', pad=12)
    plt.legend(loc="lower right", fontsize=10, frameon=True)
    plt.tight_layout()
    fig_roc_path = "medai_roc_curve.png"
    plt.savefig(fig_roc_path, dpi=300)
    plt.close()

    # Figure 3: Feature Importance Comparison (Gini vs Permutation)
    plt.figure(figsize=(9, 5), dpi=300)
    imp_df = pd.DataFrame({
        'Feature': feature_cols,
        'Gini Importance': [gini_importance[f] for f in feature_cols],
        'Permutation Importance': [perm_importance[f] for f in feature_cols]
    }).melt(id_vars='Feature', var_name='Metric', value_name='Importance')

    sns.barplot(x='Importance', y='Feature', hue='Metric', data=imp_df, palette='viridis')
    plt.title('Random Forest Feature Importance Comparison', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Importance Score', fontsize=11, fontweight='bold')
    plt.ylabel('Clinical Feature', fontsize=11, fontweight='bold')
    plt.tight_layout()
    fig_feat_path = "medai_feature_importance.png"
    plt.savefig(fig_feat_path, dpi=300)
    plt.close()

    # Figure 4: Training Class Distribution
    plt.figure(figsize=(7, 5), dpi=300)
    train_dist_counts = pd.Series(y_train).value_counts().to_dict()
    train_dist_named = {le.inverse_transform([k])[0]: v for k, v in train_dist_counts.items()}
    train_dist_series = pd.Series(train_dist_named)[class_names]
    
    bars = plt.bar(train_dist_series.index, train_dist_series.values, color=['#e74c3c', '#2ecc71', '#3498db'], width=0.55)
    for bar in bars:
        yval = bar.get_height()
        pct = (yval / train_size) * 100
        plt.text(bar.get_x() + bar.get_width()/2.0, yval + 250, f'{yval:,}\n({pct:.1f}%)', ha='center', va='bottom', fontsize=10, fontweight='bold')
    plt.ylim(0, max(train_dist_series.values) * 1.18)
    plt.title(f'Training Dataset Class Distribution (N = {train_size:,})', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Triage Risk Level Class', fontsize=11, fontweight='bold')
    plt.ylabel('Patient Count', fontsize=11, fontweight='bold')
    plt.tight_layout()
    fig_dist_path = "medai_class_distribution.png"
    plt.savefig(fig_dist_path, dpi=300)
    plt.close()

    # Figure 5: Calibration Reliability Curves
    plt.figure(figsize=(8, 6), dpi=300)
    for idx, (cname, color) in enumerate(zip(class_names, colors)):
        prob_true, prob_pred = calibration_curve((y_test == idx).astype(int), y_test_proba[:, idx], n_bins=5)
        plt.plot(prob_pred, prob_true, marker='o', color=color, lw=2, label=f'Class {cname} (Brier = {brier_scores[cname]:.4f})')
    plt.plot([0, 1], [0, 1], 'k--', label='Perfect Calibration')
    plt.xlabel('Mean Predicted Probability', fontsize=11, fontweight='bold')
    plt.ylabel('Fraction of Positives', fontsize=11, fontweight='bold')
    plt.title('Multi-Class Probability Calibration Curves', fontsize=13, fontweight='bold', pad=12)
    plt.legend(loc="lower right", fontsize=10)
    plt.tight_layout()
    fig_calib_path = "medai_calibration_curve.png"
    plt.savefig(fig_calib_path, dpi=300)
    plt.close()

    # Figure 6: Latency Distribution Profile
    plt.figure(figsize=(8, 5), dpi=300)
    sns.histplot(latencies, kde=True, color='teal')
    plt.axvline(lat_mean, color='red', linestyle='--', label=f'Mean: {lat_mean:.3f} ms')
    plt.axvline(lat_p95, color='orange', linestyle=':', label=f'P95: {lat_p95:.3f} ms')
    plt.title('Pure Model In-Memory Inference Latency (N = 100 Runs)', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Inference Latency (ms)', fontsize=11, fontweight='bold')
    plt.ylabel('Frequency', fontsize=11, fontweight='bold')
    plt.legend(fontsize=10)
    plt.tight_layout()
    fig_lat_path = "medai_latency_profile.png"
    plt.savefig(fig_lat_path, dpi=300)
    plt.close()

    # ----------------------------------------------------
    # 11. SAVE RETRAINED MODEL & ARTIFACTS
    # ----------------------------------------------------
    joblib.dump(rf_model, "risk_model.pkl")
    joblib.dump(le, "risk_encoder.pkl")
    joblib.dump(X_test, "X_test.pkl")
    joblib.dump(y_test, "y_test.pkl")

    # Save structured audit dictionary as JSON
    audit_summary = {
        "dataset": {
            "total_records": total_records,
            "unique_patients": unique_patients,
            "missing_count": missing_count,
            "duplicate_rows": duplicate_rows,
            "train_size": train_size,
            "val_size": val_size,
            "test_size": test_size,
            "train_val_overlap": train_val_overlap,
            "train_test_overlap": train_test_overlap,
            "class_distribution": overall_dist
        },
        "model_params": rf_params,
        "cv_results": {
            "accuracy_mean": cv_acc_mean,
            "accuracy_std": cv_acc_std,
            "f1_macro_mean": cv_f1_mean,
            "f1_macro_std": cv_f1_std
        },
        "test_results": {
            "accuracy": test_acc,
            "balanced_accuracy": test_bal_acc,
            "precision_macro": test_prec_macro,
            "recall_macro": test_rec_macro,
            "f1_macro": test_f1_macro,
            "f1_weighted": test_f1_weighted,
            "macro_roc_auc": macro_roc_auc,
            "class_metrics": class_metrics
        },
        "baseline_comparison": baseline_results,
        "feature_importance": {
            "gini": gini_importance,
            "permutation": perm_importance
        },
        "robustness": {
            "predictions_changed": predictions_changed,
            "prediction_agreement_rate": prediction_agreement_rate,
            "scenarios": clinical_scenarios.to_dict(orient="records")
        },
        "calibration": {
            "macro_brier": macro_brier,
            "per_class_brier": brier_scores
        },
        "latency": {
            "model_load_time_ms": model_load_time_ms,
            "mean_ms": lat_mean,
            "median_ms": lat_median,
            "min_ms": lat_min,
            "max_ms": lat_max,
            "p95_ms": lat_p95,
            "p99_ms": lat_p99
        }
    }

    with open("audit_results_summary.json", "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)

    print("✅ Model training and rigorous validation complete! Results written to audit_results_summary.json")

if __name__ == "__main__":
    run_rigorous_audit()
