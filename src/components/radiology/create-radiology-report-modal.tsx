"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/use-toast"; // Import toast for notifications

// Define the type for the form data submitted
export interface ReportFormData {
  study_id: string;
  radiologist_id: string;
  findings: string | null;
  impression: string;
  recommendations: string | null;
  status: "preliminary" | "final" | "addendum"; // Use specific statuses
}

// Define the type for Radiologist data fetched from API
// Assuming the API returns users with id and name
interface Radiologist {
  id: string;
  name: string;
  // Add other relevant fields if needed, e.g., email
}

// Define the type for the component props
interface CreateRadiologyReportModalProperties {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportFormData) => Promise<void>; // Ensure onSubmit is async
  studyId: string;
  patientName?: string; // Optional but helpful context
  procedureName?: string; // Optional but helpful context
}

// Define a more specific type for the session user if possible
// This depends on how the session is configured in [...nextauth].ts
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string; // Assuming role is part of the user object in the session
}

export default function CreateRadiologyReportModal({
  isOpen,
  onClose,
  onSubmit,
  studyId,
  patientName,
  procedureName,
}: CreateRadiologyReportModalProperties) {
  // Cast session user to a more specific type if needed, handle potential null/undefined
  const { data: session } = useSession();
  const currentUser = session?.user as SessionUser | undefined;

  const [findings, setFindings] = useState<string>("");
  const [impression, setImpression] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string>("");
  const [status, setStatus] = useState<"preliminary" | "final" | "addendum">(
    "preliminary"
  );
  const [radiologistId, setRadiologistId] = useState<string>("");

  const [radiologists, setRadiologists] = useState<Radiologist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return; // Only fetch when modal is open

    const fetchRadiologists = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const response = await fetch("/api/users?role=Radiologist"); // Ensure this API endpoint exists and returns Radiologist[]
        if (!response.ok) {
          throw new Error(
            `Failed to fetch radiologists: ${response.statusText}`
          );
        }
        // Explicitly type the expected response structure
        const data: { results: Radiologist[] } | Radiologist[] =
          await response.json();
        const fetchedRadiologists = Array.isArray(data)
          ? data
          : data.results || [];
        setRadiologists(fetchedRadiologists);

        // Pre-select current user if they are a radiologist and found in the list
        if (
          currentUser?.role === "Radiologist" &&
          fetchedRadiologists.some((rad) => rad.id === currentUser.id)
        ) {
          setRadiologistId(currentUser.id);
        }
      } catch (error_) {
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred";
        console.error("Error fetching radiologists:", message);
        setError(`Failed to load radiologists: ${message}. Please try again.`);
      } finally {
        setLoading(false);
      }
    };
    fetchRadiologists();
  }, [isOpen, currentUser]); // Depend on isOpen and currentUser

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!radiologistId || !impression) {
      toast({
        title: "Missing Information",
        description: "Please select a Radiologist and enter the Impression.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    setError(undefined);
    try {
      await onSubmit({
        study_id: studyId,
        radiologist_id: radiologistId,
        findings: findings || null,
        impression: impression,
        recommendations: recommendations || null,
        status: status,
      });
      // Reset form on successful submission (optional, parent might handle closing)
      setFindings("");
      setImpression("");
      setRecommendations("");
      setStatus("preliminary");
      // Keep radiologist selected if it's the current user?
      // setRadiologistId("");
      // onClose(); // Let parent decide whether to close
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "An unknown error occurred during submission";
      console.error("Error submitting report:", message);
      setError(`Submission failed: ${message}`);
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Control dialog open state with isOpen prop
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Radiology Report</DialogTitle>
          {/* Optionally display patient/procedure info */}
          {(patientName || procedureName) && (
            <p className="text-sm text-muted-foreground">
              For {patientName || "patient"} - {procedureName || "procedure"}
            </p>
          )}
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4 border border-red-200 rounded bg-red-50">
            {error}
          </div>
        ) : undefined}

        {/* Render form only when not loading */}
        {!loading && (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Radiologist Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="radiologist" className="text-right">
                  Radiologist *
                </Label>
                <Select
                  value={radiologistId}
                  onValueChange={setRadiologistId}
                  required
                  // Disable selection if the current user is a radiologist and pre-selected
                  disabled={
                    isSubmitting ||
                    (currentUser?.role === "Radiologist" &&
                      radiologists.some((rad) => rad.id === currentUser.id))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Radiologist" />
                  </SelectTrigger>
                  <SelectContent>
                    {radiologists.length === 0 && (
                      <SelectItem value="" disabled>
                        No radiologists found
                      </SelectItem>
                    )}
                    {/* Explicitly type 'rad' parameter */}
                    {radiologists.map((rad: Radiologist) => (
                      <SelectItem key={rad.id} value={rad.id}>
                        {rad.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Findings Textarea */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="findings" className="text-right pt-2">
                  Findings
                </Label>
                <Textarea
                  id="findings"
                  value={findings}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFindings(event.target.value)
                  }
                  className="col-span-3 min-h-[100px]"
                  disabled={isSubmitting}
                  placeholder="Describe the findings..."
                />
              </div>

              {/* Impression Textarea */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="impression" className="text-right pt-2">
                  Impression *
                </Label>
                <Textarea
                  id="impression"
                  value={impression}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setImpression(event.target.value)
                  }
                  className="col-span-3 min-h-[100px]"
                  required
                  disabled={isSubmitting}
                  placeholder="Summarize the key findings and diagnosis..."
                />
              </div>

              {/* Recommendations Textarea */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="recommendations" className="text-right pt-2">
                  Recommendations
                </Label>
                <Textarea
                  id="recommendations"
                  value={recommendations}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setRecommendations(event.target.value)
                  }
                  className="col-span-3 min-h-[80px]"
                  disabled={isSubmitting}
                  placeholder="Suggest further actions or follow-up..."
                />
              </div>

              {/* Status Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select
                  value={status}
                  onValueChange={(
                    value: "preliminary" | "final" | "addendum"
                  ) => setStatus(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preliminary">Preliminary</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="addendum">Addendum</SelectItem>{" "}
                    {/* Added Addendum status */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : undefined}
                Create Report
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
