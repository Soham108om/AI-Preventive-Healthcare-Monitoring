import pandas as pd
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

# 1. Load dataset
# 👇 Notice the "data/" part
df = pd.read_csv("data/Synthetic_patient-HealthCare-Monitoring_dataset.csv")

# 2. Rename columns (Fixed "bpm" casing match)
df = df.rename(columns={
    "Heart Rate (bpm)": "heart_rate",
    "SpO2 Level (%)": "spo2",
    "Systolic Blood Pressure (mmHg)": "systolic_bp",
    "Diastolic Blood Pressure (mmHg)": "diastolic_bp",
    # "Steps": "steps",  <-- REMOVED because it doesn't exist in CSV
    # "Risk Level": "risk" <-- REMOVED because it doesn't exist in CSV
})

# 3. Generate MISSING Data (Steps)
# Simulate steps between 2000 and 10000
df["steps"] = np.random.randint(2000, 10000, df.shape[0])

# 4. Generate TARGET Variable (Risk Level)
# We use the same logic as your Frontend React Code to label the data
def calculate_risk(row):
    if (row["heart_rate"] > 120 or 
        row["spo2"] < 92 or 
        row["systolic_bp"] > 140):
        return "HIGH"
    elif (row["heart_rate"] > 100 or 
          row["spo2"] < 95):
        return "MODERATE"
    else:
        return "LOW"

df["risk"] = df.apply(calculate_risk, axis=1)

# 5. Keep only required columns
df = df[
    ["heart_rate", "spo2", "systolic_bp", "diastolic_bp", "steps", "risk"]
]

print("Columns being used:", df.columns.tolist())

# 6. Encode target labels (LOW/MODERATE/HIGH -> 0, 1, 2)
le = LabelEncoder()
df["risk"] = le.fit_transform(df["risk"])

# Print mapping so you know what 0, 1, 2 mean
print("Label Mapping:", dict(zip(le.classes_, le.transform(le.classes_))))

# 7. Split data
X = df.drop("risk", axis=1)
y = df["risk"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 8. Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 9. Save model + encoder
joblib.dump(model, "risk_model.pkl")
joblib.dump(le, "risk_encoder.pkl")

print("✅ Model trained and saved successfully as 'risk_model.pkl'")