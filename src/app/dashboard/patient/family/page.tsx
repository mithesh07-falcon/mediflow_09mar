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
  Plus,
  FileText,
  Calendar,
  Stethoscope,
  Activity,
  ChevronRight,
  Shield,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  age: string;
  bloodGroup?: string;
  gender?: string;
  symptoms?: string;
  seed: string;
  userId?: string;
}

export default function FamilyProfilesPage() {
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newBloodGroup, setNewBloodGroup] = useState("");
  const [newGender, setNewGender] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [recordCounts, setRecordCounts] = useState<Record<string, { manual: number; auto: number }>>({});

  useEffect(() => {
    const activeUserStr = localStorage.getItem("mediflow_current_user");
    let currentUserName = "Member";
    let currentUserAge = "Age Not Set";
    let currentEmail = "default";
    if (activeUserStr) {
      const user = JSON.parse(activeUserStr);
      currentUserName = user.firstName || "Member";
      currentUserAge = user.age || "Age Not Set";
      currentEmail = user.email || "default";
    }

    const saved = localStorage.getItem("mediflow_family_members");
    let loadedMembers: FamilyMember[];
    if (saved) {
      const parsedMembers = JSON.parse(saved);
      // Filter for privacy: show only those belonging to current user
      let userMembers = parsedMembers.filter((m: any) => m.userId === currentEmail);
      
      // If none found for this user, give them a default 'Self' profile
      if (userMembers.length === 0) {
        const defaultSelf = {
          id: "1-" + Date.now(),
          name: currentUserName,
          relation: "Self",
          age: currentUserAge,
          seed: "10",
          userId: currentEmail,
        };
        userMembers = [defaultSelf];
        const allMembers = [...parsedMembers, defaultSelf];
        localStorage.setItem("mediflow_family_members", JSON.stringify(allMembers));
      } else {
        // Update their 'Self' profile if it exists
        userMembers = userMembers.map((m: FamilyMember) =>
          m.relation === "Self" ? { ...m, name: currentUserName, age: currentUserAge } : m
        );
      }
      
      loadedMembers = userMembers;
      setMembers(userMembers);
    } else {
      const defaults = [
        {
          id: "1-" + Date.now().toString(),
          name: currentUserName,
          relation: "Self",
          age: currentUserAge,
          seed: "10",
          userId: currentEmail,
        },
      ];
      loadedMembers = defaults;
      setMembers(defaults);
      localStorage.setItem("mediflow_family_members", JSON.stringify(defaults));
    }

    // Count records for each member
    const allAppts = JSON.parse(
      localStorage.getItem("mediflow_appointments") || "[]"
    );
    const counts: Record<string, { manual: number; auto: number }> = {};
    loadedMembers.forEach((m) => {
      const manualRecords = JSON.parse(
        localStorage.getItem(`mediflow_health_records_${m.id}`) || "[]"
      );
      const autoRecords = allAppts.filter(
        (a: any) =>
          a.patient === m.name &&
          (a.status === "Completed" || a.status === "Confirmed")
      );
      counts[m.id] = {
        manual: manualRecords.length,
        auto: autoRecords.length,
      };
    });
    setRecordCounts(counts);
  }, []);

  const handleAddMember = () => {
    if (!newName || !newRelation || !newAge) {
      toast({
        variant: "destructive",
        title: "Missing Info",
        description: "Please fill in Name, Relation, and Age.",
      });
      return;
    }

    const activeUserStr = localStorage.getItem("mediflow_current_user");
    let currentEmail = "default";
    if (activeUserStr) {
      const user = JSON.parse(activeUserStr);
      currentEmail = user.email || "default";
    }

    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: newName,
      relation: newRelation,
      age: newAge,
      bloodGroup: newBloodGroup || undefined,
      gender: newGender || undefined,
      seed: Math.floor(Math.random() * 100).toString(),
      userId: currentEmail,
    };

    const updated = [...members, newMember];
    setMembers(updated);
    
    // Update global list mapping
    const saved = localStorage.getItem("mediflow_family_members");
    const allMembers = saved ? JSON.parse(saved) : [];
    allMembers.push(newMember);
    localStorage.setItem("mediflow_family_members", JSON.stringify(allMembers));
    setRecordCounts((prev) => ({
      ...prev,
      [newMember.id]: { manual: 0, auto: 0 },
    }));

    setNewName("");
    setNewRelation("");
    setNewAge("");
    setNewBloodGroup("");
    setNewGender("");
    setIsAdding(false);

    toast({
      title: "Profile Created",
      description: `${newName} has been added to your family group.`,
    });
  };

  const removeMember = (id: string) => {
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    
    // Update global list
    const saved = localStorage.getItem("mediflow_family_members");
    if (saved) {
      const allMembers = JSON.parse(saved);
      const updatedAll = allMembers.filter((m: any) => m.id !== id);
      localStorage.setItem("mediflow_family_members", JSON.stringify(updatedAll));
    }
    // Also clean up their health records
    localStorage.removeItem(`mediflow_health_records_${id}`);
    toast({
      title: "Profile Removed",
      description: "Family member and their records have been removed.",
    });
  };

  const getRelationIcon = (relation: string) => {
    const r = relation.toLowerCase();
    if (r === "self") return <Shield className="h-10 w-10 text-primary" />;
    if (
      r.includes("elder") ||
      r.includes("grandpa") ||
      r.includes("grandma") ||
      r.includes("grandfather") ||
      r.includes("grandmother")
    )
      return <Heart className="h-10 w-10 text-rose-500" />;
    if (r.includes("child") || r.includes("son") || r.includes("daughter"))
      return <Activity className="h-10 w-10 text-amber-500" />;
    return <User className="h-10 w-10 text-primary" />;
  };

  const getRelationColor = (relation: string) => {
    const r = relation.toLowerCase();
    if (r === "self") return "from-primary/10 to-primary/5";
    if (
      r.includes("elder") ||
      r.includes("grandpa") ||
      r.includes("grandma")
    )
      return "from-rose-50 to-rose-100/30";
    if (r.includes("child") || r.includes("son") || r.includes("daughter"))
      return "from-amber-50 to-amber-100/30";
    if (r.includes("spouse") || r.includes("wife") || r.includes("husband"))
      return "from-violet-50 to-violet-100/30";
    return "from-sky-50 to-sky-100/30";
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="patient" />

      <main className="flex-1 p-8 bg-slate-50">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary mb-1">
              Family Management
            </h1>
            <p className="text-muted-foreground">
              Manage health profiles for your household. Each profile stores
              appointments, prescriptions, and health records.
            </p>
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
                  <Input
                    placeholder="e.g. Mary Jane"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Relation</Label>
                    <Select value={newRelation} onValueChange={setNewRelation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Brother">Brother</SelectItem>
                        <SelectItem value="Sister">Sister</SelectItem>
                        <SelectItem value="Son">Son</SelectItem>
                        <SelectItem value="Daughter">Daughter</SelectItem>
                        <SelectItem value="Grandpa">Grandpa</SelectItem>
                        <SelectItem value="Grandma">Grandma</SelectItem>
                        <SelectItem value="Elderly">Elderly</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      placeholder="Age"
                      value={newAge}
                      onChange={(e) => setNewAge(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <Select value={newGender} onValueChange={setNewGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Blood Group</Label>
                    <Select
                      value={newBloodGroup}
                      onValueChange={setNewBloodGroup}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full h-12 mt-4"
                  onClick={handleAddMember}
                >
                  Create Profile
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member) => {
            const counts = recordCounts[member.id] || {
              manual: 0,
              auto: 0,
            };
            const totalRecords = counts.manual + counts.auto;

            return (
              <Card
                key={member.id}
                className="rounded-[3rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white"
              >
                <div
                  className={`h-40 bg-gradient-to-br ${getRelationColor(member.relation)} group-hover:opacity-90 transition-all flex items-center justify-center relative`}
                >
                  <Image
                    src={`https://picsum.photos/seed/${member.seed}/400/200`}
                    fill
                    className="object-cover opacity-15"
                    alt=""
                  />
                  <div className="z-10 bg-white p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                    {getRelationIcon(member.relation)}
                  </div>
                </div>
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold uppercase tracking-tight">
                        {member.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className="rounded-full px-3"
                        >
                          {member.relation}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {member.age} Years Old
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {member.gender && (
                          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                            {member.gender}
                          </span>
                        )}
                        {member.bloodGroup && (
                          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                            {member.bloodGroup}
                          </span>
                        )}
                      </div>
                    </div>
                    {member.relation !== "Self" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>

                  {/* Record Stats */}
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl mb-6">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ClipboardList className="h-3.5 w-3.5 text-primary" />
                      <span className="font-bold text-foreground">
                        {totalRecords}
                      </span>{" "}
                      Records
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-bold text-foreground">
                        {counts.auto}
                      </span>{" "}
                      Visits
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 text-orange-400" />
                      <span className="font-bold text-foreground">
                        {counts.manual}
                      </span>{" "}
                      Manual
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Link href={`/dashboard/patient/family/${member.id}`}>
                      <Button className="w-full h-12 rounded-2xl text-sm font-bold gap-2 shadow-sm">
                        <FileText className="h-4 w-4" />
                        View Health Records
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </Link>
                    <Link href="/dashboard/patient/appointments">
                      <Button
                        variant="outline"
                        className="w-full h-10 rounded-2xl text-sm font-bold gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        Book Appointment
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <button
            onClick={() => setIsAdding(true)}
            className="border-4 border-dashed border-slate-200 rounded-[3rem] h-full min-h-[350px] flex flex-col items-center justify-center gap-4 hover:border-primary/30 hover:bg-primary/5 transition-all text-slate-300 hover:text-primary group bg-white/50"
          >
            <div className="h-20 w-20 rounded-full bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus className="h-10 w-10" />
            </div>
            <span className="font-bold text-xl">New Profile</span>
            <span className="text-sm text-slate-400 group-hover:text-primary/60">
              Add a family member
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
