# LiveLens — Product Brief & Hackathon Demo Guide

## Executive Summary

**LiveLens** is an ambient spatial AI navigator designed to eliminate "app fatigue" and language barriers for non-English speakers, tourists, and visually impaired individuals navigating complex urban environments.

Rather than taking single photos and waiting for conversational bots, LiveLens maintains a continuous video feed, tracks a rolling visual state across physical transitions, speaks back instantly in the user's native tongue via sub-second voice synthesis, and sends offline route guides straight to Apple iMessage.

---

## 👥 Target Users & Pain Points

1. **Non-English Speakers & Immigrants:**
   - *Pain Point:* Confusing paper MTA detour notices, broken elevator printouts, and multi-lingual transit maps that translation apps fail to capture contextually.
   - *LiveLens Solution:* Real-time live camera translation and spoken responses in 30+ native languages (e.g., Tajik, Spanish, Cantonese, Arabic).

2. **Commuters & Tourists with "App Fatigue":**
   - *Pain Point:* Constant juggling between Google Maps, Subway Time apps, camera translators, and notes while holding luggage or children.
   - *LiveLens Solution:* Hands-free continuous visual copilot with instant voice guidance and native iMessage sync.

3. **Visually Impaired Citizens:**
   - *Pain Point:* Inability to spot platform signs, train designations, or sudden service cancellation notices.
   - *LiveLens Solution:* Active voice announcements of incoming train lines, platform positioning, and hazards directly in their ear.

---

## 🎬 3-Minute Live Hackathon Demo Script (For Judges)

### Act 1: The Language & Spatial Hook (0:00 - 1:00)
- **Presenter Action:** Holds up a phone running LiveLens pointing at a simulated or real New York subway station sign.
- **Presenter Voice (Speaking in Tajik):** *"Ба Колумбия чӣ тавр равам? Кадом қаторро савор шавам?"* (*"How do I get to Columbia? Which train do I take?"*)
- **System Action:** Gemini identifies the subway entrance sign and understands the Tajik intent.
- **Audible Output:** ElevenLabs immediately responds in natural Tajik through the phone's speaker in under 800ms:
  > *"Ин даромадгоҳи қатори 1 мебошад. Ба поён фуроед ва аломатҳои сурхи Uptown-ро пайгирӣ кунед."*
- **Judge Reaction:** Immediate "wow" factor with instant speech-and-vision translation on stage.

### Act 2: Rolling Visual Context & Paper Sign RAG (1:00 - 2:00)
- **Presenter Action:** Moves camera to point at a handwritten or printed paper detour advisory (e.g., *"Weekend Service Advisory: Uptown trains bypass 110 St"*).
- **Presenter Voice:** *"Do I need to worry about this paper notice?"*
- **System Action:** FastAPI state engine cross-references the new visual frame against its rolling memory (knowing we are headed to Columbia University at 116th St) and queries MongoDB Atlas for live service notices.
- **Audible Output:** ElevenLabs responds:
  > *"No detour needed. The bypass only affects 110th Street. Your stop is 116th Street Columbia University, which is running normally on the local track."*

### Act 3: Agentic Action & The Blue-Bubble + Nessie Finish (2:00 - 3:00)
- **Presenter Action:** Walks closer to the simulated turnstile gate / OMNY reader.
- **System Action (Nessie Agent):** Visual engine detects the subway turnstile. LiveLens autonomously queries the **Capital One Nessie API** for the commuter's account balance:
  > *Nessie Balance: $1.20 | Fare Required: $2.90*
- **Audible Output:** ElevenLabs alerts the user instantly:
  > *"Warning: your transit balance is $1.20. Auto-reloading $10 from your primary checking account via Capital One."*
- **Presenter Voice:** *"Can you text me my transfer guide and receipt so I have it underground?"*
- **System Action (Photon Agent):** Gemini triggers `dispatch_imessage_itinerary`. The backend invokes the **Photon Spectrum SDK**.
- **Real-World Climax:** A **native blue-bubble Apple iMessage** notification pops up on the presenter's phone with the complete step-by-step route card and Nessie top-up confirmation!

---

## 🏅 Judging Criteria Alignment

| Criterion | LiveLens Delivery |
| :--- | :--- |
| **Technical Complexity** | Dual-stream WebSockets, rolling FIFO visual state engine, multimodal tool execution, and vector RAG. |
| **Stage Wow Factor** | Real-time audio and vision working live on stage with sub-800ms latency—no slides or pre-recorded clips. |
| **Community Impact** | Solves daily urban navigation, financial fare uncertainty, and linguistic barriers for transit riders. |
| **Sponsor Integration** | Seamless cohesion between Gemini (Vision), ElevenLabs (Voice), Nessie (Agentic Finance), Photon (iMessage), MongoDB (Memory), and DigitalOcean (Cloud). |
