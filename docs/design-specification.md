
# MediFlow - Master Design Specification & AI Development Prompt

Use this document as a comprehensive prompt to recreate the MediFlow Integrated Health Management System.

## 🚀 Project Overview
**MediFlow** is a multi-tenant clinical platform connecting Patients, Doctors, and Pharmacists. It features AI-driven symptom analysis, real-time medication tracking, and a strictly validated appointment system.

---

## 🎨 Design System & UI Constraints

### 1. Visual Identity
- **Primary Color**: Medical Green (`hsl(142 76% 36%)`).
- **Typography**: 
  - Headlines: `Alegreya` (Serif, professional, authoritative).
  - Body: `Inter` (Sans-serif, clean, modern).
- **Styling**: Rounded corners (`2.5rem` for cards), high-contrast badges, and soft shadows.
- **Theme**: Full support for Light and Dark modes.

### 2. The Clinical Calendar (7x7 Grid)
- **Constraint**: Must render as a strict 7-column CSS grid (Sun–Sat).
- **Behavior**: 
  - Date numbers must align perfectly under weekday headers.
  - No trailing dates from previous/next months.
  - Past dates are disabled (greyed out).
  - Selection: Active date number is highlighted with a bold, circular Medical Green background.
- **Workflow**: "Date-First" logic—users cannot see specialist options or time slots until a date is marked.

---

## 🛠️ Functional Requirements & Logic

### 1. Multi-Role Authentication
- **Roles**: Patient, Senior (Elderly), Doctor, Pharmacist.
- **Patient Registration**: 
  - Mandatory Indian regional phone format (+91).
  - Strict uniqueness check: No two patients can share a phone number.
- **Professional Login**: Doctors/Pharmacists must use `@mediflow.com` accounts.
- **Senior Mode**: Simplified phone-number-only login with large touch targets.

### 2. Patient Hub
- **AI Specialist Recommender**: Text-based symptom input analyzed via Genkit to suggest specialists (Neurology, Cardiology, etc.).
- **Family Management**: Ability to manage multiple profiles (Self, Children, Elderly) with distinct health records.
- **Medication Alert Hub**: 
  - Real-time polling (Heartbeat) for scheduled doses.
  - Global "Simulated SMS" notifications appearing across all dashboard pages.
  - Actionable notifications: "Open App" button redirects to the recording desk.
  - **Guardian Loop**: If a dose is missed for >10 mins, an urgent SMS is simulated to the guardian.

### 3. Professional Dashboards
- **Doctor Workflow**: 
  - "Today's Queue" only.
  - Verify patient arrival before starting diagnosis.
  - Digital Prescription Desk: Assign medications with specific "Intake Times" (e.g., 08:30 AM).
- **Pharmacist Workflow**: 
  - Search via RX ID.
  - Fulfillment status updates stock inventory.
  - Payment QR Code generation for clinical fees.

---

## 🔒 Non-Functional Requirements (NFRs)

### 1. Performance & "Clinical Feel"
- **Mandatory Delay**: Every major clinical transaction (Login, Payment, Prescription, Verification) must include a **2-second processing delay** to simulate professional clinical data synchronization.

### 2. Privacy & Data Isolation
- **Context Filtering**: Patients only see their own family group's data. Doctors only see appointments for their specific specialization/email.

### 3. Scalability
- **State Management**: Uses persistent LocalStorage (simulating Firestore) with a 5-10 second "Clinical Heartbeat" interval to keep all dashboards in sync.

---

## 🧩 Component Architecture (NextJS App Router)
- `/dashboard/patient`: Root-level `GlobalAlertListener` for med reminders.
- `/dashboard/doctor`: Queue governance and diagnostic tools.
- `/dashboard/pharmacist`: Inventory and RX fulfillment terminal.
- `/elderly`: Specialized simplified entry point.

---

*This specification is the definitive blueprint for the MediFlow Integrated Health Systems Prototype.*
