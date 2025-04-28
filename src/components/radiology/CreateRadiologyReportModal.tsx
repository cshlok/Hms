"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react"; // Assuming next-auth for session

export default function CreateRadiologyReportModal({ onClose, onSubmit, studyId }) {
  const { data: session } = useSession();
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [status, setStatus] = useState("preliminary");
  const [radiologistId, setRadiologistId] = useState("");

  const [radiologists, setRadiologists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRadiologists = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/users?role=Radiologist"); // Assuming API endpoint exists
        if (!response.ok) throw new Error("Failed to fetch radiologists");
        const data = await response.json();
        setRadiologists(data);

        // Pre-select current user if they are a radiologist
        if (session?.user?.role === "Radiologist") {
          setRadiologistId(session.user.id);
        }

      } catch (err) {
        console.error("Error fetching radiologists:", err);
        setError("Failed to load radiologists. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRadiologists();
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!radiologistId || !impression) {
      alert("Please select a Radiologist and enter the Impression.");
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      study_id: studyId,
      radiologist_id: radiologistId,
      findings: findings || null,
      impression: impression,
      recommendations: recommendations || null,
      status: status,
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Radiology Report</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="radiologist" className="text-right">Radiologist *</Label>
                <Select value={radiologistId} onValueChange={setRadiologistId} required disabled={session?.user?.role === "Radiologist"}> {/* Disable if pre-selected */}
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Radiologist" />
                  </SelectTrigger>
                  <SelectContent>
                    {radiologists.map((rad) => (
                      <SelectItem key={rad.id} value={rad.id}>
                        {rad.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="findings" className="text-right pt-2">Findings</Label>
                <Textarea
                  id="findings"
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  className="col-span-3 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="impression" className="text-right pt-2">Impression *</Label>
                <Textarea
                  id="impression"
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  className="col-span-3 min-h-[100px]"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="recommendations" className="text-right pt-2">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="col-span-3 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preliminary">Preliminary</SelectItem>
                    <SelectItem value="final">Final</SelectItem> {/* Allow setting final directly? Or only via verification? */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Report
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
