
/**
 * MEDIFLOW GLOBAL REGISTRY SYNC SERVICE
 * 
 * Provides global persistence across devices for the mock-registry
 * when deployed to serverless environments like Vercel.
 */

// Global registry codes (hidden from casual users but accessible for sync)
const STAFF_URL = "https://rentry.co/api/edit/67d5fuuw2";
const PATIENT_URL = "https://rentry.co/api/edit/eq88fggb7";
const EDIT_CODE = "mediflow2026";

export const GlobalSync = {
    /**
     * Push STAFF registry from local storage to cloud
     */
    async pushStaff() {
        try {
            const data = localStorage.getItem("mediflow_staff") || "[]";
            const res = await fetch(STAFF_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    text: data,
                    edit_code: EDIT_CODE
                })
            });
            return res.ok;
        } catch (e) {
            console.error("Staff push failed", e);
            return false;
        }
    },

    /**
     * Pull STAFF registry from cloud into local storage
     */
    async pullStaff() {
        try {
            const res = await fetch("https://rentry.co/67d5fuuw2/raw");
            if (res.ok) {
                const cloudData = await res.text();
                if (cloudData && cloudData !== "[]") {
                    const localData = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
                    const cloudJSON = JSON.parse(cloudData);
                    
                    // Merge Unique
                    const merged = [...localData];
                    cloudJSON.forEach((cs: any) => {
                        if (!merged.find(ls => ls.email.toLowerCase() === cs.email.toLowerCase())) {
                            merged.push(cs);
                        }
                    });
                    
                    localStorage.setItem("mediflow_staff", JSON.stringify(merged));
                    return true;
                }
            }
        } catch (e) {
            console.error("Staff pull failed", e);
        }
        return false;
    },

    /**
     * Push PATIENT registry from local storage to cloud
     */
    async pushPatients() {
        try {
            const data = localStorage.getItem("mediflow_patients") || "[]";
            const res = await fetch(PATIENT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    text: data,
                    edit_code: EDIT_CODE
                })
            });
            return res.ok;
        } catch (e) {
            console.error("Patient push failed", e);
            return false;
        }
    },

    /**
     * Pull PATIENT registry from cloud into local storage
     */
    async pullPatients() {
        try {
            const res = await fetch("https://rentry.co/eq88fggb7/raw");
            if (res.ok) {
                const cloudData = await res.text();
                if (cloudData && cloudData !== "[]") {
                    const localData = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
                    const cloudJSON = JSON.parse(cloudData);
                    
                    // Merge Unique
                    const merged = [...localData];
                    cloudJSON.forEach((cp: any) => {
                        if (!merged.find(lp => lp.email.toLowerCase() === cp.email.toLowerCase())) {
                            merged.push(cp);
                        }
                    });
                    
                    localStorage.setItem("mediflow_patients", JSON.stringify(merged));
                    return true;
                }
            }
        } catch (e) {
            console.error("Patient pull failed", e);
        }
        return false;
    }
    /**
     * Push APPOINTMENTS registry from local storage to cloud
     */
    async pushAppointments() {
        try {
            const data = localStorage.getItem("mediflow_appointments") || "[]";
            const res = await fetch("https://rentry.co/api/edit/9gvymvvp2", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    text: data,
                    edit_code: EDIT_CODE
                })
            });
            return res.ok;
        } catch (e) {
            console.error("Appointments push failed", e);
            return false;
        }
    },

    /**
     * Pull APPOINTMENTS registry from cloud into local storage
     */
    async pullAppointments() {
        try {
            const res = await fetch("https://rentry.co/9gvymvvp2/raw");
            if (res.ok) {
                const cloudData = await res.text();
                if (cloudData && cloudData !== "[]") {
                    const localData = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
                    const cloudJSON = JSON.parse(cloudData);
                    
                    // Merge Unique by ID
                    const merged = [...localData];
                    cloudJSON.forEach((ca: any) => {
                        if (!merged.find(la => String(la.id) === String(ca.id))) {
                            merged.push(ca);
                        } else {
                            // Update existing if status changed (e.g. Arrived, Completed)
                            const idx = merged.findIndex(la => String(la.id) === String(ca.id));
                            if (merged[idx].status !== ca.status || merged[idx].doctorNotes !== ca.doctorNotes) {
                                merged[idx] = { ...merged[idx], ...ca };
                            }
                        }
                    });
                    
                    localStorage.setItem("mediflow_appointments", JSON.stringify(merged));
                    return true;
                }
            }
        } catch (e) {
            console.error("Appointments pull failed", e);
        }
        return false;
    },

    /**
     * Push MEDICAL DATA (Prescriptions + History) to cloud
     */
    async pushMedicalData() {
        try {
            const rx = localStorage.getItem("mediflow_prescriptions") || "[]";
            const history = localStorage.getItem("mediflow_medical_history") || "[]";
            const data = JSON.stringify({ rx: JSON.parse(rx), history: JSON.parse(history) });
            
            await fetch("https://rentry.co/api/edit/2n4iwexu", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ text: data, edit_code: EDIT_CODE })
            });
        } catch (e) {
            console.error("Medical data push failed", e);
        }
    },

    /**
     * Pull MEDICAL DATA from cloud
     */
    async pullMedicalData() {
        try {
            const res = await fetch("https://rentry.co/2n4iwexu/raw");
            if (res.ok) {
                const cloudContent = await res.text();
                if (cloudContent && cloudContent !== "[]") {
                    const cloudJSON = JSON.parse(cloudContent);
                    
                    // Sync prescriptions
                    const localRx = JSON.parse(localStorage.getItem("mediflow_prescriptions") || "[]");
                    const mergedRx = [...localRx];
                    (cloudJSON.rx || []).forEach((crx: any) => {
                        if (!mergedRx.find(lrx => String(lrx.id) === String(crx.id))) mergedRx.push(crx);
                    });
                    localStorage.setItem("mediflow_prescriptions", JSON.stringify(mergedRx));

                    // Sync history
                    const localHist = JSON.parse(localStorage.getItem("mediflow_medical_history") || "[]");
                    const mergedHist = [...localHist];
                    (cloudJSON.history || []).forEach((ch: any) => {
                        if (!mergedHist.find(lh => String(lh.dateTime) === String(ch.dateTime) && lh.prescriptionId === ch.prescriptionId)) mergedHist.push(ch);
                    });
                    localStorage.setItem("mediflow_medical_history", JSON.stringify(mergedHist));
                }
            }
        } catch (e) {
            console.error("Medical data pull failed", e);
        }
    }
};
