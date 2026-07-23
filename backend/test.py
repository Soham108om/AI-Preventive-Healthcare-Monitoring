import time
import requests
import random
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from concurrent.futures import ThreadPoolExecutor

# ==========================================
# 1. CONFIGURATION
# ==========================================
BASE_URL = "http://127.0.0.1:5000"
PREDICT_URL = f"{BASE_URL}/predict"
CONCURRENT_USERS = 5  # Concurrent threads
TOTAL_REQUESTS = 50   # Total iterations

def generate_dynamic_vitals():
    """Generates varied clinical data to test model branching logic."""
    return {
        "heart_rate": random.randint(50, 150),
        "spo2": random.randint(88, 100),
        "systolic_bp": random.randint(90, 185),
        "diastolic_bp": random.randint(60, 110),
        "steps": random.randint(0, 12000)
    }

# ==========================================
# 2. CORE TESTING LOGIC
# ==========================================
def send_request(request_id):
    vitals = generate_dynamic_vitals()
    start_time = time.perf_counter()
    try:
        # Hitting the predict route of your Main.py
        response = requests.post(PREDICT_URL, json=vitals, timeout=25)
        end_time = time.perf_counter()
        
        latency = (end_time - start_time) * 1000 # ms
        return {
            "id": request_id,
            "latency": latency,
            "status": response.status_code,
            "risk": response.json().get("triage_result", "ERROR")
        }
    except Exception as e:
        return {
            "id": request_id,
            "latency": None, 
            "status": "CONNECTION_ERROR", 
            "risk": "NONE"
        }

def run_suite():
    print(f"🚀 MedAI Stress Test Started...")
    print(f"Simulating {TOTAL_REQUESTS} patients across {CONCURRENT_USERS} parallel threads.\n")
    
    start_test_clock = time.perf_counter()
    
    with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        results = list(executor.map(send_request, range(TOTAL_REQUESTS)))
    
    end_test_clock = time.perf_counter()
    total_test_time = end_test_clock - start_test_clock

    # --- 3. DATA PROCESSING ---
    df = pd.DataFrame(results)
    df_success = df[df['status'] == 200].copy()
    
    # Calculate Insights
    avg_lat = df_success['latency'].mean()
    throughput = len(df_success) / total_test_time
    error_count = len(df) - len(df_success)
    error_rate = (error_count / TOTAL_REQUESTS) * 100

    print("-" * 30)
    print(f"📊 RESULTS SUMMARY")
    print(f"Avg Latency: {avg_lat:.2f} ms")
    print(f"Throughput:  {throughput:.2f} req/sec")
    print(f"Reliability: {100 - error_rate:.1f}% Success Rate")
    print("-" * 30)

    # ==========================================
    # 4. ADVANCED VISUALIZATIONS
    # ==========================================
    sns.set_theme(style="whitegrid")

    # GRAPH 1: Latency Distribution (Histogram)
    plt.figure(figsize=(10, 5))
    sns.histplot(df_success['latency'], kde=True, color='royalblue')
    plt.axvline(avg_lat, color='red', linestyle='--', label=f'Avg: {avg_lat:.2f}ms')
    plt.title("MedAI: API Latency Distribution Profile")
    plt.xlabel("Latency (ms)")
    plt.legend()
    plt.savefig("medai_latency_dist.png")

    # GRAPH 2: Stability Trace (Time-Series)
    plt.figure(figsize=(10, 5))
    plt.plot(df_success['latency'], marker='o', color='tab:blue', alpha=0.7)
    plt.title("MedAI: System Stability Trace (Concurrent Load)")
    plt.ylabel("Response Time (ms)")
    plt.xlabel("Request Sequence")
    plt.savefig("medai_stability_trace.png")

    # GRAPH 3: Reliability Pie Chart (Error Rate)
    plt.figure(figsize=(6, 6))
    plt.pie([len(df_success), error_count], 
            labels=['Success', 'Failed'], 
            autopct='%1.1f%%', 
            colors=['#2ecc71', '#e74c3c'],
            startangle=140)
    plt.title("System Reliability & Uptime Analysis")
    plt.savefig("medai_reliability_pie.png")

    # GRAPH 4: Outlier Analysis (Boxplot)
    plt.figure(figsize=(8, 4))
    sns.boxplot(x=df_success['latency'], color='lightseagreen')
    plt.title("MedAI: Latency Outlier & Spread Analysis")
    plt.xlabel("Response Time (ms)")
    plt.savefig("medai_latency_boxplot.png")

    # GRAPH 5: Risk Classification Variance
    plt.figure(figsize=(8, 5))
    df_success['risk'].value_counts().plot(kind='bar', color='teal')
    plt.title("Model Output Verification: Risk Distribution")
    plt.ylabel("Frequency")
    plt.xticks(rotation=0)
    plt.savefig("medai_risk_variance.png")

    print("\n✅ All 5 professional matrices generated and saved as .png files.")

if __name__ == "__main__":
    run_suite()