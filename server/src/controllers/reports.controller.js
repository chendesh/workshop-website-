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

    if (!existsSync(report.filePath)) {
      return errorResponse(res, 'Report file not found on server.', 404);
    }

    const fileBuffer = readFileSync(report.filePath);

    // Set appropriate content type
    const contentType = report.type === 'weekly'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${report.fileName}"`,
      'Content-Length': fileBuffer.length,
    });

    return res.send(fileBuffer);
  } catch (error) {
    console.error('DownloadReport error:', error);
    return errorResponse(res, 'Failed to download report.');
  }
};

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
        const wageAmount = w.baseAmount !== undefined ? w.baseAmount : w.amount;

        if (!workerDataMap[key]) {
             workerDataMap[key] = {
                 date: normDate,
                 workerName: w.workerName,
                 attendance: 'unrecorded',
                 wage: wageAmount,
                 paymentStatus: w.status
             };
        } else {
             workerDataMap[key].wage = wageAmount;
             workerDataMap[key].paymentStatus = w.status;
        }
    });

    const workersData = Object.values(workerDataMap);
    // Sort by Date, then Worker Name
    workersData.sort((a, b) => {
        const dateDiff = parseDate(a.date) - parseDate(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.workerName.localeCompare(b.workerName);
    });

    return { workLogs, workersData };
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

    const { workLogs, workersData } = await fetchReportData(startStr, endStr);

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
    const wrkHeaders = ['Worker Name', 'Date', 'Attendance', 'Wage (₹)', 'Payment Status'];
    const wrkData = workersData.map((w) => {
        const wage = Number(w.wage) || 0;
        totalWages += wage;
        return [w.workerName, w.date, w.attendance, wage, w.paymentStatus === 'paid' ? 'Paid' : 'Not Paid'];
    });
    // Add Grand Total row
    wrkData.push(['Grand Total', '', '', totalWages, '']);
    
    const wrkSheetData = [
      ['Weekly Workers Data'],
      [`Period: ${startStr} to ${endStr}`],
      [],
      wrkHeaders,
      ...wrkData
    ];
    const wrkSheet = XLSX.utils.aoa_to_sheet(wrkSheetData);
    XLSX.utils.book_append_sheet(wb, wrkSheet, 'Workers Data');

    // Save file
    const fileName = `weekly-report-${startStr.replace(/\//g, '-')}.xlsx`;
    const filePath = join(REPORTS_DIR, fileName);
    XLSX.writeFile(wb, filePath);

    // Save report record to Firestore
    const reportId = generateId('RPT');
    const reportData = {
      id: reportId,
      type: 'weekly',
      periodStart: startStr,
      periodEnd: endStr,
      fileName,
      filePath,
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

    const { workLogs, workersData } = await fetchReportData(startStr, endStr);

    // ── Build PDF ──
    const doc = new jsPDF();
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
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] }
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
            w.paymentStatus === 'paid' ? 'Paid' : 'Not Paid'
        ];
    });

    wrkBody.push([{ content: 'Grand Total', colSpan: 3, styles: { fontStyle: 'bold' } }, formatRupees(totalWages), '']);

    doc.autoTable({
        startY: doc.autoTable.previous.finalY,
        head: [['Worker Name', 'Date', 'Attendance', 'Wage', 'Payment Status']],
        body: wrkBody,
        theme: 'grid',
        headStyles: { fillColor: [39, 174, 96] },
        styles: { fontSize: 9 }
    });

    // Save PDF
    const fileName = `monthly-report-${startStr.replace(/\//g, '-')}.pdf`;
    const filePath = join(REPORTS_DIR, fileName);
    const pdfOutput = doc.output('arraybuffer');
    writeFileSync(filePath, Buffer.from(pdfOutput));

    // Save report record
    const reportId = generateId('RPT');
    const reportData = {
      id: reportId,
      type: 'monthly',
      periodStart: startStr,
      periodEnd: endStr,
      fileName,
      filePath,
      generatedAt: nowISO(),
    };
    await db.collection('reports').doc(reportId).set(reportData);

    return successResponse(res, reportData, 'Monthly PDF report generated successfully.', 201);
  } catch (error) {
    console.error('GenerateMonthlyReport error:', error);
    return errorResponse(res, 'Failed to generate monthly report.');
  }
};
