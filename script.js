// Database setup
let db;
const dbName = "InvoiceDB";
const request = indexedDB.open(dbName, 1);

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
    loadInvoices(); // Load existing invoices when database is ready
};

// Initialize the first item row
document.addEventListener('DOMContentLoaded', function() {
    // Initialize EmailJS
    emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your actual public key

    // Set default date to today (local time)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateInput = document.getElementById('invoiceDate');
    dateInput.valueAsDate = today;
    
    // Add event listeners for the first item row
    setupItemRow(document.querySelector('.item-row'));

    // Setup email form
    setupEmailForm();

    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show target page
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${targetPage}Page`) {
                    page.classList.add('active');
                }
            });

            // If navigating to history, refresh the list
            if (targetPage === 'history') {
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
            <input type="text" placeholder="Description" class="w-full p-3 border rounded-lg" required />
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

// Setup email form
function setupEmailForm() {
    const emailForm = document.getElementById('emailForm');
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const senderEmail = document.getElementById('senderEmail').value;
        const clientEmail = document.getElementById('clientEmail').value;
        const invoiceId = this.dataset.invoiceId;
        
        // Show loading state
        const submitButton = emailForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        try {
            await sendInvoiceEmail(invoiceId, senderEmail, clientEmail);
            alert('Invoice sent successfully!');
            closeEmailModal();
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
}

// Send invoice email
async function sendInvoiceEmail(invoiceId, senderEmail, clientEmail) {
    const invoice = await getInvoice(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // Create PDF
    const element = document.getElementById('modalInvoicePreview');
    const opt = {
        margin: 1,
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
        const pdfBase64 = await blobToBase64(pdfBlob);

        // Send email using EmailJS
        const templateParams = {
            from_email: senderEmail,
            to_email: clientEmail,
            invoice_number: invoice.invoiceNumber,
            client_name: invoice.clientName,
            company_name: "Precision Handyman Solutions, LLC.",
            invoice_date: formatDate(invoice.date),
            invoice_total: invoice.total,
            pdf_attachment: pdfBase64
        };

        await emailjs.send(
            "YOUR_SERVICE_ID", // Replace with your EmailJS service ID
            "YOUR_TEMPLATE_ID", // Replace with your EmailJS template ID
            templateParams
        );
    } catch (error) {
        console.error('Error in sendInvoiceEmail:', error);
        throw error;
    }
}

// Helper function to convert Blob to Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Function to close email modal
function closeEmailModal() {
    document.getElementById('emailModal').classList.add('hidden');
    document.getElementById('emailForm').reset();
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

    invoices.forEach(invoice => {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';
        tr.innerHTML = `
            <td class="py-2">${invoice.invoiceNumber}</td>
            <td class="py-2">${invoice.clientName}</td>
            <td class="py-2">${formatDate(invoice.date)}</td>
            <td class="py-2">$${invoice.total}</td>
            <td class="py-2 flex flex-wrap gap-2 justify-center">
                <button onclick="previewInvoice(${invoice.id})" class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">Preview</button>
                <button onclick="downloadInvoice(${invoice.id})" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Download</button>
                <button onclick="deleteInvoice(${invoice.id})" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
            </td>
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
    const invoice = await getInvoice(id);
    if (!invoice) return;
    renderModalInvoicePreview(invoice);
    document.getElementById('invoicePreviewModal').classList.remove('hidden');
    
    // Update email form with invoice ID
    document.getElementById('emailForm').dataset.invoiceId = id;
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
                            <td class="py-2 px-4">${item.description}</td>
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
    `;
}

// Close modal functionality
document.getElementById('closePreviewModal').addEventListener('click', function() {
    document.getElementById('invoicePreviewModal').classList.add('hidden');
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

// Add new download function
window.downloadInvoice = async function(id) {
    const invoice = await getInvoice(id);
    if (!invoice) return;
    
    renderModalInvoicePreview(invoice);
    const element = document.getElementById('modalInvoicePreview');
    const opt = {
        margin: 1,
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
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
        const inputs = row.querySelectorAll('input');
        const description = inputs[0].value;
        const amount = parseFloat(inputs[1].value.replace(/[^0-9.-]+/g, ''));

        if (description && !isNaN(amount)) {
            const tr = document.createElement('tr');
            tr.className = 'border-b';
            tr.innerHTML = `
                <td class="py-2">${description}</td>
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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service worker registered.', reg))
      .catch(err => console.error('Service worker registration failed:', err));
  });
} 