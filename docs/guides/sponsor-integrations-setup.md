# Sponsor Integrations & API Setup Guide

This guide details how to obtain, configure, and verify all sponsor credentials and API keys used in **LiveLens**.

---

## 1. Google Gemini API (Best Use of Gemini API [MLH])

### Obtaining Credentials
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and create a key in your project.
3. LiveLens uses `gemini-2.0-flash` for low-latency multimodal video and tool calls.

### Verification
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Explain transit fare in one sentence."}]}]}'
```

---

## 2. ElevenLabs (Best Use of ElevenLabs [MLH])

### Obtaining Credentials
1. Sign up or log into [ElevenLabs](https://elevenlabs.io/).
2. Navigate to your Profile $\rightarrow$ **API Keys** and copy your secret key.
3. Choose a multilingual voice ID (default: `21m00Tcm4TlvDq8ikWAM` - Rachel, or any multilingual model voice).

### Verification
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/$ELEVENLABS_VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "LiveLens system check complete.", "model_id": "eleven_multilingual_v2"}' \
  --output test_voice.mp3
```

---

## 3. Capital One Nessie API (Best Use of Nessie [Capital One])

### Obtaining Credentials
1. Register on the [Capital One Nessie API Portal](http://api.nessieisreal.com/).
2. Copy your developer API Key from your account dashboard.
3. Create a sandbox customer and checking/prepaid account to test turnstile balance deductions:
   ```bash
   curl -X POST "http://api.nessieisreal.com/customers?key=$NESSIE_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "first_name": "Transit",
       "last_name": "Rider",
       "address": {
         "street_number": "100",
         "street_name": "Broadway",
         "city": "New York",
         "state": "NY",
         "zip": "10001"
       }
     }'
   ```
4. Note the returned customer ID and set `NESSIE_CUSTOMER_ID` in your `.env`.

---

## 4. Photon Spectrum SDK (Agents in iMessage [Photon])

### Obtaining Credentials
1. Access your [Photon Developer Dashboard](https://photon.codes/).
2. Generate an API Key under the **Spectrum SDK** settings.
3. Configure the webhook destination or outgoing iMessage channel.

### Verification
```bash
curl -X POST "https://api.photon.codes/v1/imessage/send" \
  -H "Authorization: Bearer $PHOTON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1XXXXXXXXXX",
    "text": "LiveLens Test: Route to Columbia University via 1 Train."
  }'
```

---

## 5. MongoDB Atlas (Best Use of MongoDB Atlas [MLH])

### Cluster & Vector Search Setup
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a database user with read/write privileges.
3. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere for hackathon development).
4. Create database `livelens` and collections:
   - `sessions`: Rolling visual state snapshots and commute history.
   - `stations`: Subway station vector embeddings (using Atlas Vector Search index on field `embedding`).
   - `alerts`: Active MTA service disruption advisories.

---

## 6. DigitalOcean (Best Use of DigitalOcean [MLH])

### Deployment via App Platform or Droplet
1. Create a DigitalOcean account using the MLH credit code.
2. Option 1 (**App Platform**):
   - Connect the GitHub repository.
   - Set buildpack to Docker or Python, specifying `backend/Dockerfile`.
   - Add all environment variables from `.env` in the DigitalOcean console.
3. Option 2 (**Droplet**):
   - Provision an Ubuntu 24.04 Droplet in `nyc3`.
   - Pull the repo, install Docker & Docker Compose, and run:
     ```bash
     docker compose up -d --build
     ```
