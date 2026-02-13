const fs = require("fs");
const base = "C:/copia dell/backup windows10/CRM/CRM Back end/apps/emails";

const views = fs.readFileSync(base + "/_views_content.txt", "utf-8");
fs.writeFileSync(base + "/views.py", views, "utf-8");
console.log("views.py written");