"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { CustomField } from "@/types/index";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "decimal", label: "Decimal" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "boolean", label: "Boolean" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-Select" },
];

interface CustomFieldFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: CustomField | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function CustomFieldForm({
  open,
  onOpenChange,
  field,
  onSave,
}: CustomFieldFormProps) {
  const [saving, setSaving] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [defaultValue, setDefaultValue] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [helpText, setHelpText] = useState("");
  const [section, setSection] = useState("");
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (field) {
      setFieldName(field.field_name);
      setLabel(field.label);
      setFieldType(field.field_type);
      setIsRequired(field.is_required);
      setIsActive(field.is_active);
      setDefaultValue(field.default_value);
      setPlaceholder(field.placeholder);
      setHelpText(field.help_text);
      setSection(field.section);
      setOptions(field.options || []);
    } else {
      setFieldName("");
      setLabel("");
      setFieldType("text");
      setIsRequired(false);
      setIsActive(true);
      setDefaultValue("");
      setPlaceholder("");
      setHelpText("");
      setSection("");
      setOptions([]);
    }
  }, [field, open]);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!field) {
      setFieldName(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      );
    }
  };

  const addOption = () => {
    setOptions([...options, { value: "", label: "" }]);
  };

  const updateOption = (idx: number, key: "value" | "label", val: string) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], [key]: val };
    if (key === "label" && !options[idx].value) {
      updated[idx].value = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }
    setOptions(updated);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        field_name: fieldName,
        label,
        field_type: fieldType,
        is_required: isRequired,
        is_active: isActive,
        default_value: defaultValue,
        placeholder,
        help_text: helpText,
        section,
        options: ["select", "multiselect"].includes(fieldType) ? options : [],
        validation_rules: {},
        visible_to_roles: [],
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const showOptions = ["select", "multiselect"].includes(fieldType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {field ? "Edit Custom Field" : "New Custom Field"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Tax ID Number"
            />
          </div>
          <div>
            <Label>Field Name</Label>
            <Input
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g. tax_id_number"
              disabled={!!field}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Machine name used in the database
            </p>
          </div>
          <div>
            <Label>Field Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Section</Label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. Additional Info"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Value</Label>
              <Input
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
              />
            </div>
            <div>
              <Label>Placeholder</Label>
              <Input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Help Text</Label>
            <Input
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Instructions shown below the field"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <Label>Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
          </div>

          {showOptions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Options</Label>
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) =>
                        updateOption(idx, "label", e.target.value)
                      }
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) =>
                        updateOption(idx, "value", e.target.value)
                      }
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {options.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add at least one option for select fields.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !label || !fieldName || !fieldType}
            >
              {saving ? "Saving..." : field ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
