"use client";

import { ContactCard } from "./contact-card";
import type { ContactListItem } from "@/types";

interface ContactGridProps {
  contacts: ContactListItem[];
  onStar?: (id: string) => void;
}

export function ContactGrid({ contacts, onStar }: ContactGridProps) {
  if (contacts.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {contacts.map((contact) => (
        <ContactCard key={contact.id} contact={contact} onStar={onStar} />
      ))}
    </div>
  );
}
