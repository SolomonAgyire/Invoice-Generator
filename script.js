// Database setup
let db;
const dbName = "InvoiceDB";
const request = indexedDB.open(dbName, 1);

// Global variable to store the current invoice ID
let currentInvoiceId = null;



request.onerror = (event) => {
    console.error("Database error: " + event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    const objectStore = db.createObjectStore("invoices", { keyPath: "id", autoIncrement: true });
    objectStore.createIndex("date", "date", { unique: false });
    objectStore.createIndex("clientName", "clientName", { unique: false });
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log("Database loaded successfully");
    loadInvoices(); // Load existing invoices when database is ready
};

// Initialize the first item row
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today (local time)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateInput = document.getElementById('invoiceDate');
    if (dateInput) {
    dateInput.valueAsDate = today;
    }
    
    // Add event listeners for the first item row
    const firstItemRow = document.querySelector('.item-row');
    if (firstItemRow) {
        setupItemRow(firstItemRow);
    }

    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            console.log("Navigating to page:", targetPage);

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show target page
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${targetPage}Page`) {
                    page.classList.add('active');
                    console.log("Activated page:", page.id);
                }
            });

            // If navigating to history, refresh the list
            if (targetPage === 'history') {
                console.log("Loading invoices for history page");
                loadInvoices();
            }
        });
    });
});

// Add new item row
document.getElementById('addItem').addEventListener('click', function() {
    const itemsContainer = document.getElementById('itemsContainer');
    const newRow = document.createElement('div');
    newRow.className = 'item-row grid grid-cols-12 gap-4 mb-4';
    newRow.style.opacity = '0';
    newRow.style.transform = 'translateY(20px)';
    newRow.innerHTML = `
        <div class="col-span-7">
            <textarea placeholder="Description" class="w-full p-3 border rounded-lg" rows="2" required></textarea>
        </div>
        <div class="col-span-4">
            <input type="text" placeholder="Amount" class="w-full p-3 border rounded-lg money-input" required />
        </div>
        <div class="col-span-1">
            <button type="button" class="remove-item bg-red-500 text-white px-3 py-3 rounded-lg hover:bg-red-600 w-full flex items-center justify-center" title="Remove this line">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    `;
    itemsContainer.appendChild(newRow);
    setupItemRow(newRow);
    
    // Trigger animation
    requestAnimationFrame(() => {
        newRow.style.transition = 'all 0.5s ease';
        newRow.style.opacity = '1';
        newRow.style.transform = 'translateY(0)';
    });
});

// Setup event listeners for item row
function setupItemRow(row) {
    const removeButton = row.querySelector('.remove-item');
    const moneyInput = row.querySelector('.money-input');

    // Format money input
    moneyInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^\d.]/g, '');
        
        // Ensure only one decimal point
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limit to 2 decimal places
        if (parts.length > 1 && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }

        // Format with commas for thousands
        if (value) {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                value = num.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        }

        e.target.value = value;
    });

    // Remove row with animation
    removeButton.addEventListener('click', function() {
        if (document.querySelectorAll('.item-row').length > 1) {
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateX(100%)';
            setTimeout(() => row.remove(), 300);
        }
    });
}

// Load invoices from database
function loadInvoices() {
    const transaction = db.transaction(["invoices"], "readonly");
    const objectStore = transaction.objectStore("invoices");
    const request = objectStore.getAll();

    request.onsuccess = (event) => {
        const invoices = event.target.result;
        displayInvoices(invoices);
    };
}

// Display invoices in the list
function displayInvoices(invoices) {
    const invoiceList = document.getElementById('invoiceList');
    invoiceList.innerHTML = '';
    
    console.log('Setting up clickable invoice rows');

    invoices.forEach(invoice => {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50 invoice-row';
        tr.setAttribute('data-invoice-id', invoice.id);
        
        // Make row clickable on all screen sizes
        tr.style.cursor = 'pointer';
        
        // Add click handler for the row
        tr.addEventListener('click', function(e) {
            console.log('Row clicked!', invoice.id);
            
            // Add visual feedback
            this.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            setTimeout(() => {
                this.style.backgroundColor = '';
            }, 300);
            
            previewInvoice(invoice.id);
        }, true); // Use capture phase for earlier interception
        
        tr.innerHTML = `
            <td class="py-2">${invoice.invoiceNumber}</td>
            <td class="py-2">${invoice.clientName}</td>
            <td class="py-2">${formatDate(invoice.date)}</td>
        `;
        
        invoiceList.appendChild(tr);
    });
}

// Save invoice to database
function saveInvoice(invoiceData) {
    const transaction = db.transaction(["invoices"], "readwrite");
    const objectStore = transaction.objectStore("invoices");
    const request = objectStore.add(invoiceData);

    request.onsuccess = (event) => {
        loadInvoices(); // Refresh the invoice list
    };
}

// Get invoice from database
function getInvoice(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["invoices"], "readonly");
        const objectStore = transaction.objectStore("invoices");
        const request = objectStore.get(parseInt(id));

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Preview invoice in modal popup
window.previewInvoice = async function(id) {
    console.log("Opening preview for invoice ID:", id);
    const invoice = await getInvoice(id);
    if (!invoice) {
        console.error("Invoice not found:", id);
        return;
    }

    // Store the current invoice ID globally
    currentInvoiceId = id;
    console.log("Set currentInvoiceId to:", currentInvoiceId);

    renderModalInvoicePreview(invoice);
    
    // Add a small delay to ensure DOM is updated before showing the modal
    setTimeout(() => {
        const modal = document.getElementById('invoicePreviewModal');
        modal.classList.remove('hidden');
    
        // Make sure buttons container is visible
        const buttonsContainer = modal.querySelector('.flex.justify-end');
        if (buttonsContainer) {
            console.log("Found buttons container:", buttonsContainer);
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.marginTop = '20px';
            buttonsContainer.style.paddingTop = '10px';
            buttonsContainer.style.borderTop = '2px solid #e5e7eb';
        } else {
            console.error("Buttons container not found");
        }
    }, 100);
}

// Render invoice preview in modal
function renderModalInvoicePreview(invoice) {
    document.getElementById('modalInvoicePreview').innerHTML = `
        <div class="invoice-header flex items-center mb-4">
            <img src="logo.png" alt="Company Logo" class="h-12 w-12 object-contain rounded-lg shadow-md mr-4 bg-white p-1 border border-gray-200" />
            <div>
                <h2 class="text-xl font-bold text-gray-800 leading-tight mb-1">Precision Handyman Solutions, LLC.</h2>
                <p class="text-base font-semibold text-yellow-500">(334-328-6093)</p>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="p-4 bg-gray-50 rounded-lg">
                <h3 class="font-semibold mb-1 text-gray-700">Bill To:</h3>
                <p class="font-bold text-gray-800">${invoice.clientName}</p>
                <p class="text-gray-600 text-sm">${invoice.clientAddress}</p>
            </div>
            <div class="text-right p-4 bg-gray-50 rounded-lg">
                <p class="mb-1"><strong class="text-gray-700">Invoice #: </strong><span class="text-primary">${invoice.invoiceNumber}</span></p>
                <p><strong class="text-gray-700">Date: </strong><span class="text-primary">${formatDate(invoice.date)}</span></p>
            </div>
        </div>
        <div class="table-container bg-white rounded-lg overflow-hidden">
            <table class="w-full mb-4">
                <thead class="table-header">
                    <tr class="border-b">
                        <th class="text-left py-2 px-4 bg-gray-50">Description</th>
                        <th class="text-right py-2 px-4 bg-gray-50">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr class="border-b hover:bg-gray-50 transition-colors">
                            <td class="py-2 px-4">${item.description.replace(/\n/g, '<br>')}</td>
                            <td class="text-right py-2 px-4">$${parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="border-t bg-gray-50">
                        <td class="text-right py-2 px-4"><strong>Total:</strong></td>
                        <td class="text-right py-2 px-4"><strong class="text-primary">$${parseFloat(invoice.total).toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div class="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-600 text-sm">
            <p class="mb-1">Thank you for your business!</p>
            <p class="text-xs">Please make checks payable to: Precision Handyman Solutions, LLC.</p>
        </div>
        
        <!-- Action Buttons directly in the invoice content -->
        <div class="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-4">
            <button onclick="deleteInvoice(${invoice.id})" class="btn bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                Delete
            </button>
            <button onclick="downloadInvoice(${invoice.id})" class="btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                Download
            </button>
            <button onclick="document.getElementById('invoicePreviewModal').classList.add('hidden')" class="btn bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                Close
            </button>
        </div>
    `;
}

// Close modal functionality - Modified to handle possible click events better
document.addEventListener('DOMContentLoaded', function() {
    const closeButton = document.getElementById('closePreviewModal');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
    document.getElementById('invoicePreviewModal').classList.add('hidden');
        });
    }
});

// Delete invoice with animation
window.deleteInvoice = async function(id) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    const row = document.querySelector(`tr[data-invoice-id="${id}"]`);
    if (row) {
        row.classList.add('delete-animation');
    }
    
    try {
        const transaction = db.transaction(["invoices"], "readwrite");
        const objectStore = transaction.objectStore("invoices");
        
        // Delete from database
        await new Promise((resolve, reject) => {
            const request = objectStore.delete(parseInt(id));
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Close modal if the deleted invoice was being previewed
        const previewModal = document.getElementById('invoicePreviewModal');
        if (previewModal.classList.contains('hidden')) {
            previewModal.classList.remove('hidden');
        }

        // Wait for animation to complete before refreshing
        setTimeout(() => {
            loadInvoices();
        }, 300);
        
    } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice. Please try again.');
    }
};

// PDF download function that avoids canvas taint issues
window.downloadInvoice = async function(id) {
    console.log("Download button clicked for invoice ID:", id);
    try {
        // First make sure we have the jsPDF library
        if (typeof jspdf === 'undefined') {
            console.error("jsPDF library not found");
            alert("PDF generation library not loaded. Please refresh and try again.");
            return;
        }
        
    const invoice = await getInvoice(id);
    if (!invoice) {
            console.error("Invoice not found for download:", id);
        return;
    }

        // Create PDF 
        console.log("Creating PDF...");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // PDF settings
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        let y = margin;
        
        // Color palette
        const primaryColor = [13, 110, 253]; // Brighter blue
        const secondaryColor = [255, 140, 0]; // Orange
        const accentColor = [0, 128, 0]; // Green for total/positive amounts
        const grayColor = [75, 85, 99]; // Dark gray
        const bgLight = [248, 249, 250]; // Light background
        const bgMedium = [233, 236, 239]; // Medium background
        
        // Logo section removed
        
        // Start y position for the company header
        const y_start = margin;
        
        // Company header - with better spacing
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(...primaryColor);
        const companyName = "Precision Handyman Solutions, LLC.";
        const companyNameWidth = pdf.getTextWidth(companyName);
        pdf.text(companyName, (pageWidth - companyNameWidth) / 2, y_start);
        y = y_start + 12;
        
        // Phone number directly under company name
        pdf.setFontSize(14);
        pdf.setTextColor(...secondaryColor);
        const phoneNumber = "(334-328-6093)";
        const phoneNumberWidth = pdf.getTextWidth(phoneNumber);
        pdf.text(phoneNumber, (pageWidth - phoneNumberWidth) / 2, y);
        y += 20;
        
        // Reset text color
        pdf.setTextColor(...grayColor);
        
        // Add a light blue background for the entire client/invoice info section
        pdf.setFillColor(240, 248, 255); // Very light blue
        pdf.rect(margin - 5, y - 5, pageWidth - 2 * (margin - 5), 50, 'F');
        
        // Draw a border around the section
        pdf.setDrawColor(...primaryColor);
        pdf.setLineWidth(0.5);
        pdf.rect(margin - 5, y - 5, pageWidth - 2 * (margin - 5), 50);
        
        // Client and invoice info section - better spacing and styling
        const boxHeight = 40;
        
        // Client info box - now just text, not a separate box
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(...primaryColor);
        pdf.text("Bill To:", margin, y + 10);
        pdf.setTextColor(...grayColor);
        pdf.setFont('helvetica', 'normal');
        pdf.text(invoice.clientName, margin, y + 20);
        
        // Handle multi-line address with text wrapping
        const addressLines = pdf.splitTextToSize(invoice.clientAddress, pageWidth/2 - margin - 10);
        for (let i = 0; i < addressLines.length; i++) {
            pdf.text(addressLines[i], margin, y + 30 + (i * 10));
        }
        
        // Invoice info - right aligned with less space between label and value
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...primaryColor);
 
        // Calculate positions for labels and values
        const invoiceLabel = "Invoice #:";
        const dateLabel = "Date:";
        const labelX = pageWidth - margin - 100;
 
        // Draw labels
        pdf.text(invoiceLabel, labelX, y + 10);
        pdf.text(dateLabel, labelX, y + 25);
 
        // Calculate width of labels and position values with minimal spacing
        const invoiceLabelWidth = pdf.getTextWidth(invoiceLabel);
        const dateLabelWidth = pdf.getTextWidth(dateLabel);
 
        // Even less space between labels and values (just 2 units)
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...grayColor);
        pdf.text(invoice.invoiceNumber, labelX + invoiceLabelWidth + 2, y + 10);
        pdf.text(formatDate(invoice.date), labelX + dateLabelWidth + 2, y + 25);
        
        y += boxHeight + 20;
        
        // Add gradient background for the items table
        const tableStartY = y;
        // Light gradient background for items section
        pdf.setFillColor(...bgLight);
        pdf.rect(margin - 5, y - 5, pageWidth - 2 * (margin - 5), 
                 invoice.items.length * 15 + 40, 'F');
        
        // Items table header with better styling
        pdf.setFillColor(...primaryColor);
        pdf.setTextColor(255, 255, 255); // White text
        pdf.rect(margin - 5, y - 5, pageWidth - 2 * (margin - 5), 15, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text("Description", margin + 5, y + 5);
        pdf.text("Amount", pageWidth - margin - 15, y + 5, { align: 'right' });
        
        y += 15;
        
        // Items with better styling
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...grayColor);
        let totalAmount = 0;
        
        invoice.items.forEach((item, index) => {
            // Alternating row background
            if (index % 2 === 0) {
                pdf.setFillColor(245, 245, 245); // Lighter alternating rows
            } else {
                pdf.setFillColor(255, 255, 255); // White rows
            }
            
            // Calculate row height based on description length
            const descriptionLines = pdf.splitTextToSize(item.description, pageWidth - 2 * margin - 60);
            const rowHeight = Math.max(15, descriptionLines.length * 10);
            
            // Draw taller background for multiline descriptions
            pdf.rect(margin - 5, y - 5, pageWidth - 2 * (margin - 5), rowHeight, 'F');
            
            // Item text with multiline support
            pdf.text(descriptionLines, margin + 5, y + 5);
            const amount = parseFloat(item.amount).toFixed(2);
            
            // Color amounts in accent color (aligned to the top of the row for consistency)
            pdf.setTextColor(...accentColor);
            pdf.text('$' + amount, pageWidth - margin - 5, y + 5, { align: 'right' });
            pdf.setTextColor(...grayColor);
            
            totalAmount += parseFloat(item.amount);
            y += rowHeight; // Adjust y position based on row height
        });
        
        // Draw a line above the total
        pdf.setDrawColor(...primaryColor);
        pdf.setLineWidth(0.5);
        pdf.line(pageWidth/2, y, pageWidth - margin, y);
        
        // Total with better styling
        y += 10;
        pdf.setFillColor(...bgMedium);
        pdf.rect(pageWidth/2, y - 5, pageWidth/2 - margin, 20, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...primaryColor);
        pdf.text("Total:", pageWidth/2 + 10, y + 8);
        
        // Total amount with accent color
        pdf.setTextColor(...accentColor);
        pdf.text('$' + totalAmount.toFixed(2), pageWidth - margin - 5, y + 8, { align: 'right' });
        
        y += 30;
        
        // Thank you note with better styling
        pdf.setFillColor(240, 248, 255); // Light blue
        pdf.roundedRect(margin - 5, y - 5, pageWidth - 2 * (margin - 5), 35, 5, 5, 'F');
        pdf.setDrawColor(...primaryColor);
        pdf.roundedRect(margin - 5, y - 5, pageWidth - 2 * (margin - 5), 35, 5, 5);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(...primaryColor);
        pdf.text("Thank you for your business!", pageWidth / 2, y + 10, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setTextColor(...grayColor);
        pdf.text("Please make checks payable to: Precision Handyman Solutions, LLC.", pageWidth / 2, y + 25, { align: 'center' });
        
        // Save the PDF
        console.log("Saving PDF...");
        pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
        console.log("PDF saved successfully");
        
    } catch (error) {
        console.error("Error in downloadInvoice:", error);
        alert("There was a problem creating the PDF. Please try again.");
    }
}

// Helper function to convert an image to Base64
async function getBase64Image(imgPath) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Helps with CORS issues
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Get the data URL as PNG
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (e) {
                reject(e);
            }
        };
        
        img.onerror = function(e) {
            console.error("Image load error", e);
            reject(new Error("Image load failed"));
        };
        
        // Set source path - make sure it's the complete path
        img.src = imgPath;
        
        // Handle cases where the image might be cached
        if (img.complete || img.complete === undefined) {
            img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
            setTimeout(() => {
                img.src = imgPath;
            }, 0);
        }
    });
}

function generateInvoice() {
    // Get form values
    const clientName = document.getElementById('clientName').value;
    const clientAddress = document.getElementById('clientAddress').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const invoiceNum = 'INV-' + Date.now().toString().slice(-6);

    // Update preview
    document.getElementById('previewClientName').textContent = clientName;
    document.getElementById('previewClientAddress').textContent = clientAddress;
    document.getElementById('invoiceNumber').textContent = invoiceNum;
    document.getElementById('previewDate').textContent = formatDate(invoiceDate);

    // Generate items table
    const previewItems = document.getElementById('previewItems');
    previewItems.innerHTML = '';
    let total = 0;
    const items = [];

    document.querySelectorAll('.item-row').forEach(row => {
        // Updated to handle textarea for description
        const description = row.querySelector('textarea') 
            ? row.querySelector('textarea').value 
            : row.querySelector('input[placeholder="Description"]').value;
            
        const amountInput = row.querySelector('input[placeholder="Amount"]');
        const amount = parseFloat(amountInput.value.replace(/[^0-9.-]+/g, ''));

        if (description && !isNaN(amount)) {
            const tr = document.createElement('tr');
            tr.className = 'border-b';
            
            // Handle possible multiline description with line breaks
            const descriptionHTML = description.replace(/\n/g, '<br>');
            
            tr.innerHTML = `
                <td class="py-2">${descriptionHTML}</td>
                <td class="text-right py-2">$${amount.toFixed(2)}</td>
            `;
            previewItems.appendChild(tr);
            total += amount;
            items.push({ description, amount });
        }
    });

    document.getElementById('previewTotal').textContent = total.toFixed(2);
    
    // Show preview
    document.getElementById('previewOverlay').classList.add('show');
    document.getElementById('invoicePreview').classList.add('show');

    // Save invoice to database
    const invoiceData = {
        invoiceNumber: invoiceNum,
        date: invoiceDate,
        clientName,
        clientAddress,
        items,
        total: total.toFixed(2)
    };
    saveInvoice(invoiceData);
}

// Function to close preview
function closePreview() {
    document.getElementById('previewOverlay').classList.remove('show');
    document.getElementById('invoicePreview').classList.remove('show');
}

// Format date in a more readable way
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    // Create date object and adjust for local timezone
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
}

// Register service worker for PWA
if ('serviceWorker' in navigator && 
    (window.location.protocol === 'https:' || 
     window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service worker registered.', reg))
      .catch(err => console.error('Service worker registration failed:', err));
  });
} else {
  console.log('Service Worker is not supported when running directly from file system. Use a web server for testing PWA features.');
} 