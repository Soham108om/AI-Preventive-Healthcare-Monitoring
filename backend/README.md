# Backend deployment

The backend is a Flask app served by Gunicorn on Render. The repository-root
`render.yaml` configures the service, installs `backend/requirements.txt`, and
checks `/` for service health.

## Deploy on Render

1. In Render, create a new Blueprint and connect this repository.
2. Review the `medai-backend` service from `render.yaml`.
3. Set `GEMINI_API_KEY` in Render's environment settings. It is needed for
   Gemini-powered features; the prediction endpoint can run without it.
4. Deploy and confirm the service's `/` endpoint returns a JSON message.

`FRONTEND_ORIGINS` is a comma-separated list of allowed browser origins. The
Vercel production URL is configured by default in `render.yaml`; local Vite and
Capacitor origins are also allowed by the backend. Add any other Vercel preview
or custom domain origins to this setting if needed.

Optional integrations can be configured in Render environment settings:

- `GMAIL_SENDER`, `GMAIL_APP_PASS`, `ALERT_EMAIL_TO` for emergency email
- `WHATSAPP_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
  `TWILIO_WHATSAPP_NUMBER` for Twilio WhatsApp notifications
