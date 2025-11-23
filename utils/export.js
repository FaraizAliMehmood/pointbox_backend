const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

// Export to CSV
const exportToCSV = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  return { content: csv, filename: `${filename}.csv`, contentType: 'text/csv' };
};

// Export to XLSX
const exportToXLSX = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { content: buffer, filename: `${filename}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
};

// Export to PDF
const exportToPDF = (data, filename, title = 'Report') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve({
          content: buffer,
          filename: `${filename}.pdf`,
          contentType: 'application/pdf',
        });
      });

      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const columnWidth = doc.page.width / headers.length;

        // Headers
        doc.fontSize(12).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, i * columnWidth, doc.y, { width: columnWidth });
        });
        doc.moveDown();

        // Data rows
        doc.fontSize(10).font('Helvetica');
        data.forEach((row) => {
          headers.forEach((header, i) => {
            const value = row[header]?.toString() || '';
            doc.text(value, i * columnWidth, doc.y, { width: columnWidth });
          });
          doc.moveDown();
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `TXN${timestamp}${random}`;
};

module.exports = {
  exportToCSV,
  exportToXLSX,
  exportToPDF,
  generateTransactionId,
};

