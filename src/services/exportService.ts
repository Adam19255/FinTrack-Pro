import { Transaction } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (transactions: Transaction[]) => {
  const ws = XLSX.utils.json_to_sheet(transactions);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, "FinTrack_Data.xlsx");
};

export const exportToPDF = (transactions: Transaction[]) => {
  const doc = new jsPDF();
  
  const tableColumn = ["Date", "Type", "Category", "Amount", "Description"];
  const tableRows: (string | number)[][] = [];

  transactions.forEach(transaction => {
    const transactionData = [
      transaction.date,
      transaction.type,
      transaction.category,
      transaction.amount,
      transaction.description,
    ];
    tableRows.push(transactionData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 20,
  });
  
  doc.text("FinTrack Pro - Financial Report", 14, 15);
  doc.save("FinTrack_Report.pdf");
};