"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import type { LoginIPWhitelistEntry } from "@/types/settings";

interface IPWhitelistFormProps {
  onSubmit: (data: Partial<LoginIPWhitelistEntry>) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function IPWhitelistForm({ onSubmit, onCancel, loading = false }: IPWhitelistFormProps) {
  const [ipAddress, setIpAddress] = useState("");
  const [cidrPrefix, setCidrPrefix] = useState("");
  const [role, setRole] = useState("");
  const [user, setUser] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ip_address: ipAddress,
      cidr_prefix: cidrPrefix ? Number(cidrPrefix) : null,
      role: role || null,
      user: user || null,
      description,
      is_active: isActive,
    });
    setIpAddress("");
    setCidrPrefix("");
    setRole("");
    setUser("");
    setDescription("");
    setIsActive(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ip-address">IP Address</Label>
          <Input
            id="ip-address"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            placeholder="e.g. 192.168.1.0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cidr-prefix">CIDR Prefix (optional)</Label>
          <Input
            id="cidr-prefix"
            type="number"
            min={0}
            max={128}
            value={cidrPrefix}
            onChange={(e) => setCidrPrefix(e.target.value)}
            placeholder="e.g. 24"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wl-role">Role (ID, optional)</Label>
          <Input
            id="wl-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wl-user">User (ID, optional)</Label>
          <Input
            id="wl-user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="User ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wl-description">Description</Label>
          <Input
            id="wl-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Office VPN, etc."
          />
        </div>

        <div className="flex items-end gap-3 pb-0.5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="wl-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="wl-active">Active</Label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading || !ipAddress}>
          <Plus className="mr-2 h-4 w-4" />
          {loading ? "Adding..." : "Add Entry"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
