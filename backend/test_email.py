import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SENDER   = "sohamsatkur0@gmail.com"
APP_PASS = "yevc trze kidc gxic"
TO       = "sohamsatkur0@gmail.com"

msg = MIMEMultipart("alternative")
msg["Subject"] = "MEDAI EMERGENCY ALERT - System Test"
msg["From"]    = SENDER
msg["To"]      = TO

html = """
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#dc2626;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:24px;">MEDAI Emergency Alert</h1>
    <p style="color:#fecaca;margin:8px 0 0 0;">Patient vitals flagged as HIGH RISK</p>
  </div>
  <div style="background:#fff5f5;padding:24px;border:1px solid #fecaca;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px;font-weight:bold;">Heart Rate</td>
          <td style="padding:10px;font-size:20px;font-weight:bold;color:#dc2626;">100 BPM</td></tr>
      <tr><td style="padding:10px;font-weight:bold;">SpO2</td>
          <td style="padding:10px;font-size:20px;font-weight:bold;color:#dc2626;">90%</td></tr>
      <tr><td style="padding:10px;font-weight:bold;">Blood Pressure</td>
          <td style="padding:10px;font-size:20px;font-weight:bold;color:#dc2626;">120/80 mmHg</td></tr>
      <tr><td style="padding:10px;font-weight:bold;">Contact</td>
          <td style="padding:10px;">8177863563</td></tr>
    </table>
    <div style="margin-top:20px;padding:16px;background:white;border-radius:8px;border:1px solid #e5e7eb;">
      <p style="margin:0;color:#2563eb;">Location: https://www.google.com/maps?q=18.5204,73.8567</p>
    </div>
    <p style="margin-top:16px;font-size:14px;color:#6b7280;">
      This is a TEST alert from the MEDAI Platform. Emergency system is working correctly.
    </p>
  </div>
</div>
"""

msg.attach(MIMEText(html, "html"))

try:
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(SENDER, APP_PASS)
        server.sendmail(SENDER, TO, msg.as_string())
    print("SUCCESS - Email sent! Check your inbox at", TO)
except Exception as e:
    print(f"FAILED: {e}")
