"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { wizardCreateContact, type WizardCreatePayload } from "@/lib/api/contacts";
import { cn } from "@/lib/utils";

interface WizardFormData {
  // Step 1: Customer Information
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  ssn_last_four: string;
  priority: string;
  registered_agent: boolean;
  mailing_street: string;
  email: string;
  phone: string;
  office_services: string;
  description: string;
  sensitive_info: string;

  // Step 2: Relationship
  relationship_enabled: boolean;
  relationship: {
    first_name: string;
    last_name: string;
    email: string;
    mailing_street: string;
    date_of_birth: string;
    ssn_last_four: string;
    relationship_type: string;
  };

  // Step 3: Companies
  corporations: Array<{
    name: string;
    date_incorporated: string;
    state_id: string;
    dot_number: string;
    ein: string;
    entity_type: string;
    fiscal_year_end: string;
    industry: string;
    billing_street: string;
    description: string;
  }>;
}

const STEPS = [
  { label: "Customer Info", description: "Basic information" },
  { label: "Relationship", description: "Second owner" },
  { label: "Company", description: "Business details" },
  { label: "Finish", description: "Review & save" },
];

const RELATIONSHIP_TYPES = [
  "Wife",
  "Husband",
  "Brother",
  "Sister",
  "Mother",
  "Father",
  "Son",
  "Daughter",
  "Partner",
  "Friend",
  "Other",
];

const ENTITY_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "s_corp", label: "S Corporation" },
  { value: "c_corp", label: "C Corporation" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "trust", label: "Trust" },
  { value: "estate", label: "Estate" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const OFFICE_OPTIONS = [
  { value: "WALTHAM", label: "WALTHAM" },
  { value: "GLOUCESTER", label: "GLOUCESTER" },
  { value: "BOSTON", label: "BOSTON" },
  { value: "CAMBRIDGE", label: "CAMBRIDGE" },
];

export function ContactWizardForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdContactId, setCreatedContactId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    trigger,
  } = useForm<WizardFormData>({
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      date_of_birth: "",
      ssn_last_four: "",
      priority: "",
      registered_agent: false,
      mailing_street: "",
      email: "",
      phone: "",
      office_services: "",
      description: "",
      sensitive_info: "",
      relationship_enabled: false,
      relationship: {
        first_name: "",
        last_name: "",
        email: "",
        mailing_street: "",
        date_of_birth: "",
        ssn_last_four: "",
        relationship_type: "",
      },
      corporations: [
        {
          name: "",
          date_incorporated: "",
          state_id: "",
          dot_number: "",
          ein: "",
          entity_type: "",
          fiscal_year_end: "",
          industry: "",
          billing_street: "",
          description: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "corporations",
  });

  const relationshipEnabled = watch("relationship_enabled");

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 0:
        return await trigger(["first_name", "last_name"]);
      case 1:
        if (relationshipEnabled) {
          return await trigger(["relationship.first_name", "relationship.last_name"]);
        }
        return true;
      case 2:
        // At least one company with a name if any companies exist
        const corporations = watch("corporations");
        if (corporations.length > 0 && corporations[0].name) {
          return await trigger("corporations");
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // Allow navigation to any step without validation
    setCurrentStep(step);
  };

  const onSubmit = async (data: WizardFormData) => {
    setIsSubmitting(true);
    try {
      const payload: WizardCreatePayload = {
        contact: {
          first_name: data.first_name,
          middle_name: data.middle_name || undefined,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth || null,
          ssn_last_four: data.ssn_last_four || undefined,
          priority: data.priority || undefined,
          registered_agent: data.registered_agent,
          mailing_street: data.mailing_street || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          office_services: data.office_services || undefined,
          description: data.description || undefined,
          sensitive_info: data.sensitive_info || undefined,
        },
        relationship: data.relationship_enabled
          ? {
              first_name: data.relationship.first_name,
              last_name: data.relationship.last_name,
              email: data.relationship.email || undefined,
              mailing_street: data.relationship.mailing_street || undefined,
              date_of_birth: data.relationship.date_of_birth || null,
              ssn_last_four: data.relationship.ssn_last_four || undefined,
              relationship_type: data.relationship.relationship_type || undefined,
            }
          : null,
        corporations: data.corporations
          .filter((corp) => corp.name.trim())
          .map((corp) => ({
            name: corp.name,
            date_incorporated: corp.date_incorporated || null,
            state_id: corp.state_id || undefined,
            dot_number: corp.dot_number || undefined,
            ein: corp.ein || undefined,
            entity_type: corp.entity_type || undefined,
            fiscal_year_end: corp.fiscal_year_end || undefined,
            industry: corp.industry || undefined,
            billing_street: corp.billing_street || undefined,
            description: corp.description || undefined,
          })),
      };

      const result = await wizardCreateContact(payload);
      setCreatedContactId(result.id);
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to create contact:", error);
      alert("Failed to create contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    if (createdContactId) {
      router.push(`/contacts/${createdContactId}`);
    } else {
      router.push("/contacts");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Stepper */}
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        className="px-4"
      />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-lg">{STEPS[currentStep].label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            {/* Step 1: Customer Information */}
            {currentStep === 0 && (
              <>
                {/* Name Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="first_name" className="text-xs">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      {...register("first_name", { required: "First name is required" })}
                      className={cn("h-9", errors.first_name && "border-destructive")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="middle_name" className="text-xs">Middle Name</Label>
                    <Input id="middle_name" {...register("middle_name")} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="last_name" className="text-xs">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      {...register("last_name", { required: "Last name is required" })}
                      className={cn("h-9", errors.last_name && "border-destructive")}
                    />
                  </div>
                </div>

                {/* Personal Info + Address Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="date_of_birth" className="text-xs">Birthday</Label>
                    <Input id="date_of_birth" type="date" {...register("date_of_birth")} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ssn_last_four" className="text-xs">SSN (Last 4)</Label>
                    <Input
                      id="ssn_last_four"
                      maxLength={4}
                      placeholder="****"
                      {...register("ssn_last_four", {
                        pattern: { value: /^\d{4}$/, message: "Must be 4 digits" },
                      })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="priority" className="text-xs">Priority</Label>
                    <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="office_services" className="text-xs">Office</Label>
                    <Select value={watch("office_services")} onValueChange={(v) => setValue("office_services", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFICE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Registered Agent</Label>
                    <div className="flex items-center h-9">
                      <Switch
                        checked={watch("registered_agent")}
                        onCheckedChange={(v) => setValue("registered_agent", v)}
                      />
                      <span className="ml-2 text-xs text-muted-foreground">
                        {watch("registered_agent") ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs">Email</Label>
                    <Input id="email" type="email" {...register("email")} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs">Phone</Label>
                    <Input id="phone" type="tel" {...register("phone")} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mailing_street" className="text-xs">Address</Label>
                    <Input
                      id="mailing_street"
                      {...register("mailing_street")}
                      placeholder="Street, city, state, zip"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Notes Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="description" className="text-xs">Notes</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder="Additional notes..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sensitive_info" className="text-xs">Sensitive Information</Label>
                    <Textarea
                      id="sensitive_info"
                      {...register("sensitive_info")}
                      placeholder="Confidential notes..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Relationship */}
            {currentStep === 1 && (
              <>
                <div className="flex items-center space-x-3 pb-3 border-b">
                  <Switch
                    checked={relationshipEnabled}
                    onCheckedChange={(v) => setValue("relationship_enabled", v)}
                  />
                  <Label className="text-sm font-medium">Add Second Owner / Relationship</Label>
                </div>

                {relationshipEnabled && (
                  <div className="space-y-3 pt-3">
                    {/* Name Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="rel_first_name" className="text-xs">
                          First Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="rel_first_name"
                          {...register("relationship.first_name", {
                            required: relationshipEnabled ? "First name is required" : false,
                          })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rel_last_name" className="text-xs">
                          Last Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="rel_last_name"
                          {...register("relationship.last_name", {
                            required: relationshipEnabled ? "Last name is required" : false,
                          })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rel_type" className="text-xs">Relationship Type</Label>
                        <Select
                          value={watch("relationship.relationship_type")}
                          onValueChange={(v) => setValue("relationship.relationship_type", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIP_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Contact Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="rel_email" className="text-xs">Email</Label>
                        <Input
                          id="rel_email"
                          type="email"
                          {...register("relationship.email")}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rel_dob" className="text-xs">Birthday</Label>
                        <Input
                          id="rel_dob"
                          type="date"
                          {...register("relationship.date_of_birth")}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rel_ssn" className="text-xs">SSN (Last 4)</Label>
                        <Input
                          id="rel_ssn"
                          maxLength={4}
                          placeholder="****"
                          {...register("relationship.ssn_last_four")}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1">
                      <Label htmlFor="rel_address" className="text-xs">Address</Label>
                      <Input
                        id="rel_address"
                        {...register("relationship.mailing_street")}
                        placeholder="Street, city, state, zip"
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {!relationshipEnabled && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">Toggle the switch above to add a second owner or relationship.</p>
                    <p className="text-xs mt-1">You can skip this step if not needed.</p>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Company */}
            {currentStep === 2 && (
              <>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={cn(
                      "space-y-3 p-3 rounded-lg border",
                      index > 0 && "mt-3"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Company {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {/* Company Name + EIN Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs">Company Name</Label>
                        <Input {...register(`corporations.${index}.name`)} placeholder="Enter company name" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">EIN</Label>
                        <Input {...register(`corporations.${index}.ein`)} placeholder="XX-XXXXXXX" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Type of Entity</Label>
                        <Select
                          value={watch(`corporations.${index}.entity_type`)}
                          onValueChange={(v) => setValue(`corporations.${index}.entity_type`, v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ENTITY_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Business Details Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Formation Date</Label>
                        <Input type="date" {...register(`corporations.${index}.date_incorporated`)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Control #</Label>
                        <Input {...register(`corporations.${index}.state_id`)} placeholder="State ID" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">DOT</Label>
                        <Input {...register(`corporations.${index}.dot_number`)} placeholder="DOT #" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fiscal Year</Label>
                        <Input {...register(`corporations.${index}.fiscal_year_end`)} placeholder="January" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sector</Label>
                        <Input {...register(`corporations.${index}.industry`)} placeholder="Industry" className="h-9" />
                      </div>
                    </div>

                    {/* Address + Notes Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Address</Label>
                        <Input {...register(`corporations.${index}.billing_street`)} placeholder="Business address" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Input {...register(`corporations.${index}.description`)} placeholder="Additional notes..." className="h-9" />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      name: "",
                      date_incorporated: "",
                      state_id: "",
                      dot_number: "",
                      ein: "",
                      entity_type: "",
                      fiscal_year_end: "",
                      industry: "",
                      billing_street: "",
                      description: "",
                    })
                  }
                  className="w-full mt-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add one more company
                </Button>
              </>
            )}

            {/* Step 4: Finish */}
            {currentStep === 3 && (
              <div className="py-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-green-600">Well Done!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click Save to create the customer with all related information.
                  </p>
                </div>

                {/* Summary */}
                <div className="text-left max-w-md mx-auto space-y-1 p-3 bg-muted/50 rounded-lg text-sm">
                  <p>
                    <span className="font-medium">Customer:</span>{" "}
                    {watch("first_name")} {watch("last_name")}
                  </p>
                  {relationshipEnabled && watch("relationship.first_name") && (
                    <p>
                      <span className="font-medium">Relationship:</span>{" "}
                      {watch("relationship.first_name")} {watch("relationship.last_name")}
                      {watch("relationship.relationship_type") &&
                        ` (${watch("relationship.relationship_type")})`}
                    </p>
                  )}
                  {fields.filter((_, i) => watch(`corporations.${i}.name`)).length > 0 && (
                    <p>
                      <span className="font-medium">Companies:</span>{" "}
                      {fields
                        .filter((_, i) => watch(`corporations.${i}.name`))
                        .map((_, i) => watch(`corporations.${i}.name`))
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </form>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Success!
            </DialogTitle>
            <DialogDescription>
              The customer and all related information have been created successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleSuccessClose}>View Customer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
