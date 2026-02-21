"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  portalCreateInvoice,
  portalGetProducts,
  portalGetServices,
} from "@/lib/api/portal";
import type {
  CreateInvoiceInput,
  CreateLineItemInput,
  TenantProduct,
  TenantService,
} from "@/types/portal-billing";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface LineItemForm extends CreateLineItemInput {
  id: string;
  itemName: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [services, setServices] = useState<TenantService[]>([]);

  const [formData, setFormData] = useState({
    subject: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    tax_percent: "0",
    discount_amount: "0",
    notes: "",
    terms_conditions: "",
  });

  const [lineItems, setLineItems] = useState<LineItemForm[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, servicesRes] = await Promise.all([
          portalGetProducts(),
          portalGetServices(),
        ]);
        setProducts(productsRes.results);
        setServices(servicesRes.results);
      } catch (err) {
        console.error("Failed to load products/services");
      }
    }
    fetchData();
  }, []);

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setLineItems([
      ...lineItems,
      {
        id: `item-${Date.now()}`,
        product: product.id,
        itemName: product.name,
        quantity: "1",
        unit_price: product.unit_price,
        discount_percent: "0",
      },
    ]);
  };

  const addService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setLineItems([
      ...lineItems,
      {
        id: `item-${Date.now()}`,
        service: service.id,
        itemName: service.name,
        quantity: "1",
        unit_price: service.unit_price,
        discount_percent: "0",
      },
    ]);
  };

  const addCustomItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `item-${Date.now()}`,
        itemName: "Custom Item",
        description: "",
        quantity: "1",
        unit_price: "0",
        discount_percent: "0",
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof LineItemForm, value: string) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const discount = parseFloat(item.discount_percent || "0") || 0;
      return sum + qty * price * (1 - discount / 100);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * (parseFloat(formData.tax_percent) / 100);
    const discount = parseFloat(formData.discount_amount) || 0;
    return subtotal + tax - discount;
  };

  const handleSubmit = async () => {
    if (!formData.subject) {
      setError("Subject is required");
      return;
    }
    if (!formData.customer_name) {
      setError("Customer name is required");
      return;
    }
    if (lineItems.length === 0) {
      setError("At least one line item is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const invoiceData: CreateInvoiceInput = {
        ...formData,
        line_items: lineItems.map(({ id, itemName, ...item }) => item),
      };
      const invoice = await portalCreateInvoice(invoiceData);
      router.push(`/portal/billing/invoices/${invoice.id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to create invoice");
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/billing/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Invoice</h1>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) =>
                  setFormData({ ...formData, customer_email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) =>
                  setFormData({ ...formData, customer_phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.customer_address}
                onChange={(e) =>
                  setFormData({ ...formData, customer_address: e.target.value })
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="e.g., Invoice for consulting services"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.tax_percent}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_percent: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Discount $</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_amount: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax ({formData.tax_percent || 0}%):
              </span>
              <span>
                {formatCurrency(
                  calculateSubtotal() * (parseFloat(formData.tax_percent) / 100)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span>-{formatCurrency(parseFloat(formData.discount_amount) || 0)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(calculateTotal())}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex gap-2">
            <Select onValueChange={addProduct}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Add Product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={addService}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Add Service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addCustomItem}>
              <Plus className="mr-2 h-4 w-4" />
              Custom Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No items added. Add products, services, or custom items above.
            </div>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-3">
                    <div className="font-medium">{item.itemName}</div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, "quantity", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateLineItem(item.id, "unit_price", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.discount_percent}
                          onChange={(e) =>
                            updateLineItem(item.id, "discount_percent", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Total</Label>
                        <div className="flex h-10 items-center font-medium">
                          {formatCurrency(
                            (parseFloat(item.quantity) || 0) *
                              (parseFloat(item.unit_price) || 0) *
                              (1 - (parseFloat(item.discount_percent || "0") || 0) / 100)
                          )}
                        </div>
                      </div>
                    </div>
                    {!item.product && !item.service && (
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description || ""}
                          onChange={(e) =>
                            updateLineItem(item.id, "description", e.target.value)
                          }
                          placeholder="Item description"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Additional notes for the customer"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.terms_conditions}
              onChange={(e) =>
                setFormData({ ...formData, terms_conditions: e.target.value })
              }
              rows={4}
              placeholder="Payment terms, conditions, etc."
            />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/portal/billing/invoices">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </div>
  );
}
