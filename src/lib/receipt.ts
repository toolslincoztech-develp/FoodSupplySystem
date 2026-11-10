function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

import { LOGO_DATA_URI } from "./logoData";

export interface ReceiptPrintOptions {
  paymentStatus?: "PAID" | "UNPAID" | string;
  paymentMethod?: string;
  cashierName?: string;
  restaurantName?: string;
  receiptType?: string;
  addressLine1?: string;
  addressLine2?: string;
  whatsapp?: string;
  win?: Window | null;
}

export function generateReceiptHtml(order: any, options?: ReceiptPrintOptions): string {
  const logoSrc = LOGO_DATA_URI;

  const restaurantName = options?.restaurantName || order.restaurant?.name || "JOSAN FOODS";
  const receiptType = options?.receiptType || "CASH RECEIPT";

  // Clean order number matching sample format (e.g., "12" or "1012")
  let orderNumDisplay = "1";
  if (order.orderNumber) {
    const cleanStr = String(order.orderNumber);
    const numMatch = cleanStr.match(/\d+$/);
    if (numMatch) {
      orderNumDisplay = String(parseInt(numMatch[0], 10));
    } else {
      orderNumDisplay = cleanStr.replace(/^#/, "");
    }
  }

  // Format date matching: "10/11/2026, 7:20:16 PM"
  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedDate =
    orderDate.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    }) +
    ", " +
    orderDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

  // Order type
  const orderTypeRaw = order.orderType ? String(order.orderType).replace("_", " ").toUpperCase() : "TAKEAWAY";
  const formattedTableName = order.table?.name ? (order.table.floor ? `${order.table.floor} - ${order.table.name}` : order.table.name) : "";
  const typeDisplay = orderTypeRaw === "DINE IN" && formattedTableName ? `DINE IN (${formattedTableName})` : orderTypeRaw;

  // Payment status / method
  const paymentDisplay = options?.paymentStatus || (order.payment?.status === "PAID" ? "PAID" : order.payment?.method || (order.status === "COMPLETED" ? "PAID" : "PAID"));

  // Cashier
  const cashierDisplay = options?.cashierName || order.user?.name || "Josan Foods";

  // Items table rows
  const items = order.items || [];
  const groupedItems: { name: string; quantity: number; price: number; cleanNotes: string }[] = [];
  const groupMap = new Map<string, number>();

  items.forEach((i: any) => {
    const name = i.menuItem?.name || i.name || "Item";
    const qty = i.quantity || 1;
    const price = Number(i.price) || 0;
    const cleanNotes = i.notes
      ? i.notes.replace(/\s*\|\s*\[NEW ADDITION\]|\[NEW ADDITION\]/g, "").trim()
      : "";
    const key = `${name}__${price}__${cleanNotes}`;

    if (groupMap.has(key)) {
      const existingIdx = groupMap.get(key)!;
      groupedItems[existingIdx].quantity += qty;
    } else {
      groupMap.set(key, groupedItems.length);
      groupedItems.push({ name, quantity: qty, price, cleanNotes });
    }
  });

  const itemsHtml = groupedItems
    .map((i) => {
      const lineTotal = (i.price * i.quantity).toFixed(2);
      const notes =
        i.cleanNotes && !i.cleanNotes.includes("Delivery To:") && !i.cleanNotes.includes("Takeaway For:")
          ? `<div style="font-size: 10px; color: #444; font-style: italic;">${i.cleanNotes}</div>`
          : "";

      return `
        <tr>
          <td class="col-item">
            <div>${i.name}</div>
            ${notes}
          </td>
          <td class="col-qty">${i.quantity}</td>
          <td class="col-total">${lineTotal}</td>
        </tr>
      `;
    })
    .join("");

  // Totals calculations
  const totalAmount = Number(order.total) || 0;
  const taxAmount = Number(order.tax) || 0;
  const discountAmount = Number(order.discount) || 0;
  let deliveryFee = Number(order.deliveryFee) || 0;
  if (!deliveryFee) {
    const firstNote = order.items?.[0]?.notes || "";
    const feeMatch = firstNote.match(/Delivery Fee:\s*(?:Rs\s*)?([0-9.]+)/i);
    if (feeMatch) {
      deliveryFee = parseFloat(feeMatch[1]) || 0;
    }
  }
  const subtotal = Math.max(0, totalAmount - taxAmount - deliveryFee + discountAmount);

  const subtotalDisplay = subtotal.toFixed(2);
  const taxDisplay = taxAmount.toFixed(2);
  const totalDisplay = totalAmount.toFixed(2);

  const discountHtml =
    discountAmount > 0
      ? `
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>${subtotalDisplay}</span>
    </div>
    <div class="totals-row">
      <span>Discount:</span>
      <span>-${discountAmount.toFixed(2)}</span>
    </div>
  `
      : `
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>${subtotalDisplay}</span>
    </div>
  `;

  const deliveryFeeHtml =
    deliveryFee > 0
      ? `
    <div class="totals-row">
      <span>Delivery Charges:</span>
      <span>${deliveryFee.toFixed(2)}</span>
    </div>
  `
      : "";

  // Customer info extraction
  let customerName = order.customerName || "";
  let customerPhone = order.customerPhone || "";
  let customerAddress = order.customerAddress || "";

  if (!customerName) {
    const firstNote = order.items?.[0]?.notes || "";
    const deliveryMatch = firstNote.match(/Delivery To:\s*([^(]+)\s*(?:\(([^)]*)\))?(?:\s*-\s*Address:\s*([^|]*))?/);
    if (deliveryMatch) {
      customerName = deliveryMatch[1]?.trim() || "";
      customerPhone = deliveryMatch[2]?.trim() || "";
      customerAddress = deliveryMatch[3]?.trim() || "";
    } else {
      const takeawayMatch = firstNote.match(/Takeaway For:\s*([^(|]+)(?:\(([^)]*)\))?/);
      if (takeawayMatch) {
        customerName = takeawayMatch[1]?.trim() || "";
        customerPhone = takeawayMatch[2]?.trim() || "";
      }
    }
  }

  // Fallback defaults matching the sample slip ("Customer MR", "Phone: 0")
  if (!customerName) {
    customerName = orderTypeRaw === "TAKEAWAY" ? "MR" : orderTypeRaw === "DINE IN" ? (order.table?.name ? `Table ${order.table.name}` : "Guest") : "Customer";
  }
  if (!customerPhone) {
    customerPhone = "0";
  }

  const customerHeader =
    orderTypeRaw === "DELIVERY"
      ? "DELIVERY CUSTOMER:"
      : orderTypeRaw === "DINE IN"
        ? (formattedTableName ? `DINE-IN (${formattedTableName.toUpperCase()}):` : "DINE-IN CUSTOMER:")
        : "TAKEAWAY CUSTOMER:";

  const customerAddressHtml = customerAddress
    ? `<div>Address: ${customerAddress}</div>`
    : "";

  // Restaurant contact info
  const addressLine1 = options?.addressLine1 || "Gulberg Branch";
  const addressLine2 = options?.addressLine2 || "";
  const whatsappNumber = options?.whatsapp || "0304 8881219";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title></title>
    <style>
      @page {
        size: 80mm 297mm;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body {
        width: 80mm;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt-container {
        width: 80mm;
        max-width: 80mm;
        margin: 0 auto;
        padding: 4px 6mm 12px 6mm;
        box-sizing: border-box;
        font-size: 12px;
        line-height: 1.35;
        background: #fff;
      }
      .center {
        text-align: center;
      }
      .bold {
        font-weight: 700;
      }
      .logo-container {
        text-align: center;
        margin-bottom: 6px;
      }
      .logo-img {
        width: 70px;
        height: 70px;
        object-fit: contain;
        display: block;
        margin: 0 auto;
      }
      .restaurant-name {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }
      .receipt-type {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .header-meta {
        font-size: 11.5px;
        line-height: 1.4;
      }
      .dashed-line {
        border-bottom: 1px dashed #000;
        margin: 7px 0;
        width: 100%;
      }
      table.items-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      table.items-table th {
        font-size: 12px;
        font-weight: 700;
        padding: 3px 0;
      }
      table.items-table td {
        font-size: 12px;
        padding: 3px 0;
        vertical-align: top;
      }
      .col-item {
        text-align: left;
        width: 55%;
        word-break: break-word;
      }
      .col-qty {
        text-align: center;
        width: 15%;
        white-space: nowrap;
      }
      .col-total {
        text-align: right;
        width: 30%;
        white-space: nowrap;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin: 2px 0;
        width: 100%;
      }
      .grand-total-row {
        display: flex;
        justify-content: space-between;
        font-size: 15px;
        font-weight: 800;
        margin: 4px 0;
        width: 100%;
      }
      .customer-section {
        font-size: 11.5px;
        line-height: 1.4;
        width: 100%;
      }
      .customer-title {
        font-weight: 700;
        font-size: 12px;
        margin-bottom: 2px;
      }
      .footer-contact {
        font-size: 10px;
        line-height: 1.35;
        margin: 6px 0 12px 0;
        width: 100%;
        white-space: nowrap;
      }
      .footer-bottom {
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .powered-by {
        font-size: 10px;
        font-weight: normal;
        margin-top: 3px;
      }
      @media print {
        @page {
          size: 80mm 297mm;
          margin: 0;
        }
        html, body {
          width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
        .receipt-container {
          width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 auto !important;
          padding: 4px 6mm 8px 6mm !important;
          box-sizing: border-box !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt-container">
      <!-- Top Logo -->
      <div class="logo-container">
        <img src="${logoSrc}" alt="Logo" class="logo-img" />
      </div>

      <!-- Header info centered -->
      <div class="center restaurant-name">${restaurantName}</div>
      <div class="center receipt-type">${receiptType}</div>
      <div class="center header-meta">
        <div>Date: ${formattedDate}</div>
        <div>Order #: ${orderNumDisplay}</div>
        <div>Type: ${typeDisplay}</div>
        <div>Payment: ${paymentDisplay}</div>
        <div>Cashier: ${cashierDisplay}</div>
      </div>

      <div class="dashed-line"></div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-item">Item</th>
            <th class="col-qty">Qty</th>
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="dashed-line"></div>

      <!-- Subtotal & Tax -->
      ${discountHtml}
      ${deliveryFeeHtml}
      <div class="totals-row">
        <span>Tax:</span>
        <span>${taxDisplay}</span>
      </div>

      <div class="dashed-line"></div>

      <!-- TOTAL -->
      <div class="grand-total-row">
        <span>TOTAL:</span>
        <span>PKR ${totalDisplay}</span>
      </div>

      <div class="dashed-line"></div>

      <!-- Customer Details -->
      <div class="customer-section">
        <div class="customer-title">${customerHeader}</div>
        <div>Customer: ${escapeHtml(customerName)}</div>
        <div>Phone: ${escapeHtml(customerPhone)}</div>
        ${customerAddressHtml}
      </div>

      <div class="dashed-line"></div>

      <!-- Restaurant Footer Address & WhatsApp -->
      <div class="center footer-contact">
        <div>Address: ${addressLine1}${addressLine2 ? `, ${addressLine2}` : ""} | WhatsApp: ${whatsappNumber}</div>
      </div>

      <!-- Thank you & Powered by -->
      <div class="center">
        <div class="footer-bottom">THANK YOU FOR YOUR VISIT</div>
        <div class="powered-by">Powered by Lincoz Tech  0323-5323766 </div>
      </div>
    </div>

    <script>
      window.hasPrinted = false;
      function doPrint() {
        if (window.hasPrinted) return;
        window.hasPrinted = true;
        setTimeout(function() {
          window.focus();
          window.print();
          window.close();
        }, 150);
      }

      if (document.readyState === 'complete') {
        setTimeout(doPrint, 200);
      } else {
        window.addEventListener('load', function() { setTimeout(doPrint, 200); });
        setTimeout(doPrint, 500);
      }
    </script>
  </body>
</html>`;
}

export function printReceipt(order: any, options?: ReceiptPrintOptions) {
  try {
    const printWindow = options?.win || window.open("", "_blank", "width=380,height=650");
    if (!printWindow) {
      alert("Please allow popups to print the receipt.");
      return;
    }

    const html = generateReceiptHtml(order, options);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Fallback trigger in case popup script fails
    setTimeout(() => {
      try {
        if (printWindow && !printWindow.closed && !(printWindow as any).hasPrinted) {
          (printWindow as any).hasPrinted = true;
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } catch (e) { }
    }, 450);
  } catch (err) {
    console.error("Print receipt error:", err);
  }
}

export interface KotPrintData {
  orderNum: string;
  type: string;
  tableName?: string | null;
  items: { name: string; quantity: number; notes?: string }[];
  deliveryInfo?: { name?: string; phone?: string; address?: string; riderName?: string; deliveryFee?: number };
  createdAt?: Date | string;
  isAddition?: boolean;
}

export function generateKotHtml(data: KotPrintData): string {
  // Format table / type text matching: "Dine In - Table: table 9" or "Takeaway" or "Delivery"
  let subHeader = "";
  const typeRaw = data.type ? String(data.type).toUpperCase() : "DINE_IN";
  if (typeRaw === "DINE_IN" || typeRaw === "DINE IN") {
    subHeader = data.tableName ? `Dine In - Table: ${data.tableName}` : "Dine In";
  } else if (typeRaw === "DELIVERY") {
    subHeader = "Delivery";
  } else {
    subHeader = "Takeaway";
  }

  // Clean order number matching sample format (e.g., "50")
  let orderNumClean = "1";
  if (data.orderNum) {
    const str = String(data.orderNum);
    const match = str.match(/\d+$/);
    orderNumClean = match ? String(parseInt(match[0], 10)) : str.replace(/^#/, "");
  }

  // Format date matching: "10/13/2026, 12:51:44 AM"
  const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
  const formattedDate =
    dateObj.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    }) +
    ", " +
    dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

  // Items formatting: "1 x Chicken Tikka (M)" with "* M" below
  const itemsHtml = (data.items || []).map(item => {
    const cleanNotes = item.notes
      ? item.notes.replace(/\s*\|\s*\[NEW ADDITION\]|\[NEW ADDITION\]/g, "").trim()
      : "";
    const notesHtml = cleanNotes && !cleanNotes.includes("Delivery To:") && !cleanNotes.includes("Takeaway For:")
      ? `<div class="item-notes">* ${cleanNotes}</div>`
      : "";
    return `
      <div class="item-row">
        <div class="item-main">${item.quantity} x ${item.name}</div>
        ${notesHtml}
      </div>
    `;
  }).join("");

  let deliveryHtml = "";
  if (data.deliveryInfo?.name) {
    if (typeRaw === "DELIVERY") {
      deliveryHtml = `
        <div class="delivery-info">
          <div>* To: ${escapeHtml(data.deliveryInfo.name)} (${escapeHtml(data.deliveryInfo.phone || "No Phone")})</div>
          <div>* Addr: ${escapeHtml(data.deliveryInfo.address || "N/A")}</div>
          ${data.deliveryInfo.riderName ? `<div>* Rider: ${escapeHtml(data.deliveryInfo.riderName)}</div>` : ""}
          ${data.deliveryInfo.deliveryFee ? `<div>* Delivery Charges: Rs ${data.deliveryInfo.deliveryFee}</div>` : ""}
        </div>
      `;
    } else {
      deliveryHtml = `
        <div class="delivery-info">
          <div>* Customer: ${escapeHtml(data.deliveryInfo.name)} ${data.deliveryInfo.phone ? `(${escapeHtml(data.deliveryInfo.phone)})` : ""}</div>
        </div>
      `;
    }
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title></title>
    <style>
      @page {
        size: 80mm 297mm;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body {
        width: 80mm;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .kot-container {
        width: 80mm;
        max-width: 80mm;
        margin: 0 auto;
        padding: 6px 6mm 10px 6mm;
        box-sizing: border-box;
      }
      .center {
        text-align: center;
      }
      .bold {
        font-weight: 700;
      }
      .kot-title {
        font-size: 19px;
        font-weight: 900;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .kot-sub {
        font-size: 13.5px;
        font-weight: 500;
        margin-bottom: 4px;
      }
      .dashed-line {
        border-bottom: 1px dashed #000;
        margin: 6px 0;
        width: 100%;
      }
      .meta-section {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.45;
        margin: 4px 0;
      }
      .items-list {
        margin: 6px 0;
      }
      .item-row {
        margin-bottom: 6px;
      }
      .item-main {
        font-size: 14.5px;
        font-weight: 800;
        color: #000;
      }
      .item-notes {
        font-size: 12.5px;
        font-weight: 600;
        margin-left: 10px;
        margin-top: 1px;
        color: #222;
      }
      .delivery-info {
        font-size: 12px;
        font-weight: 600;
        margin-top: 6px;
        padding-top: 4px;
        border-top: 1px dotted #555;
      }
      @media print {
        @page {
          size: 80mm 297mm;
          margin: 0;
        }
        html, body {
          width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
        .kot-container {
          width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 auto !important;
          padding: 4px 6mm 8px 6mm !important;
          box-sizing: border-box !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="kot-container">
      <div class="center kot-title">${data.isAddition ? "KOT: NEW ADDITIONS" : "KITCHEN ORDER"}</div>
      <div class="center kot-sub">${data.isAddition ? `${subHeader} (RUNNING ORDER ADDITION)` : subHeader}</div>
      ${data.isAddition ? '<div class="center" style="font-size: 11.5px; font-weight: 800; color: #000; margin: 3px 0; padding: 2px 0; border: 1px dashed #000;">*** PREPARE ONLY NEW ITEMS LISTED BELOW ***</div>' : ''}
      <div class="dashed-line"></div>
      <div class="meta-section">
        <div>Order #: ${orderNumClean} ${data.isAddition ? "(NEW ITEMS)" : ""}</div>
        <div>Date: ${formattedDate}</div>
      </div>
      <div class="dashed-line"></div>
      <div class="items-list">
        ${itemsHtml}
        ${deliveryHtml}
      </div>
      <div class="dashed-line"></div>
    </div>
    <script>
      window.hasPrinted = false;
      function doPrint() {
        if (window.hasPrinted) return;
        window.hasPrinted = true;
        setTimeout(function() {
          window.focus();
          window.print();
          window.close();
        }, 150);
      }
      if (document.readyState === 'complete') {
        setTimeout(doPrint, 200);
      } else {
        window.addEventListener('load', function() { setTimeout(doPrint, 200); });
        setTimeout(doPrint, 500);
      }
    </script>
  </body>
</html>`;
}

export function printKitchenTicket(win: Window | null, data: KotPrintData) {
  try {
    const printWindow = win || window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    const html = generateKotHtml(data);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      try {
        if (printWindow && !printWindow.closed && !(printWindow as any).hasPrinted) {
          (printWindow as any).hasPrinted = true;
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } catch (e) { }
    }, 450);
  } catch (err) {
    console.error("Print KOT error:", err);
  }
}

export function generateClosingReportHtml(data: any): string {
  const logoSrc = LOGO_DATA_URI;
  const restaurantName = data.restaurant?.name || "RESTAURANT ERP";
  const cashierName = data.cashier?.name || "Cashier";
  const dateStr = data.date ? new Date(data.date).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }) : new Date().toLocaleString();

  const summary = data.summary || {};
  const categories = data.categories || [];
  const items = data.items || [];
  const orderTypes = data.orderTypes || {};

  const categoriesRows = categories.map((cat: any) => `
    <tr>
      <td style="text-align: left; padding: 2px 0;">${cat.categoryName}</td>
      <td style="text-align: center; padding: 2px 0; font-weight: 700;">${cat.quantity}</td>
      <td style="text-align: right; padding: 2px 0;">${Number(cat.totalRevenue || 0).toFixed(2)}</td>
    </tr>
  `).join("");

  const itemsRows = items.map((it: any) => `
    <tr>
      <td style="text-align: left; padding: 2px 0;">
        <div style="font-weight: 600;">${it.name}</div>
        <div style="font-size: 10px; color: #555;">${it.categoryName}</div>
      </td>
      <td style="text-align: center; padding: 2px 0; font-weight: 700; vertical-align: top;">${it.quantity}</td>
      <td style="text-align: right; padding: 2px 0; vertical-align: top;">${Number(it.totalRevenue || 0).toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Closing Report</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 6px 5mm 15px 5mm;
      background: #fff;
      color: #000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .logo-container { text-align: center; margin-bottom: 4px; }
    .logo-img { width: 60px; height: 60px; object-fit: contain; margin: 0 auto; }
    .restaurant-name { font-size: 15px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px; }
    .report-title { font-size: 13px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
    .meta-text { font-size: 11px; line-height: 1.4; }
    .dashed-line { border-bottom: 1px dashed #000; margin: 6px 0; width: 100%; }
    .double-line { border-bottom: 2px solid #000; margin: 6px 0; width: 100%; }
    .section-title { font-size: 11.5px; font-weight: 800; text-transform: uppercase; margin: 4px 0 3px 0; }
    .row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 11.5px; }
    .grand-total { display: flex; justify-content: space-between; padding: 3px 0; font-size: 14px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { border-bottom: 1px dashed #000; padding: 3px 0; font-weight: 700; }
  </style>
</head>
<body>
  <div class="logo-container">
    <img src="${logoSrc}" alt="Logo" class="logo-img" />
  </div>
  <div class="center restaurant-name">${restaurantName}</div>
  <div class="center report-title">Daily Closing Report</div>
  <div class="center meta-text">
    <div><strong>Date:</strong> ${dateStr}</div>
    <div><strong>Cashier:</strong> ${cashierName}</div>
    <div><strong>Shift Status:</strong> CLOSED</div>
  </div>

  <div class="dashed-line"></div>
  <div class="section-title">Sales Summary</div>
  <div class="row"><span>Total Orders:</span><span class="bold">${summary.totalOrders || 0}</span></div>
  <div class="row"><span>Gross Sales:</span><span>PKR ${Number(summary.grossSales || 0).toFixed(2)}</span></div>
  <div class="row"><span>Total Discounts:</span><span>-PKR ${Number(summary.totalDiscount || 0).toFixed(2)}</span></div>
  <div class="row"><span>Tax Collected:</span><span>PKR ${Number(summary.totalTax || 0).toFixed(2)}</span></div>
  <div class="double-line"></div>
  <div class="grand-total"><span>NET SALES:</span><span>PKR ${Number(summary.netSales || 0).toFixed(2)}</span></div>
  <div class="double-line"></div>

  <div class="section-title">Payment Methods</div>
  <div class="row"><span>Cash Sales (${summary.cashOrdersCount || 0} orders):</span><span class="bold">PKR ${Number(summary.cashSales || 0).toFixed(2)}</span></div>
  <div class="row"><span>Card Sales (${summary.cardOrdersCount || 0} orders):</span><span class="bold">PKR ${Number(summary.cardSales || 0).toFixed(2)}</span></div>
  ${summary.otherSales > 0 ? `<div class="row"><span>Other / Split:</span><span>PKR ${Number(summary.otherSales).toFixed(2)}</span></div>` : ""}



  <div class="section-title">Order Channels</div>
  <div class="row"><span>Dine In:</span><span>${orderTypes.dineIn || 0} orders</span></div>
  <div class="row"><span>Takeaway:</span><span>${orderTypes.takeaway || 0} orders</span></div>
  <div class="row"><span>Delivery:</span><span>${orderTypes.delivery || 0} orders</span></div>

  <div class="dashed-line"></div>
  <div class="section-title">Items Sold by Category</div>
  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Category</th>
        <th style="text-align: center; width: 45px;">Qty</th>
        <th style="text-align: right; width: 65px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${categoriesRows || '<tr><td colspan="3" style="text-align:center; padding: 4px;">No items sold</td></tr>'}
    </tbody>
  </table>

  <div class="dashed-line"></div>
  <div class="section-title">Individual Items Sold (${summary.totalItemsSold || 0} Total)</div>
  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Item</th>
        <th style="text-align: center; width: 35px;">Qty</th>
        <th style="text-align: right; width: 65px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows || '<tr><td colspan="3" style="text-align:center; padding: 4px;">No items sold</td></tr>'}
    </tbody>
  </table>

  <div class="dashed-line"></div>
  <div style="margin-top: 15px; font-size: 11px;">
    <div style="margin-bottom: 25px;">Cashier Signature: ______________________</div>
    <div>Manager Signature: ______________________</div>
  </div>

  <div class="center" style="margin-top: 15px; font-size: 10px; color: #555;">
    RestaurantPOS Daily Shift Closing • End of Day
  </div>

  <script>
    window.hasPrinted = false;
    function doPrint() {
      if (window.hasPrinted) return;
      window.hasPrinted = true;
      setTimeout(function() {
        window.focus();
        window.print();
        window.close();
      }, 150);
    }
    if (document.readyState === 'complete') {
      setTimeout(doPrint, 200);
    } else {
      window.addEventListener('load', function() { setTimeout(doPrint, 200); });
      setTimeout(doPrint, 500);
    }
  </script>
</body>
</html>`;
}

export function printClosingReport(data: any, win?: Window | null) {
  try {
    const printWindow = win || window.open("", "_blank", "width=400,height=700");
    if (!printWindow) {
      alert("Please allow popups to print the daily closing report.");
      return;
    }

    const html = generateClosingReportHtml(data);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      try {
        if (printWindow && !printWindow.closed && !(printWindow as any).hasPrinted) {
          (printWindow as any).hasPrinted = true;
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } catch (e) { }
    }, 450);
  } catch (err) {
    console.error("Print Closing Report error:", err);
  }
}

