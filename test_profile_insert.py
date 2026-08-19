import urllib.request
import json

url = "https://aqelfoozbeexnprmcomw.supabase.co/rest/v1/profiles"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxZWxmb296YmVleG5wcm1jb213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODc5MjgsImV4cCI6MjA4NTA2MzkyOH0.BpxtDFXO9Nh5cKj72sZXmA_KruZRoKKuW0PYmcrZOXo",
    "Authorization": "Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImFlOTIwOTk1LWJmMzUtNGQ2NS04ZWVkLWFmOTcxNWM1ZGVhMyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FxZWxmb296YmVleG5wcm1jb213Ly9hdXRoL3YxIiwic3ViIjoiZWFhM2RjZGMtMWRlNC00MjdjLTgxNzAtY2UwNjVhODhiMTVmIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTc4NjI5MDcwMCwiaWF0IjoxNzg2Mjg3MTAwLCJlbWFpbCI6InRlc3RfcGF0aWVudF8xMjM0NUBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJ0ZXN0X3BhdGllbnRfMTIzNDVAZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJlYWEzZGNkYy0xZGU0LTQyN2MtODE3MC1jZTA2NWE4OGIxNWYifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4NjI4NzEwMH1dLCJzZXNzaW9uX2lkIjoiMzZjM2QyOWQtYTUwOC00OTYyLThhOWYtNDdmM2JkNGVmMWYwIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.t1A9XjYGTvB0-euq735SfrAhpvH5dlEC6AnDBNtu-OytpGCooNrbGWLMrB2ka_TquK25V4J0P0Vex51sa1gUog",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

body = {
    "id": "eaa3dcdc-1de4-427c-8170-ce065a88b15f",
    "full_name": "Test Patient",
    "role": "patient"
}

req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        resp_data = json.loads(response.read().decode())
        print("Response Data:", json.dumps(resp_data, indent=2))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode())
except Exception as e:
    print("Error:", e)
