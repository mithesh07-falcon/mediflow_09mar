
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
};
