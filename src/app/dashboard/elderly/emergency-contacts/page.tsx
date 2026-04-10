"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, PhoneCall, Trash2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  EmergencyContact,
  getDefaultEmergencyContactFromUser,
  loadEmergencyContacts,
  saveEmergencyContacts,
} from "@/lib/elderly-portal";
import { useToast } from "@/hooks/use-toast";

function createEmptyContact(priority: number): EmergencyContact {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    relation: "",
    phone: "",
    priority,
  };
}

export default function ElderlyEmergencyContactsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    const existing = loadEmergencyContacts();
    if (existing.length > 0) {
      setContacts(existing);
      return;
    }

    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    const defaults = getDefaultEmergencyContactFromUser(user);
    if (defaults.length > 0) {
      setContacts(defaults);
      saveEmergencyContacts(defaults);
    } else {
      setContacts([createEmptyContact(1)]);
    }
  }, []);

  const canAdd = contacts.length < 3;
  const sortedContacts = useMemo(() => [...contacts].sort((a, b) => a.priority - b.priority), [contacts]);

  const updateContact = (id: string, key: keyof EmergencyContact, value: string | number) => {
    setContacts((prev) =>
      prev.map((contact) => (contact.id === id ? { ...contact, [key]: value } : contact))
    );
  };

  const addContact = () => {
    if (!canAdd) return;
    setContacts((prev) => [...prev, createEmptyContact(prev.length + 1)]);
  };

  const removeContact = (id: string) => {
    const next = contacts.filter((c) => c.id !== id).map((c, idx) => ({ ...c, priority: idx + 1 }));
    setContacts(next.length > 0 ? next : [createEmptyContact(1)]);
  };

  const saveAll = () => {
    const valid = contacts
      .map((c, idx) => ({ ...c, priority: idx + 1 }))
      .filter((c) => c.name.trim() && c.phone.trim());

    if (valid.length === 0) {
      toast({ variant: "destructive", title: "Add at least one contact", description: "Name and phone are required." });
      return;
    }

    saveEmergencyContacts(valid);
    setContacts(valid);
    toast({ title: "Saved", description: "Emergency contacts updated." });
  };

  return (
    <div className="min-h-screen bg-white text-black p-8 space-y-8">
      <Button
        className="h-24 px-12 text-4xl font-black bg-black text-white rounded-[2rem] border-[8px] border-black flex items-center gap-6"
        onClick={() => router.push("/dashboard/elderly")}
      >
        <ArrowLeft className="h-10 w-10" /> GO HOME
      </Button>

      <div className="space-y-2">
        <h1 className="text-7xl font-black uppercase tracking-tight">Emergency Contacts</h1>
        <p className="text-2xl font-bold text-slate-500">SOS will call contact 1 first, then next contacts.</p>
      </div>

      <div className="space-y-5">
        {sortedContacts.map((contact, index) => (
          <div key={contact.id} className="p-6 border-[6px] border-black rounded-[2rem] bg-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black uppercase flex items-center gap-3">
                <ShieldAlert className="h-7 w-7" /> Contact {index + 1}
              </p>
              {sortedContacts.length > 1 && (
                <Button
                  variant="destructive"
                  className="h-12 px-4 rounded-xl border-2 border-black"
                  onClick={() => removeContact(contact.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </div>

            <Input
              className="h-14 text-xl font-bold border-4 border-black rounded-xl"
              placeholder="Full Name"
              value={contact.name}
              onChange={(e) => updateContact(contact.id, "name", e.target.value)}
            />
            <Input
              className="h-14 text-xl font-bold border-4 border-black rounded-xl"
              placeholder="Relation (Daughter / Son / Neighbor)"
              value={contact.relation}
              onChange={(e) => updateContact(contact.id, "relation", e.target.value)}
            />
            <Input
              className="h-14 text-xl font-bold border-4 border-black rounded-xl"
              placeholder="Phone Number"
              value={contact.phone}
              onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Button
          className="h-16 px-8 text-2xl font-black bg-white text-black border-4 border-black rounded-xl"
          onClick={addContact}
          disabled={!canAdd}
        >
          <Plus className="h-6 w-6 mr-2" /> ADD CONTACT
        </Button>
        <Button
          className="h-16 px-8 text-2xl font-black bg-black text-white border-4 border-black rounded-xl"
          onClick={saveAll}
        >
          <PhoneCall className="h-6 w-6 mr-2" /> SAVE CONTACTS
        </Button>
      </div>
    </div>
  );
}
