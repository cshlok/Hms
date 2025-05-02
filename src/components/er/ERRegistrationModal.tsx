        toast({ title: "Search Failed", description: "Could not search for patient.", variant: "destructive" });
    } finally {
        setIsSearching(false);
    }
  };

  async function onSubmit(data: RegistrationFormValues) {
    setIsLoading(true);
    console.log("Submitting Registration Data:", data);

    let patientId = foundPatient?.id;

    try {
      // Step 1: Create/Verify Patient
      if (!patientId) {
        // Create new patient if details are provided
        if (data.firstName && data.lastName && data.dob && data.sex) {
          console.log("Creating new patient...");
          // TODO: Implement API call: POST /api/patients
          // const patientResponse = await fetch("/api/patients", { ... });
          // if (!patientResponse.ok) { ... handle error ... }
          // const newPatient: PatientResponse = await patientResponse.json();
          // patientId = newPatient.id;
          
          // Mock new patient creation
          await new Promise(resolve => setTimeout(resolve, 500));
          patientId = `new_patient_${Date.now()}`;
          console.log(`Mock patient created with ID: ${patientId}`);
        } else {
          // This case should ideally be prevented by the form validation (refine)
          throw new Error("Patient details incomplete for new registration.");
        }
      }

      // Step 2: Create ER Visit
      console.log(`Creating ER visit for patient ID: ${patientId}`);
      // TODO: Implement API call: POST /api/er/visits
      const visitResponse = await fetch("/api/er/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          chief_complaint: data.chiefComplaint,
          arrival_mode: data.arrivalMode || "Walk-in",
          initial_location: "Waiting Room", // Or Triage if direct
          initial_status: "Triage",
        }),
      });

      if (!visitResponse.ok) {
        let errorMsg = "Failed to create ER visit";
        try {
            // FIX: Use defined type for errorData
            const errorData: ApiErrorResponse = await visitResponse.json();
            errorMsg = errorData.error || errorMsg;
        } catch (_jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }

      // FIX: Use defined type for newVisit
      const newVisit: ERVisitResponse = await visitResponse.json();
      toast({
        title: "ER Visit Registered",
        description: `Visit ${newVisit.visit_number || newVisit.id} created for patient ${patientId}.`,
      });
      
      if (onSuccess) {
        onSuccess(newVisit);
      }
      form.reset();
      setFoundPatient(null);
      onClose(); // Close modal on success

    } catch (error: unknown) { // FIX: Use unknown for catch block
      console.error("Registration submission error:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Register New ER Patient Visit</DialogTitle>
          <DialogDescription>
            Search for an existing patient by MRN or enter details for a new patient.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="space-y-2">
                <FormLabel>Existing Patient Search</FormLabel>
                <div className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name="searchMrn"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder="Enter MRN to search..." {...field} disabled={!!foundPatient} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" onClick={handleSearchPatient} disabled={isSearching || !!foundPatient}>
                        {isSearching ? "Searching..." : "Search"}
                    </Button>
                </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">OR Enter New Patient Details Below</div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John" {...field} disabled={!!foundPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Doe" {...field} disabled={!!foundPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      {/* TODO: Replace with a Date Picker component */}
                      <Input type="date" placeholder="YYYY-MM-DD" {...field} disabled={!!foundPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!foundPatient}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Sex" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chief Complaint</FormLabel>
                  <FormControl>
                    <Input placeholder="Reason for visit..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="arrivalMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrival Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Arrival Mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Ambulance">Ambulance</SelectItem>
                      <SelectItem value="Wheelchair">Wheelchair</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Registering..." : "Register Visit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

