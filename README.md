
# MediFlow - Integrated Health Management System

MediFlow is a comprehensive healthcare platform designed to bridge the gap between patients, doctors, and pharmacists through AI-driven insights and real-time clinical synchronization.

## 🚀 Core Features (Functional Requirements)

### For Patients
- **Unified Health Hub**: Manage personal and multi-family profiles from a single dashboard.
- **AI Specialist Recommender**: Intelligent symptom analysis using GenAI to guide users to the right medical specialty.
- **Smart Appointment Scheduler**: A "Date-First" booking flow with a professional 7-column clinical calendar grid.
- **Global Medication Alerts**: Real-time simulated SMS and Push notifications that link directly back to the app for dose recording.
- **Secure Clinical Checkout**: Integrated payment gateway simulation for consultation fees (₹300).
- **Urgent Care**: 60-second Tele-Consultancy gateway for immediate clinical assistance.

### For Senior Citizens (Elderly Mode)
- **High-Accessibility Portal**: Simplified phone-number-based login capturing guardian contact information.
- **Guardian Safety Loop**: Automatic simulated SMS notifications dispatched to guardians if a senior misses a medication dose for 10 minutes.
- **Elderly UI**: High-contrast support and large touch targets (24px+) for ease of use.

### For Doctors
- **Clinical Workspace**: Authenticated, doctor-specific patient queues and schedules.
- **Queue Governance**: Dashboards automatically filter to show only "Today's Appointments" for the logged-in clinician.
- **Arrival Verification**: Strict protocol requiring doctors to verify patient arrival before starting a diagnostic session.
- **Digital Prescription Desk**: Tool to assign medications with doctor-assigned scheduled intake times (e.g., 08:00 AM).

### For Pharmacists
- **Verification Hub**: Secure entry of digital Prescription IDs (RX ID) or QR code scanning for clinical record retrieval.
- **Dispensing Control**: Marking prescriptions as fulfilled only after clinical verification.
- **Inventory Management**: Real-time stock tracking with Healthy/Low/Critical statuses and unit pricing.
- **Payment Terminals**: Generating unique QR codes for patient settlement at the pharmacy counter.

## 🛠️ Non-Functional Requirements (NFRs)

- **Performance**: High initial load speed; standardized **2-second processing delays** for all clinical transactions (Login, Payment, Verification) to mirror real-world clinical systems.
- **Security**: Strict data isolation. Patients are restricted to their own family UID; professionals require `@mediflow.com` authorization.
- **Reliability**: Polling-based "Clinical Heartbeat" (5-10s) keeps all dashboards (Doctor, Patient, Pharmacist) in perfect sync.
- **Usability**: Accessibility-first design for senior citizens, including simplified navigation and AI-driven decision support.
- **Scalability**: Entity-based data architecture (Profiles, Appointments, Prescriptions) ready for cloud deployment.

---
*Created for the MediFlow Integrated Health Systems Showcase.*
