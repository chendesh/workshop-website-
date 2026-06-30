/**
 * Reports Controller
 * -------------------
 * Generate weekly Excel reports and monthly PDF reports.
 * Uses SheetJS (xlsx) for Excel and jsPDF for PDF.
 */

import { db } from '../config/firebase.js';
import {
  generateId,
  nowISO,
  formatDate,
  parseDate,
  formatRupees,
  successResponse,
  errorResponse,
} from '../utils/helpers.js';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RobotoRegularBase64 } from '../utils/fonts.js';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPORTS_DIR = join(__dirname, '..', '..', 'reports');

// Ensure reports directory exists
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

// ── GET /api/reports — List all generated reports ───────────
export const getReports = async (req, res) => {
  try {
    const { type } = req.query;

    let query = db.collection('reports');
    if (type) {
      query = query.where('type', '==', type);
    }

    const snap = await query.get();
    const reports = snap.docs.map((doc) => doc.data());
    
    // Sort in memory to avoid composite index requirements
    reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

    return successResponse(res, reports, `Found ${reports.length} report(s).`);
  } catch (error) {
    console.error('GetReports error:', error);
    return errorResponse(res, 'Failed to fetch reports.');
  }
};

// ── GET /api/reports/download/:id — Download report file ────
export const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;

    const reportDoc = await db.collection('reports').doc(id).get();
    if (!reportDoc.exists) {
      return errorResponse(res, 'Report not found.', 404);
    }

    const report = reportDoc.data();

    // If we have a permanent URL stored, just return it
    if (report.fileUrl) {
      return successResponse(res, { fileUrl: report.fileUrl }, 'Download URL retrieved.');
    }

    // Fallback for older reports that might still exist on local disk
    if (existsSync(report.filePath)) {
      const fileBuffer = readFileSync(report.filePath);
      const contentType = report.type === 'weekly'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${report.fileName}"`,
        'Content-Length': fileBuffer.length,
      });

      return res.send(fileBuffer);
    }

    return errorResponse(res, 'File no longer available, please regenerate.', 404);
  } catch (error) {
    console.error('DownloadReport error:', error);
    return errorResponse(res, 'Failed to download report.');
  }
};

// ── Shared Storage Upload Logic ──────────────────────────────
async function uploadToFirebaseStorage(filePath, fileName, mimeType) {
  try {
    const { bucket } = await import('../config/firebase.js');
    const destination = `reports/${fileName}`;
    await bucket.upload(filePath, {
      destination,
      metadata: { contentType: mimeType }
    });
    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '01-01-2100'
    });
    return url;
  } catch (e) {
    console.error('Upload to storage failed:', e);
    return null; // Gracefully fallback if bucket isn't properly configured yet
  }
}

// ── Shared Data Fetching Logic ──────────────────────────────
async function fetchReportData(periodStartStr, periodEndStr) {
    // Both expected as 'YYYY-MM-DD' for DB filtering if possible, but let's parse safely
    const startObj = parseDate(periodStartStr);
    const endObj = new Date(parseDate(periodEndStr));
    endObj.setHours(23, 59, 59, 999);

    // 1. Work Logs
    const workLogsSnap = await db.collection('workLogs').get();
    const workLogs = workLogsSnap.docs
      .map((doc) => doc.data())
      .filter((wl) => {
        const wlDate = parseDate(wl.date);
        return wlDate >= startObj && wlDate <= endObj;
      });
      
    // Sort work logs by date
    workLogs.sort((a, b) => parseDate(a.date) - parseDate(b.date));

    // 2. Attendance & Daily Wages
    const attendanceSnap = await db.collection('attendance').get();
    const attendance = attendanceSnap.docs
      .map((doc) => doc.data())
      .filter((a) => {
        const aDate = parseDate(a.date);
        return aDate >= startObj && aDate <= endObj;
      });

    const dailyWagesSnap = await db.collection('dailyWages').get();
    const dailyWages = dailyWagesSnap.docs
      .map((doc) => doc.data())
      .filter((w) => {
        const wDate = parseDate(w.date);
        return wDate >= startObj && wDate <= endObj;
      });

    // Merge Attendance and Daily Wages into Worker Data rows
    // Key: date_workerId
    const workerDataMap = {};
    
    attendance.forEach(a => {
        const normDate = a.date.includes('-') ? formatDate(parseDate(a.date)) : a.date;
        const key = `${normDate}_${a.workerId}`;
        workerDataMap[key] = {
            date: normDate,
            workerName: a.workerName,
            attendance: a.status,
            wage: 0,
            paymentStatus: 'not_paid'
        };
    });

    dailyWages.forEach(w => {
        const normDate = w.date.includes('-') ? formatDate(parseDate(w.date)) : w.date;
        const key = `${normDate}_${w.workerId}`;
        const wageAmount = w.amount;

        if (!workerDataMap[key]) {
             workerDataMap[key] = {
                 date: normDate,
                 workerName: w.workerName,
                 attendance: 'unrecorded',
                 wage: wageAmount,
                 paymentStatus: w.status,
                 note: w.note || ''
             };
        } else {
             workerDataMap[key].wage = wageAmount;
             workerDataMap[key].paymentStatus = w.status;
             workerDataMap[key].note = w.note || '';
        }
    });

    const workersData = Object.values(workerDataMap);
    // Sort by Date, then Worker Name
    workersData.sort((a, b) => {
        const dateDiff = parseDate(a.date) - parseDate(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.workerName.localeCompare(b.workerName);
    });

    // 3. Inventory (Materials)
    const inventorySnap = await db.collection('inventory').get();
    const inventoryItems = inventorySnap.docs
      .map((doc) => doc.data())
      .filter((item) => {
        if (!item.purchaseDate) return false;
        // purchaseDate stored as 'YYYY-MM-DD'
        const itemDate = new Date(item.purchaseDate);
        return itemDate >= startObj && itemDate <= endObj;
      });

    // Sort by purchaseDate ascending
    inventoryItems.sort((a, b) => {
      const da = new Date(a.purchaseDate || 0);
      const db2 = new Date(b.purchaseDate || 0);
      return da - db2;
    });

    // 4. Camps
    const campsSnap = await db.collection('campEntries').get();
    const camps = campsSnap.docs
      .map((doc) => doc.data())
      .filter((camp) => {
         const campDate = parseDate(camp.startDate);
         return campDate >= startObj && campDate <= endObj;
      });

    const campWorkersSnap = await db.collection('campWorkers').get();
    const allCampWorkers = campWorkersSnap.docs.map(doc => doc.data());

    const campsData = camps.map(camp => {
       return {
           ...camp,
           workers: allCampWorkers.filter(cw => cw.campId === camp.id)
       };
    });

    campsData.sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate));

    return { workLogs, workersData, inventoryItems, campsData };
}


// ── POST /api/reports/weekly — Generate weekly Excel report ──
export const generateWeeklyReport = async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return errorResponse(res, 'periodStart and periodEnd are required.', 400);
    }

    // periodStart and periodEnd are YYYY-MM-DD, parse directly
    const startStr = formatDate(new Date(periodStart));
    const endStr = formatDate(new Date(periodEnd));

    const { workLogs, workersData, inventoryItems, campsData } = await fetchReportData(startStr, endStr);

    // ── Build Excel workbook ──
    const wb = XLSX.utils.book_new();

    // Section A: Work Log Data
    let totalSpent = 0;
    let totalReceived = 0;
    const wlHeaders = ['Date', 'Work Description', 'Amount Spent (₹)', 'Amount Received (₹)'];
    const wlData = workLogs.map((wl) => {
        const spent = Number(wl.spentAmount) || 0;
        const received = Number(wl.receivedAmount) || 0;
        totalSpent += spent;
        totalReceived += received;
        return [wl.date, wl.description || wl.workType, spent, received];
    });
    // Add Grand Total row
    wlData.push(['Grand Total', '', totalSpent, totalReceived]);
    
    const wlSheetData = [
      ['Weekly Business Report'],
      [`Period: ${startStr} to ${endStr}`],
      [],
      wlHeaders,
      ...wlData
    ];
    const wlSheet = XLSX.utils.aoa_to_sheet(wlSheetData);
    XLSX.utils.book_append_sheet(wb, wlSheet, 'Work Log Data');

    // Section B: Workers Data
    let totalWages = 0;
    const wrkHeaders = ['Worker Name', 'Date', 'Attendance', 'Wage (₹)', 'Payment Status', 'Note'];
    const wrkData = workersData.map((w) => {
        const wage = Number(w.wage) || 0;
        totalWages += wage;
        return [w.workerName, w.date, w.attendance, wage, w.paymentStatus === 'paid' ? 'Paid' : 'Not Paid', w.note || ''];
    });
    // Add Grand Total row
    wrkData.push(['Grand Total', '', '', totalWages, '', '']);
    
    const wrkSheetData = [
      ['Weekly Workers Data'],
      [`Period: ${startStr} to ${endStr}`],
      [],
      wrkHeaders,
      ...wrkData
    ];
    const wrkSheet = XLSX.utils.aoa_to_sheet(wrkSheetData);
    XLSX.utils.book_append_sheet(wb, wrkSheet, 'Workers Data');

    // ── Section C: Materials Report Sheet ──
    const matHeaders = [
      'Date', 'Material Name', 'Category', 'Quantity', 'Unit',
      'Unit Price (₹)', 'Total Amount (₹)', 'Supplier Name', 'Notes'
    ];

    let totalMatSpend = 0;
    const matData = inventoryItems.map((item) => {
      const totalAmt = Number(item.totalAmount) || 0;
      totalMatSpend += totalAmt;
      // Format date from YYYY-MM-DD to DD/MM/YYYY
      let dateStr = item.purchaseDate || '';
      if (dateStr && dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        dateStr = `${d}/${m}/${y}`;
      }
      return [
        dateStr,
        item.materialName || '',
        item.category || '',
        Number(item.quantity) || 0,
        item.unit || '',
        Number(item.unitPrice) || 0,
        totalAmt,
        item.supplierName || '',
        item.notes || '',
      ];
    });

    const matSheetData = [
      ['Materials Purchase Report'],
      [`Period: ${startStr} to ${endStr}`],
      [],
      matHeaders,
      ...matData,
    ];

    if (matData.length === 0) {
      matSheetData.push(['No material purchases recorded for this period.']);
    } else {
      // Leave 1 blank row then summary
      matSheetData.push([]);
      matSheetData.push(['Total Items Purchased:', '', '', '', '', '', inventoryItems.length]);
      matSheetData.push(['Total Materials Spend:', '', '', '', '', '', totalMatSpend]);
    }

    const matSheet = XLSX.utils.aoa_to_sheet(matSheetData);

    // Style the header row (row index 3, 0-based) with amber fill
    const headerRowIndex = 3; // 0-based: rows 0,1,2 are title/subtitle/blank
    if (!matSheet['!rows']) matSheet['!rows'] = [];
    matSheet['!rows'][headerRowIndex] = { hpx: 20 };

    // Apply amber styling to header cells A4:I4 (0-based row 3)
    const headerCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    headerCols.forEach((col) => {
      const cellRef = `${col}${headerRowIndex + 1}`;
      if (!matSheet[cellRef]) matSheet[cellRef] = { v: '', t: 's' };
      matSheet[cellRef].s = {
        fill: { fgColor: { rgb: 'F59E0B' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center' },
      };
    });

    // Bold Total Amount column (G) for data rows
    const dataStartRow = headerRowIndex + 2; // 1-based row where data starts
    matData.forEach((_, i) => {
      const cellRef = `G${dataStartRow + i}`;
      if (matSheet[cellRef]) {
        matSheet[cellRef].s = { font: { bold: true } };
      }
    });

    // Freeze pane at row 2 (freeze header row)
    matSheet['!freeze'] = { xSplit: 0, ySplit: headerRowIndex + 1 };

    // Auto column widths
    matSheet['!cols'] = [14, 22, 18, 10, 8, 14, 16, 22, 30].map((w) => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, matSheet, 'Materials Report');

    // Section D: Camp Details
    let totalCampsWorkAmount = 0;
    const campHeaders = ['Camp Location', 'Dates', 'Total Work Amount (₹)', 'Assigned Workers & Amounts'];
    const campData = campsData.map((camp) => {
        const totalAmt = Number(camp.totalWorkAmount) || 0;
        totalCampsWorkAmount += totalAmt;
        const workersStr = (camp.workers || []).map(w => `${w.workerName} (₹${w.campPay})`).join(', ');
        return [
            camp.location || '',
            `${formatDate(camp.startDate)} to ${formatDate(camp.endDate)}`,
            totalAmt,
            workersStr || 'None'
        ];
    });

    const campSheetData = [
      ['Camp Details Report'],
      [`Period: ${startStr} to ${endStr}`],
      [],
      campHeaders,
      ...campData,
    ];

    if (campData.length === 0) {
      campSheetData.push(['No camps recorded for this period.']);
    } else {
      campSheetData.push([]);
      campSheetData.push(['Grand Total:', '', totalCampsWorkAmount, '']);
    }

    const campSheet = XLSX.utils.aoa_to_sheet(campSheetData);
    const campHeaderRowIndex = 3;
    if (!campSheet['!rows']) campSheet['!rows'] = [];
    campSheet['!rows'][campHeaderRowIndex] = { hpx: 20 };

    ['A', 'B', 'C', 'D'].forEach((col) => {
      const cellRef = `${col}${campHeaderRowIndex + 1}`;
      if (!campSheet[cellRef]) campSheet[cellRef] = { v: '', t: 's' };
      campSheet[cellRef].s = {
        fill: { fgColor: { rgb: '9B59B6' } }, // Purple header
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center' },
      };
    });

    const campDataStartRow = campHeaderRowIndex + 2;
    campData.forEach((_, i) => {
      const cellRef = `C${campDataStartRow + i}`;
      if (campSheet[cellRef]) {
        campSheet[cellRef].s = { font: { bold: true } };
      }
    });

    campSheet['!freeze'] = { xSplit: 0, ySplit: campHeaderRowIndex + 1 };
    campSheet['!cols'] = [30, 25, 20, 50].map((w) => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, campSheet, 'Camp Details');


    // Save file locally temporarily
    const fileName = `weekly-report-${startStr.replace(/\//g, '-')}.xlsx`;
    const filePath = join(REPORTS_DIR, fileName);
    XLSX.writeFile(wb, filePath);

    const fileUrl = await uploadToFirebaseStorage(filePath, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Save report record to Firestore
    const reportId = generateId('RPT');
    const reportData = {
      id: reportId,
      type: 'weekly',
      periodStart: startStr,
      periodEnd: endStr,
      fileName,
      filePath, // keep for fallback/debugging
      fileUrl: fileUrl || null,
      generatedAt: nowISO(),
    };
    await db.collection('reports').doc(reportId).set(reportData);

    return successResponse(res, reportData, 'Weekly Excel report generated successfully.', 201);
  } catch (error) {
    console.error('GenerateWeeklyReport error:', error);
    return errorResponse(res, 'Failed to generate weekly report.');
  }
};


// ── POST /api/reports/monthly — Generate monthly PDF report ──
export const generateMonthlyReport = async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
       return errorResponse(res, 'periodStart and periodEnd are required.', 400);
    }

    // periodStart and periodEnd are YYYY-MM-DD, parse directly
    const startStr = formatDate(new Date(periodStart));
    const endStr = formatDate(new Date(periodEnd));
    const { workLogs, workersData, inventoryItems, campsData } = await fetchReportData(startStr, endStr);
    // ── Build PDF ──
    const doc = new jsPDF();
    
    // Embed Roboto font to support ₹ symbol
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
    
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text('Sri Venkata Krishna Engineering Works', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Monthly Business Report', pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Period: ${startStr} to ${endStr}`, pageWidth / 2, 34, { align: 'center' });
    doc.text(`Generated: ${formatDate(new Date())}`, pageWidth / 2, 40, { align: 'center' });

    // ── Section A: Work Log Data ──
    doc.setFontSize(12);
    doc.text('Section A: Work Log Data', 14, 50);

    let totalSpent = 0;
    let totalReceived = 0;
    const wlBody = workLogs.map((wl) => {
        const spent = Number(wl.spentAmount) || 0;
        const received = Number(wl.receivedAmount) || 0;
        totalSpent += spent;
        totalReceived += received;
        return [
            wl.date, 
            wl.description || wl.workType || '-', 
            formatRupees(spent), 
            formatRupees(received)
        ];
    });
    
    // Grand Total Row
    wlBody.push([{ content: 'Grand Total', colSpan: 2, styles: { fontStyle: 'bold' } }, formatRupees(totalSpent), formatRupees(totalReceived)]);

    doc.autoTable({
        startY: 54,
        head: [['Date', 'Work Description', 'Amount Spent', 'Amount Received']],
        body: wlBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { font: 'Roboto', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 25, halign: 'center' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // ── Section B: Workers Data ──
    const finalY = doc.lastAutoTable.finalY || 54;
    doc.setFontSize(12);
    // Add new page if space is low
    if (finalY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        doc.text('Section B: Workers Data', 14, 20);
        doc.autoTable.previous.finalY = 24;
    } else {
        doc.text('Section B: Workers Data', 14, finalY + 12);
        doc.autoTable.previous.finalY = finalY + 16;
    }

    let totalWages = 0;
    const wrkBody = workersData.map((w) => {
        const wage = Number(w.wage) || 0;
        totalWages += wage;
        return [
            w.workerName, 
            w.date, 
            w.attendance, 
            formatRupees(wage), 
            w.paymentStatus === 'paid' ? 'Paid' : 'Not Paid',
            w.note || ''
        ];
    });

    wrkBody.push([{ content: 'Grand Total', colSpan: 3, styles: { fontStyle: 'bold' } }, formatRupees(totalWages), '', '']);

    doc.autoTable({
        startY: doc.autoTable.previous.finalY,
        head: [['Worker Name', 'Date', 'Attendance', 'Wage', 'Payment Status', 'Note']],
        body: wrkBody,
        theme: 'grid',
        headStyles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { font: 'Roboto', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { halign: 'left', cellWidth: 35 },
            1: { halign: 'center', cellWidth: 22 },
            2: { halign: 'center', cellWidth: 22 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'center', cellWidth: 25 },
            5: { halign: 'left', cellWidth: 'auto' }
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // ── Section C: Materials Purchase Report ──
    const wrkFinalY = doc.lastAutoTable.finalY || 54;
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add new page if not enough space for the section
    if (wrkFinalY > pageHeight - 50) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(245, 158, 11); // amber #F59E0B
      doc.setFont(undefined, 'bold');
      doc.text('Materials Purchase Report', 14, 20);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      // Horizontal line
      doc.setDrawColor(245, 158, 11);
      doc.line(14, 23, pageWidth - 14, 23);
      doc.autoTable.previous.finalY = 27;
    } else {
      const matHeadingY = wrkFinalY + 14;
      doc.setFontSize(14);
      doc.setTextColor(245, 158, 11); // amber
      doc.setFont(undefined, 'bold');
      doc.text('Materials Purchase Report', 14, matHeadingY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(245, 158, 11);
      doc.line(14, matHeadingY + 3, pageWidth - 14, matHeadingY + 3);
      doc.autoTable.previous.finalY = matHeadingY + 7;
    }

    let totalMatSpend = 0;
    let matBody;

    if (inventoryItems.length === 0) {
      matBody = [[{ content: 'No material purchases recorded for this period.', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic', textColor: [100, 100, 100] } }]];
    } else {
      matBody = inventoryItems.map((item) => {
        const totalAmt = Number(item.totalAmount) || 0;
        totalMatSpend += totalAmt;
        let dateStr = item.purchaseDate || '';
        if (dateStr && dateStr.includes('-')) {
          const [y, m, d] = dateStr.split('-');
          dateStr = `${d}/${m}/${y}`;
        }
        return [
          dateStr,
          item.materialName || '',
          item.category || '',
          `${Number(item.quantity) || 0} ${item.unit || ''}`.trim(),
          formatRupees(Number(item.unitPrice) || 0),
          formatRupees(totalAmt),
          item.supplierName || '—',
        ];
      });

      // Summary rows
      matBody.push([
        { content: `Total Items Purchased: ${inventoryItems.length}`, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatRupees(totalMatSpend), colSpan: 2, styles: { fontStyle: 'bold', textColor: [245, 158, 11] } },
      ]);
    }

    doc.autoTable({
      startY: doc.autoTable.previous.finalY,
      head: [['Date', 'Material Name', 'Category', 'Qty & Unit', 'Unit Price (₹)', 'Total Amount (₹)', 'Supplier']],
      body: matBody,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { font: 'Roboto', fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 25, halign: 'left' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 30, halign: 'left' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // ── Section D: Camp Details ──
    const matFinalY = doc.lastAutoTable.finalY || 54;

    if (matFinalY > pageHeight - 50) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(155, 89, 182); // purple #9B59B6
      doc.setFont(undefined, 'bold');
      doc.text('Section D: Camp Details', 14, 20);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(155, 89, 182);
      doc.line(14, 23, pageWidth - 14, 23);
      doc.autoTable.previous.finalY = 27;
    } else {
      const campHeadingY = matFinalY + 14;
      doc.setFontSize(14);
      doc.setTextColor(155, 89, 182);
      doc.setFont(undefined, 'bold');
      doc.text('Section D: Camp Details', 14, campHeadingY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(155, 89, 182);
      doc.line(14, campHeadingY + 3, pageWidth - 14, campHeadingY + 3);
      doc.autoTable.previous.finalY = campHeadingY + 7;
    }

    let pdfTotalCampsWorkAmount = 0;
    let pdfCampBody;

    if (campsData.length === 0) {
      pdfCampBody = [[{ content: 'No camps recorded for this period.', colSpan: 4, styles: { halign: 'center', fontStyle: 'italic', textColor: [100, 100, 100] } }]];
    } else {
      pdfCampBody = campsData.map((camp) => {
        const totalAmt = Number(camp.totalWorkAmount) || 0;
        pdfTotalCampsWorkAmount += totalAmt;
        
        let dateStr = '';
        if (camp.startDate && camp.endDate) {
          dateStr = `${formatDate(camp.startDate)} to ${formatDate(camp.endDate)}`;
        } else if (camp.startDate) {
          dateStr = formatDate(camp.startDate);
        }
        
        const workersStr = (camp.workers || []).map(w => `${w.workerName} (₹${w.campPay})`).join(', ');

        return [
          camp.location || '',
          dateStr,
          formatRupees(totalAmt),
          workersStr || 'None',
        ];
      });

      pdfCampBody.push([
        { content: 'Grand Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatRupees(pdfTotalCampsWorkAmount), styles: { fontStyle: 'bold', textColor: [155, 89, 182], halign: 'right' } },
        ''
      ]);
    }

    doc.autoTable({
      startY: doc.autoTable.previous.finalY,
      head: [['Camp Location', 'Dates', 'Total Work Amount (₹)', 'Assigned Workers & Amounts']],
      body: pdfCampBody,
      theme: 'grid',
      headStyles: { fillColor: [155, 89, 182], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { font: 'Roboto', fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      columnStyles: {
          0: { cellWidth: 40, halign: 'left' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 'auto', halign: 'left' }
      },
      alternateRowStyles: { fillColor: [250, 248, 252] }, // Light purple striping
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Save PDF locally temporarily
    const fileName = `monthly-report-${startStr.replace(/\//g, '-')}.pdf`;
    const filePath = join(REPORTS_DIR, fileName);
    const pdfOutput = doc.output('arraybuffer');
    writeFileSync(filePath, Buffer.from(pdfOutput));

    const fileUrl = await uploadToFirebaseStorage(filePath, fileName, 'application/pdf');

    // Save report record
    const reportId = generateId('RPT');
    const reportData = {
      id: reportId,
      type: 'monthly',
      periodStart: startStr,
      periodEnd: endStr,
      fileName,
      filePath, // keep for fallback/debugging
      fileUrl: fileUrl || null,
      generatedAt: nowISO(),
    };
    await db.collection('reports').doc(reportId).set(reportData);

    return successResponse(res, reportData, 'Monthly PDF report generated successfully.', 201);
  } catch (error) {
    console.error('GenerateMonthlyReport error:', error);
    return errorResponse(res, 'Failed to generate monthly report.');
  }
};

