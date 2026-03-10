import requests

# 👇 PASTE YOUR NEW KEY HERE
API_KEY = "AIzaSyB5BzjU8BI07stgDVDFr1jy2UpNUJWZuUU"

def test_connection():
    print(f"🔑 Testing API Key: {API_KEY[:10]}...")
    
    # 1. Ask Google which models are available for this key
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("\n✅ SUCCESS! Your Key works. Here are your available models:")
            models = response.json().get('models', [])
            found_any = False
            for m in models:
                if "generateContent" in m['supportedGenerationMethods']:
                    print(f"   - {m['name'].replace('models/', '')}")
                    found_any = True
            
            if not found_any:
                print("⚠️ No chat models found. Try creating a new key in a different project.")
        else:
            print(f"\n❌ Error {response.status_code}: {response.text}")
            print("👉 Solution: Go to https://aistudio.google.com/app/apikey and create a NEW key.")
            
    except Exception as e:
        print(f"\n❌ Connection Failed: {e}")

if __name__ == "__main__":
    test_connection()