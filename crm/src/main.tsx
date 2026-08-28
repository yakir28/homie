import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CrmApp from "./CrmApp";
import "./global.css";
import "./icons.css";
import "./tasks.css";
import "./users.css";
import "./dashboard.css";
import "./modern.css";
import "./urgent.css";
import "./search.css";
import "./task-modal.css";
import "./search-adjustments.css";
import "./finance.css";
import "./finance-calendar.css";
import "./user-drawer.css";
import "./account-actions.css";

createRoot(document.getElementById("root")!).render(<StrictMode><CrmApp /></StrictMode>);
