"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Heart,
  User,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  age: string;
  symptoms?: string;
  seed: string;
}

export default function FamilyProfilesPage() {
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newSymptoms, setNewSymptoms] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const activeUserStr = localStorage.getItem("mediflow_current_user");
    let currentUserName = "Member";
    let currentUserAge = "Age Not Set";
    if (activeUserStr) {
      const user = JSON.parse(activeUserStr);
      currentUserName = user.firstName || "Member";
      currentUserAge = user.age || "Age Not Set";
    }

    const saved = localStorage.getItem("mediflow_family_members");
    if (saved) {
      const parsedMembers = JSON.parse(saved);
      // Ensure "Self" profile always reflects the current logged-in user's name and age
      const updatedMembers = parsedMembers.map((m: FamilyMember) =>
        m.relation === 'Self' ? { ...m, name: currentUserName, age: currentUserAge } : m
      );
      setMembers(updatedMembers);
      localStorage.setItem("mediflow_family_members", JSON.stringify(updatedMembers));
    } else {
      const defaults = [
        { id: "1", name: currentUserName, relation: "Self", age: currentUserAge, seed: "10" }
      ];
      setMembers(defaults);
      localStorage.setItem("mediflow_family_members", JSON.stringify(defaults));
    }
  }, []);

  const handleAddMember = () => {
    if (!newName || !newRelation || !newAge) {
      toast({ variant: "destructive", title: "Missing Info", description: "Please fill in Name, Relation, and Age." });
      return;
    }

    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: newName,
      relation: newRelation,
      age: newAge,
      symptoms: newSymptoms,
      seed: Math.floor(Math.random() * 100).toString()
    };

    const updated = [...members, newMember];
    setMembers(updated);
    localStorage.setItem("mediflow_family_members", JSON.stringify(updated));

    setNewName("");
    setNewRelation("");
    setNewAge("");
    setNewSymptoms("");
    setIsAdding(false);

    toast({ title: "Profile Created", description: `${newName} has been added to your family group.` });
  };

  const removeMember = (id: string) => {
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    localStorage.setItem("mediflow_family_members", JSON.stringify(updated));
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="patient" />

      <main className="flex-1 p-8 bg-slate-50">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary mb-1">Family Management</h1>
            <p className="text-muted-foreground">Manage health profiles for your household.</p>
          </div>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="h-12 rounded-xl px-6">
                <Plus className="h-5 w-5 mr-2" /> Add Family Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>New Family Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input placeholder="e.g. Mary Jane" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Relation</Label>
                    <Input placeholder="e.g. Mother" value={newRelation} onChange={e => setNewRelation(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Age</Label>
                    <Input type="number" placeholder="Age" value={newAge} onChange={e => setNewAge(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full h-12 mt-4" onClick={handleAddMember}>Create Profile</Button>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map(member => (
            <Card key={member.id} className="rounded-[3rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white">
              <div className="h-40 bg-primary/5 group-hover:bg-primary/10 transition-colors flex items-center justify-center relative">
                <Image
                  src={`https://picsum.photos/seed/${member.seed}/400/200`}
                  fill
                  className="object-cover opacity-20"
                  alt=""
                />
                <div className="z-10 bg-white p-4 rounded-full shadow-lg">
                  {member.relation === 'Elderly' || member.relation === 'Grandpa' ? <Heart className="h-10 w-10 text-primary" /> : <User className="h-10 w-10 text-primary" />}
                </div>
              </div>
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="rounded-full px-3">{member.relation}</Badge>
                      <span className="text-sm text-muted-foreground">{member.age} Years Old</span>
                    </div>
                  </div>
                  {member.relation !== 'Self' && (
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeMember(member.id)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <Button variant="outline" className="h-12 rounded-2xl text-sm font-bold">Health History</Button>
                  <Button variant="secondary" className="h-12 rounded-2xl text-sm font-bold">Edit Profile</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <button
            onClick={() => setIsAdding(true)}
            className="border-4 border-dashed border-slate-200 rounded-[3rem] h-full min-h-[350px] flex flex-col items-center justify-center gap-4 hover:border-primary/30 hover:bg-primary/5 transition-all text-slate-300 hover:text-primary group bg-white/50"
          >
            <div className="h-20 w-20 rounded-full bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus className="h-10 w-10" />
            </div>
            <span className="font-bold text-xl">New Profile</span>
          </button>
        </div>
      </main>
    </div>
  );
}
