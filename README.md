# Swasth Setu (स्वास्थ्य सेतु)
### Rural Public Healthcare Continuity Platform
> **Smart India Hackathon (SIH)** · Government of Maharashtra Problem Statement  
> **Team**: Code Sutra · **Live Platform**: [https://gramin-care.vercel.app](https://gramin-care.vercel.app)

---

## 📌 Overview

**Swasth Setu** is an end-to-end rural public healthcare continuity platform designed to bridge the care gap across grassroots community health workers (ASHAs/ANMs), primary healthcare centres (PHCs), secondary community health centres (CHCs), and tertiary district hospitals.

The platform ensures **One Patient Record, Continuous Care**, preventing patients from falling through the cracks during referrals, follow-ups, emergencies, and teleconsultations.

---

## ✨ Key Features

### 1. 🩺 AI & Rule-Based Clinical Triage
- Multi-step guided symptom triage for patients and frontline health workers.
- Instant risk stratification: **Mild** (Self-care / PHC visit), **Moderate** (Instant Teleconsultation), and **Emergency** (SOS Allocation).
- Automatic routing logic with offline support.

### 2. 📹 Cross-Device WebRTC Teleconsultation
- Real-time video/audio teleconsultation connecting rural patients (mobile) directly to available government doctors (web/projector).
- Presence-based WebRTC signaling backed by Supabase Realtime with STUN and TURN relay fallback for cellular networks.
- In-call clinical tools:
  - **Live Patient Triage Report**: Symptoms, severity level, chief complaint, chronic conditions, and allergies.
  - **Clinical Observations & Diagnosis**: Structured notes recorded during call.
  - **E-Prescription Builder**: Multi-drug dosage, frequency, and duration entries.
  - **Specialist Referral Ticket**: One-click referral to 16+ hospital specialties with priority classification (Routine / Urgent / Emergency).

### 3. 📄 Automated Post-Consultation Summary
- Upon completion, patients are automatically transitioned to a dedicated, patient-friendly summary page.
- Clear breakdown of doctor observations, diagnosis, active prescriptions, and referral instructions.

### 4. 🚨 Intelligent Emergency SOS System
- Automated emergency allocation engine:
  - Nearest suitable facility matching symptoms and trauma level.
  - Ambulance dispatch with real-time vehicle identifier.
  - Emergency bed reservation and designated on-duty trauma doctor.

### 5. 🔁 Closed-Loop Referral & Follow-up Tracking
- End-to-end referral timeline (Created → In-Transit → Arrived → Completed).
- ASHA worker home-visit scheduling and follow-up alerts for chronic patients.
- Offline-first caching with automatic sync for remote areas with spotty connectivity.

### 6. 🌐 Multilingual Accessibility
- Full dual-language localization in **English** and **Marathi (मराठी)**.

---

## 👥 Demo Personas & Credentials

All demo accounts use password: `demo123456`

| Role | Name | Demo Email | Primary Function |
|---|---|---|---|
| **Patient** | Meera Patil | `meera@demo.gramincare.in` | Self triage, teleconsult, health records, prescriptions |
| **ASHA Worker** | Priya Shinde | `priya@demo.gramincare.in` | Field screening, home visits, patient referrals |
| **Doctor** | Dr. Rajesh Kulkarni | `rajesh@demo.gramincare.in` | Video consultations, e-prescriptions, specialist referrals |
| **Facility Admin** | Sunita Deshmukh | `sunita@demo.gramincare.in` | Bed allocation, in-transit referrals, inventory |
| **District Admin** | Amit Joshi | `amit@demo.gramincare.in` | District analytics, facility metrics, health trends |

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime Presence)
- **Video / Audio**: WebRTC, OpenRelay TURN servers, STUN
- **Offline / Sync**: IndexedDB with sync queue engine
- **Internationalization**: Custom i18n engine (English & Marathi)
- **Deployment**: Vercel Serverless Edge

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm / pnpm / yarn
- Supabase project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/atharvgarg18/Swasth-Setu.git
   cd Swasth-Setu
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛 System Architecture

```
Frontline (Mobile / ASHA) ────► Rule-Based Triage ───┬──► [Emergency] ──► Auto Allocation (Bed + Ambulance)
                                                     ├──► [Moderate]  ──► WebRTC Teleconsultation (Doctor)
                                                     └──► [Mild]      ──► PHC Appointment / Self-Care

Doctor Video Room ────────────► Live E-Prescriptions & Referral Tickets ──► Closed-Loop Patient Portal
```

---

## 📜 License
Developed for Smart India Hackathon (SIH). Open-source under the MIT License.
