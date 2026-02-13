"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getModules,
  getFieldLabels,
  saveFieldLabel,
  updateFieldLabel,
} from "@/lib/api/module-config";
import type { CRMModule, FieldLabel } from "@/types";

/* ------------------------------------------------------------------ */
/*  Languages                                                          */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { code: "es", label: "ES Spanish" },
  { code: "en", label: "EN English" },
  { code: "fr", label: "FR French" },
  { code: "pt", label: "PT Portuguese" },
  { code: "zh", label: "ZH Chinese" },
  { code: "ko", label: "KO Korean" },
  { code: "vi", label: "VI Vietnamese" },
  { code: "ht", label: "HT Haitian Creole" },
];

/* ------------------------------------------------------------------ */
/*  Default field names per module (keyed by CRMModule.name)           */
/* ------------------------------------------------------------------ */

const MODULE_FIELDS: Record<string, string[]> = {
  contacts: [
    "Contacts", "Contact", "Add Contact", "Contact List", "Contact Details",
    "Salutation", "First Name", "Last Name", "Full Name", "Email",
    "Phone", "Mobile", "Date of Birth", "SSN", "Preferred Language",
    "Mailing Street", "Mailing City", "Mailing State", "Mailing Zip",
    "Mailing Country", "Source", "Status", "Assigned To",
    "Secondary Email", "Secondary Phone", "Primary Phone", "Primary Email",
    "Description", "Created At", "Updated At",
  ],
  corporations: [
    "Organizations", "Organization", "Add Organization", "Organization List",
    "Organization Details", "Organization Hierarchy",
    "Industry", "Organization Name", "Organization ID", "Website",
    "Ticker Symbol", "Member Of", "Employees", "Ownership", "SIC Code",
    "Secondary Email", "Secondary Phone", "Primary Phone", "Primary Email",
    "Mailing Street", "Mailing City", "Mailing State", "Mailing Zip",
    "Mailing Country", "EIN", "Description", "Assigned To",
    "Created At", "Updated At",
  ],
  cases: [
    "Cases", "Case", "Add Case", "Case List", "Case Details",
    "Case Type", "Tax Year", "Status", "Priority", "Assigned To",
    "Filing Deadline", "Estimated Fee", "Actual Fee", "Balance Due",
    "Contact", "Corporation", "Description", "Notes",
    "Created At", "Updated At",
  ],
  quotes: [
    "Quotes", "Quote", "Add Quote", "Quote List", "Quote Details",
    "Quote Number", "Subject", "Status", "Valid Until",
    "Contact", "Corporation", "Case", "Subtotal", "Discount",
    "Tax", "Total", "Terms & Conditions", "Description",
    "Created At", "Updated At",
  ],
  tasks: [
    "Tasks", "Task", "Add Task", "Task List", "Task Details",
    "Title", "Description", "Priority", "Status", "Assigned To",
    "Due Date", "Completed At", "Contact", "Case",
    "SLA Hours", "Created At", "Updated At",
  ],
  documents: [
    "Documents", "Document", "Add Document", "Document List", "Document Details",
    "Title", "File", "Document Type", "Status", "Description",
    "File Size", "MIME Type", "Version", "Folder", "Tags",
    "Contact", "Corporation", "Case", "Uploaded By",
    "Created At", "Updated At",
  ],
  appointments: [
    "Appointments", "Appointment", "Add Appointment", "Appointment List",
    "Appointment Details", "Title", "Description", "Start Date Time",
    "End Date Time", "Location", "Status", "Assigned To", "Contact",
    "Case", "Recurrence", "Created At", "Updated At",
  ],
  internal_tickets: [
    "Internal Tickets", "Internal Ticket", "Add Ticket", "Ticket List",
    "Ticket Details", "Subject", "Description", "Priority", "Status",
    "Category", "Assigned To", "Contact", "Case",
    "Created At", "Updated At",
  ],
  dashboard: [
    "Dashboard", "Dashboards", "Widget", "Add Widget", "Dashboard Settings",
    "Overview", "Analytics", "Chart", "Report", "Metric",
    "Filter", "Date Range", "Refresh", "Export",
    "Created At", "Updated At",
  ],
  users: [
    "Users", "User", "Add User", "User List", "User Details",
    "First Name", "Last Name", "Full Name", "Email", "Phone",
    "Role", "Profile", "Status", "Active", "Last Login",
    "Password", "Change Password", "Two-Factor Auth",
    "Created At", "Updated At",
  ],
  audit: [
    "Audit Logs", "Audit Log", "Audit Trail", "Log Details",
    "Action", "Module", "Record", "User", "IP Address",
    "Old Value", "New Value", "Timestamp", "Changes",
    "Created At",
  ],
  emails: [
    "Emails", "Email", "Compose Email", "Email List", "Email Details",
    "From", "To", "CC", "BCC", "Subject", "Body",
    "Attachments", "Status", "Sent At", "Received At",
    "Email Account", "Template", "Signature",
    "Created At", "Updated At",
  ],
  notifications: [
    "Notifications", "Notification", "Add Notification", "Notification List",
    "Notification Details", "Title", "Message", "Type",
    "Read", "Unread", "Priority", "Recipient",
    "Created At", "Updated At",
  ],
  workflows: [
    "Workflows", "Workflow", "Add Workflow", "Workflow List", "Workflow Details",
    "Name", "Module", "Trigger", "Conditions", "Actions",
    "Status", "Active", "Execution Order", "Description",
    "Created At", "Updated At",
  ],
  portal: [
    "Portals", "Portal", "Portal Settings", "Portal Users",
    "Portal Access", "Portal Documents", "Portal Messages",
    "Account", "Username", "Password", "Status", "Active",
    "Last Login", "Permissions",
    "Created At", "Updated At",
  ],
  sales_insights: [
    "Sales Insights", "Sales Insight", "Analytics", "Pipeline",
    "Revenue", "Conversion Rate", "Win Rate", "Average Deal Size",
    "Sales Cycle", "Forecast", "Target", "Achievement",
    "Period", "Region", "Team",
    "Created At", "Updated At",
  ],
  forecasts: [
    "Forecasts", "Forecast", "Add Forecast", "Forecast List", "Forecast Details",
    "Quota", "Target", "Achievement", "Gap",
    "Period", "Fiscal Year", "Quarter", "Month",
    "Category", "Best Case", "Committed", "Pipeline",
    "Owner", "Team", "Status",
    "Created At", "Updated At",
  ],
  reports: [
    "Reports", "Report", "Add Report", "Report List", "Report Details",
    "Name", "Module", "Report Type", "Folder", "Description",
    "Columns", "Filters", "Group By", "Sort By",
    "Chart Type", "Schedule", "Shared With",
    "Created At", "Updated At",
  ],
  esign: [
    "Esign Documents", "Esign Document", "Add Esign Document",
    "Esign Document List", "Esign Document Details",
    "Title", "Status", "Document Source", "File",
    "Email Subject", "Email Message",
    "Signee", "Signees", "Recipient Email", "Sign Status",
    "Sent At", "Completed At", "Expires At",
    "Created At", "Updated At",
  ],
  approvals: [
    "Approvals", "Approval", "Add Approval", "Approval List", "Approval Details",
    "Name", "Module", "Trigger", "Apply On",
    "Entry Criteria", "Rules", "Rule Number",
    "Approvers", "Owner Profiles", "Conditions",
    "Approval Actions", "Rejection Actions",
    "Action Type", "Action Title", "Active",
    "Created At", "Updated At",
  ],
  products: [
    "Products", "Product", "Add Product", "Product List", "Product Details",
    "Product Code", "Name", "Category", "Unit Price", "Cost Price",
    "Unit", "Qty In Stock", "Qty Ordered", "Reorder Level",
    "Manufacturer", "Vendor", "Tax Rate", "Description",
    "Created At", "Updated At",
  ],
  services: [
    "Services", "Service", "Add Service", "Service List", "Service Details",
    "Service Code", "Name", "Category", "Unit Price", "Usage Unit",
    "Tax Rate", "Description",
    "Created At", "Updated At",
  ],
  vendors: [
    "Vendors", "Vendor", "Add Vendor", "Vendor List", "Vendor Details",
    "Name", "Vendor Code", "Email", "Phone", "Website",
    "Category", "Street", "City", "State", "Zip Code", "Country",
    "Description", "Assigned To",
    "Created At", "Updated At",
  ],
  invoices: [
    "Invoices", "Invoice", "Add Invoice", "Invoice List", "Invoice Details",
    "Invoice Number", "Subject", "Status", "Invoice Date", "Due Date",
    "Contact", "Corporation", "Sales Order",
    "Subtotal", "Discount", "Tax Amount", "Adjustment", "Total",
    "Terms & Conditions", "Description", "Assigned To",
    "Created At", "Updated At",
  ],
  sales_orders: [
    "Sales Orders", "Sales Order", "Add Sales Order", "Sales Order List",
    "Sales Order Details", "SO Number", "Subject", "Status",
    "Order Date", "Due Date", "Contact", "Corporation", "Quote",
    "Subtotal", "Discount", "Tax Amount", "Adjustment", "Total",
    "Terms & Conditions", "Description", "Assigned To",
    "Created At", "Updated At",
  ],
  purchase_orders: [
    "Purchase Orders", "Purchase Order", "Add Purchase Order",
    "Purchase Order List", "Purchase Order Details",
    "PO Number", "Subject", "Status", "Vendor",
    "Order Date", "Due Date", "Contact",
    "Subtotal", "Discount", "Tax Amount", "Adjustment", "Total",
    "Terms & Conditions", "Description", "Assigned To",
    "Created At", "Updated At",
  ],
  payments: [
    "Payments", "Payment", "Add Payment", "Payment List", "Payment Details",
    "Payment Number", "Amount", "Payment Date", "Payment Mode",
    "Reference Number", "Invoice", "Contact", "Status", "Notes",
    "Created At", "Updated At",
  ],
  work_orders: [
    "Work Orders", "Work Order", "Add Work Order", "Work Order List",
    "Work Order Details", "WO Number", "Subject", "Status", "Priority",
    "Assigned To", "Sales Order", "Start Date", "End Date", "Description",
    "Created At", "Updated At",
  ],
  assets: [
    "Assets", "Asset", "Add Asset", "Asset List", "Asset Details",
    "Name", "Serial Number", "Product", "Contact", "Corporation",
    "Status", "Purchase Date", "Warranty End Date", "Description",
    "Created At", "Updated At",
  ],
  price_books: [
    "Price Books", "Price Book", "Add Price Book", "Price Book List",
    "Price Book Details", "Name", "Currency", "Description",
    "List Price", "Product", "Service",
    "Created At", "Updated At",
  ],
};

/* ------------------------------------------------------------------ */
/*  Default Spanish translations                                       */
/* ------------------------------------------------------------------ */

const SPANISH_DEFAULTS: Record<string, string> = {
  // Common
  "Add": "Añadir", "List": "Lista", "Details": "Detalles",
  "Description": "Descripción", "Status": "Estado", "Priority": "Prioridad",
  "Created At": "Fecha de creación", "Updated At": "Fecha de actualización",
  "Assigned To": "Asignado a", "Contact": "Contacto", "Case": "Caso",
  "Title": "Título", "Email": "Correo electrónico", "Phone": "Teléfono",
  "Website": "Sitio web", "Notes": "Notas", "Active": "Activo",
  "Name": "Nombre", "Module": "Módulo", "Type": "Tipo",
  "Actions": "Acciones", "Filter": "Filtro", "Export": "Exportar",
  // Contacts
  "Contacts": "Contactos",
  "Add Contact": "Añadir contacto", "Contact List": "Lista de contactos",
  "Contact Details": "Detalles del contacto",
  "Salutation": "Saludo", "First Name": "Nombre", "Last Name": "Apellido",
  "Full Name": "Nombre completo", "Mobile": "Móvil",
  "Date of Birth": "Fecha de nacimiento", "SSN": "Número de seguro social",
  "Preferred Language": "Idioma preferido",
  "Mailing Street": "Calle de correo", "Mailing City": "Ciudad de correo",
  "Mailing State": "Estado de correo", "Mailing Zip": "Código postal de correo",
  "Mailing Country": "País de correo", "Source": "Fuente",
  "Secondary Email": "Correo electrónico secundario",
  "Secondary Phone": "Teléfono secundario",
  "Primary Phone": "Teléfono principal", "Primary Email": "Correo electrónico principal",
  // Organizations
  "Organizations": "Organizaciones", "Organization": "Organización",
  "Add Organization": "Añadir organización",
  "Organization List": "Lista de organizaciones",
  "Organization Details": "Detalles de la organización",
  "Organization Hierarchy": "Jerarquía de la organización",
  "Industry": "Industria", "Organization Name": "Nombre de la organización",
  "Organization ID": "Número de la organización",
  "Ticker Symbol": "Símbolo del ticker", "Member Of": "Miembro de",
  "Employees": "Empleados", "Ownership": "Propiedad",
  "SIC Code": "Código SIC", "EIN": "EIN",
  // Cases
  "Cases": "Casos", "Case Details": "Detalles del caso",
  "Add Case": "Añadir caso", "Case List": "Lista de casos",
  "Case Type": "Tipo de caso", "Tax Year": "Año fiscal",
  "Filing Deadline": "Fecha límite de presentación",
  "Estimated Fee": "Honorario estimado", "Actual Fee": "Honorario real",
  "Balance Due": "Saldo pendiente", "Corporation": "Corporación",
  // Quotes
  "Quotes": "Cotizaciones", "Quote": "Cotización",
  "Add Quote": "Añadir cotización", "Quote List": "Lista de cotizaciones",
  "Quote Details": "Detalles de la cotización",
  "Quote Number": "Número de cotización", "Subject": "Asunto",
  "Valid Until": "Válido hasta", "Subtotal": "Subtotal",
  "Discount": "Descuento", "Tax": "Impuesto", "Total": "Total",
  "Terms & Conditions": "Términos y condiciones",
  // Tasks
  "Tasks": "Tareas", "Task": "Tarea",
  "Add Task": "Añadir tarea", "Task List": "Lista de tareas",
  "Task Details": "Detalles de la tarea",
  "Due Date": "Fecha de vencimiento", "Completed At": "Completado en",
  "SLA Hours": "Horas de SLA",
  // Documents
  "Documents": "Documentos", "Document": "Documento",
  "Add Document": "Añadir documento", "Document List": "Lista de documentos",
  "Document Details": "Detalles del documento",
  "File": "Archivo", "Document Type": "Tipo de documento",
  "File Size": "Tamaño del archivo", "MIME Type": "Tipo MIME",
  "Version": "Versión", "Folder": "Carpeta", "Tags": "Etiquetas",
  "Uploaded By": "Subido por",
  // Appointments
  "Appointments": "Citas", "Appointment": "Cita",
  "Add Appointment": "Añadir cita", "Appointment List": "Lista de citas",
  "Appointment Details": "Detalles de la cita",
  "Start Date Time": "Fecha y hora de inicio",
  "End Date Time": "Fecha y hora de fin",
  "Location": "Ubicación", "Recurrence": "Recurrencia",
  // Internal Tickets
  "Internal Tickets": "Tickets internos", "Internal Ticket": "Ticket interno",
  "Add Ticket": "Añadir ticket", "Ticket List": "Lista de tickets",
  "Ticket Details": "Detalles del ticket", "Category": "Categoría",
  // Dashboard
  "Dashboard": "Tablero", "Dashboards": "Tableros",
  "Widget": "Widget", "Add Widget": "Añadir widget",
  "Dashboard Settings": "Configuración del tablero",
  "Overview": "Resumen", "Analytics": "Analítica",
  "Chart": "Gráfico", "Report": "Reporte", "Metric": "Métrica",
  "Date Range": "Rango de fechas", "Refresh": "Actualizar",
  // Users
  "Users": "Usuarios", "User": "Usuario",
  "Add User": "Añadir usuario", "User List": "Lista de usuarios",
  "User Details": "Detalles del usuario",
  "Role": "Rol", "Profile": "Perfil", "Last Login": "Último acceso",
  "Password": "Contraseña", "Change Password": "Cambiar contraseña",
  "Two-Factor Auth": "Autenticación de dos factores",
  // Audit
  "Audit Logs": "Registros de auditoría", "Audit Log": "Registro de auditoría",
  "Audit Trail": "Pista de auditoría", "Log Details": "Detalles del registro",
  "Action": "Acción", "Record": "Registro", "IP Address": "Dirección IP",
  "Old Value": "Valor anterior", "New Value": "Valor nuevo",
  "Timestamp": "Marca de tiempo", "Changes": "Cambios",
  // Emails
  "Emails": "Correos", "Compose Email": "Redactar correo",
  "Email List": "Lista de correos", "Email Details": "Detalles del correo",
  "From": "De", "To": "Para", "CC": "CC", "BCC": "CCO",
  "Body": "Cuerpo", "Attachments": "Adjuntos",
  "Sent At": "Enviado el", "Received At": "Recibido el",
  "Email Account": "Cuenta de correo", "Template": "Plantilla",
  "Signature": "Firma",
  // Notifications
  "Notifications": "Notificaciones", "Notification": "Notificación",
  "Add Notification": "Añadir notificación",
  "Notification List": "Lista de notificaciones",
  "Notification Details": "Detalles de la notificación",
  "Message": "Mensaje", "Read": "Leído", "Unread": "No leído",
  "Recipient": "Destinatario",
  // Workflows
  "Workflows": "Flujos de trabajo", "Workflow": "Flujo de trabajo",
  "Add Workflow": "Añadir flujo de trabajo",
  "Workflow List": "Lista de flujos de trabajo",
  "Workflow Details": "Detalles del flujo de trabajo",
  "Trigger": "Disparador", "Conditions": "Condiciones",
  "Execution Order": "Orden de ejecución",
  // Portal
  "Portals": "Portales", "Portal": "Portal",
  "Portal Settings": "Configuración del portal",
  "Portal Users": "Usuarios del portal",
  "Portal Access": "Acceso al portal",
  "Portal Documents": "Documentos del portal",
  "Portal Messages": "Mensajes del portal",
  "Account": "Cuenta", "Username": "Nombre de usuario",
  "Permissions": "Permisos",
  // Sales Insights
  "Sales Insights": "Perspectivas de ventas", "Sales Insight": "Perspectiva de ventas",
  "Pipeline": "Pipeline", "Revenue": "Ingresos",
  "Conversion Rate": "Tasa de conversión", "Win Rate": "Tasa de éxito",
  "Average Deal Size": "Tamaño promedio del trato",
  "Sales Cycle": "Ciclo de ventas", "Forecast": "Pronóstico",
  "Target": "Meta", "Achievement": "Logro",
  "Period": "Período", "Region": "Región", "Team": "Equipo",
  // Forecasts
  "Forecasts": "Pronósticos",
  "Add Forecast": "Añadir pronóstico", "Forecast List": "Lista de pronósticos",
  "Forecast Details": "Detalles del pronóstico",
  "Quota": "Cuota", "Gap": "Brecha",
  "Fiscal Year": "Año fiscal", "Quarter": "Trimestre", "Month": "Mes",
  "Best Case": "Mejor caso", "Committed": "Comprometido",
  "Owner": "Propietario",
  // Reports
  "Reports": "Reportes",
  "Add Report": "Añadir reporte", "Report List": "Lista de reportes",
  "Report Details": "Detalles del reporte",
  "Report Type": "Tipo de reporte", "Columns": "Columnas",
  "Filters": "Filtros", "Group By": "Agrupar por", "Sort By": "Ordenar por",
  "Chart Type": "Tipo de gráfico", "Schedule": "Programación",
  "Shared With": "Compartido con",
  // Esign
  "Esign Documents": "Documentos de firma electrónica",
  "Esign Document": "Documento de firma electrónica",
  "Add Esign Document": "Añadir documento de firma",
  "Esign Document List": "Lista de documentos de firma",
  "Esign Document Details": "Detalles del documento de firma",
  "Document Source": "Fuente del documento",
  "Email Subject": "Asunto del correo", "Email Message": "Mensaje del correo",
  "Signee": "Firmante", "Signees": "Firmantes",
  "Recipient Email": "Correo del destinatario",
  "Sign Status": "Estado de firma",
  "Expires At": "Expira el",
  // Approvals
  "Approvals": "Aprobaciones", "Approval": "Aprobación",
  "Add Approval": "Añadir aprobación", "Approval List": "Lista de aprobaciones",
  "Approval Details": "Detalles de la aprobación",
  "Apply On": "Aplicar en", "Entry Criteria": "Criterios de entrada",
  "Rules": "Reglas", "Rule Number": "Número de regla",
  "Approvers": "Aprobadores", "Owner Profiles": "Perfiles del propietario",
  "Approval Actions": "Acciones de aprobación",
  "Rejection Actions": "Acciones de rechazo",
  "Action Type": "Tipo de acción", "Action Title": "Título de la acción",
  // Products
  "Products": "Productos", "Product": "Producto",
  "Add Product": "Añadir producto", "Product List": "Lista de productos",
  "Product Details": "Detalles del producto",
  "Product Code": "Código de producto", "Unit Price": "Precio unitario",
  "Cost Price": "Precio de costo", "Unit": "Unidad",
  "Qty In Stock": "Cantidad en stock", "Qty Ordered": "Cantidad ordenada",
  "Reorder Level": "Nivel de reorden", "Manufacturer": "Fabricante",
  // Services
  "Services": "Servicios", "Service": "Servicio",
  "Add Service": "Añadir servicio", "Service List": "Lista de servicios",
  "Service Details": "Detalles del servicio",
  "Service Code": "Código de servicio", "Usage Unit": "Unidad de uso",
  // Vendors
  "Vendors": "Proveedores", "Vendor": "Proveedor",
  "Add Vendor": "Añadir proveedor", "Vendor List": "Lista de proveedores",
  "Vendor Details": "Detalles del proveedor",
  "Vendor Code": "Código de proveedor",
  "Street": "Calle", "City": "Ciudad", "State": "Estado",
  "Zip Code": "Código postal", "Country": "País",
  // Invoices
  "Invoices": "Facturas", "Invoice": "Factura",
  "Add Invoice": "Añadir factura", "Invoice List": "Lista de facturas",
  "Invoice Details": "Detalles de la factura",
  "Invoice Number": "Número de factura", "Invoice Date": "Fecha de factura",
  "Tax Amount": "Monto de impuesto", "Adjustment": "Ajuste",
  // Sales Orders
  "Sales Orders": "Órdenes de venta", "Sales Order": "Orden de venta",
  "Add Sales Order": "Añadir orden de venta",
  "Sales Order List": "Lista de órdenes de venta",
  "Sales Order Details": "Detalles de la orden de venta",
  "SO Number": "Número de OV", "Order Date": "Fecha de orden",
  // Purchase Orders
  "Purchase Orders": "Órdenes de compra", "Purchase Order": "Orden de compra",
  "Add Purchase Order": "Añadir orden de compra",
  "Purchase Order List": "Lista de órdenes de compra",
  "Purchase Order Details": "Detalles de la orden de compra",
  "PO Number": "Número de OC",
  // Payments
  "Payments": "Pagos", "Payment": "Pago",
  "Add Payment": "Añadir pago", "Payment List": "Lista de pagos",
  "Payment Details": "Detalles del pago",
  "Payment Number": "Número de pago", "Amount": "Monto",
  "Payment Date": "Fecha de pago", "Payment Mode": "Modo de pago",
  "Reference Number": "Número de referencia",
  // Work Orders
  "Work Orders": "Órdenes de trabajo", "Work Order": "Orden de trabajo",
  "Add Work Order": "Añadir orden de trabajo",
  "Work Order List": "Lista de órdenes de trabajo",
  "Work Order Details": "Detalles de la orden de trabajo",
  "WO Number": "Número de OT", "Start Date": "Fecha de inicio",
  "End Date": "Fecha de fin",
  // Assets
  "Assets": "Activos", "Asset": "Activo",
  "Add Asset": "Añadir activo", "Asset List": "Lista de activos",
  "Asset Details": "Detalles del activo",
  "Serial Number": "Número de serie", "Purchase Date": "Fecha de compra",
  "Warranty End Date": "Fecha de fin de garantía",
  // Price Books
  "Price Books": "Listas de precios", "Price Book": "Lista de precios",
  "Add Price Book": "Añadir lista de precios",
  "Price Book List": "Lista de listas de precios",
  "Price Book Details": "Detalles de la lista de precios",
  "Currency": "Moneda", "List Price": "Precio de lista",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LabelsEditorPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1: Language
  const [language, setLanguage] = useState("es");

  // Step 2: Module selection
  const [modules, setModules] = useState<CRMModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [searchLabel, setSearchLabel] = useState("");

  // Step 3: Labels data
  const [existingLabels, setExistingLabels] = useState<FieldLabel[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Get selected module info
  const selectedModule = modules.find((m) => m.id === selectedModuleId);
  const moduleKey = selectedModule?.name || "";

  // Build field list: static map or dynamic fallback from module metadata
  const fields = (() => {
    if (MODULE_FIELDS[moduleKey]) return MODULE_FIELDS[moduleKey];
    if (!selectedModule) return [];
    // Dynamic fallback: generate basic labels from module label/label_plural
    const s = selectedModule.label;
    const p = selectedModule.label_plural;
    return [
      p, s, `Add ${s}`, `${s} List`, `${s} Details`,
      "Name", "Description", "Status", "Created At", "Updated At",
    ];
  })();

  // Fetch modules
  useEffect(() => {
    getModules({ page_size: "100" })
      .then((res) => {
        const mods = res.results || [];
        setModules(mods);
        if (mods.length > 0 && !selectedModuleId) {
          setSelectedModuleId(mods[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch labels for selected module + language
  const fetchLabels = useCallback(async () => {
    if (!selectedModuleId) return;
    try {
      const raw = await getFieldLabels(selectedModuleId);
      // Handle both array and paginated responses
      const labels: FieldLabel[] = Array.isArray(raw)
        ? raw
        : (raw as { results?: FieldLabel[] }).results || [];
      const filtered = labels.filter((l: FieldLabel) => l.language === language);
      setExistingLabels(filtered);

      // Initialize custom values from existing labels
      const vals: Record<string, string> = {};
      filtered.forEach((l: FieldLabel) => {
        vals[l.field_name] = l.custom_label;
      });
      setCustomValues(vals);
      setDirty(false);
    } catch {
      setExistingLabels([]);
      setCustomValues({});
    }
  }, [selectedModuleId, language]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Filter fields by search
  const filteredFields = fields.filter((field) => {
    if (!searchLabel) return true;
    const q = searchLabel.toLowerCase();
    const defaultLabel = getDefaultLabel(field, language);
    const custom = customValues[field] || defaultLabel;
    return (
      field.toLowerCase().includes(q) ||
      defaultLabel.toLowerCase().includes(q) ||
      custom.toLowerCase().includes(q)
    );
  });

  // Get default translation
  function getDefaultLabel(englishLabel: string, lang: string): string {
    if (lang === "en") return englishLabel;
    if (lang === "es") return SPANISH_DEFAULTS[englishLabel] || englishLabel;
    return englishLabel;
  }

  // Update custom value
  const handleCustomChange = (field: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  // Save all changes
  const handleSave = async () => {
    if (!selectedModuleId) return;
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      for (const field of fields) {
        const customVal = customValues[field];
        if (!customVal) continue;

        const existing = existingLabels.find((l) => l.field_name === field);
        if (existing) {
          if (existing.custom_label !== customVal) {
            promises.push(
              updateFieldLabel(selectedModuleId, existing.id, {
                custom_label: customVal,
              })
            );
          }
        } else {
          const defaultLabel = getDefaultLabel(field, language);
          if (customVal !== defaultLabel) {
            promises.push(
              saveFieldLabel(selectedModuleId, {
                field_name: field,
                language,
                custom_label: customVal,
              })
            );
          }
        }
      }

      await Promise.all(promises);
      await fetchLabels();
      setDirty(false);
    } catch {
      /* save error */
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels Editor"
        actions={
          dirty ? (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          ) : undefined
        }
      />

      <p className="text-sm text-muted-foreground">
        Customize Field Names, Menu Names and other labels to suit your business
        needs
      </p>

      {/* Steps */}
      <div className="space-y-4">
        {/* Step 1: Language */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-14">Step 1</span>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 2: Search or Module */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-14">Step 2</span>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Enter label to search"
              value={searchLabel}
              onChange={(e) => setSearchLabel(e.target.value)}
            />
          </div>
          <span className="text-sm text-muted-foreground font-medium">OR</span>
          <Select value={selectedModuleId} onValueChange={(val) => {
            setSelectedModuleId(val);
            setSearchLabel("");
          }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {language === "es"
                    ? SPANISH_DEFAULTS[m.label_plural] || m.label_plural
                    : m.label_plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 3: Table */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-14">Step 3</span>
          <span className="text-sm text-muted-foreground">
            Edit Labels in the table below
          </span>
        </div>
      </div>

      {/* Labels Table */}
      {modules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No modules found. Run the seed command to load modules.
        </div>
      ) : filteredFields.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {fields.length === 0
            ? "Select a module to view its labels."
            : "No labels match your search."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">US English Label</TableHead>
                <TableHead className="w-1/3">Default Label</TableHead>
                <TableHead className="w-1/3">Custom Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFields.map((field) => {
                const defaultLabel = getDefaultLabel(field, language);
                const customVal = customValues[field] ?? defaultLabel;
                return (
                  <TableRow key={field}>
                    <TableCell className="text-muted-foreground">
                      {field}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {defaultLabel}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 border-0 bg-transparent px-0 font-medium focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary focus-visible:rounded-none"
                        value={customVal}
                        onChange={(e) =>
                          handleCustomChange(field, e.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
