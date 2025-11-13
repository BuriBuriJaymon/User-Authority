/**
 * app.js
 * Replaces all Firebase logic with localStorage.
 * Handles all report saving, retrieving, and status updates.
 * Manages UI for all pages.
 */

const STORAGE_KEY = 'fixYourCityReports';

// --- Data Store Functions ---

/**
 * Retrieves all reports from localStorage.
 * @returns {Array} An array of report objects.
 */
function getReports() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
        console.error("Error parsing reports from localStorage", e);
        return [];
    }
}

/**
 * Saves an array of reports to localStorage.
 * @param {Array} reports - The array of reports to save.
 */
function saveReports(reports) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/**
 * Adds a new report to localStorage.
 * @param {object} report - The new report object.
 */
function addReport(report) {
    const reports = getReports();
    reports.push(report);
    saveReports(reports);
}

/**
 * Updates the status of a specific report.
 * @param {string} reportId - The ID of the report to update.
 * @param {string} newStatus - The new status ('Pending', 'In Progress', 'Resolved').
 */
function updateReportStatus(reportId, newStatus) {
    const reports = getReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
        reports[reportIndex].status = newStatus;
        saveReports(reports);
    }
}

/**
 * Generates a simple unique ID.
 * @returns {string} A unique ID.
 */
function generateId() {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Reads an image file as a Base64 Data URL.
 * @param {File} file - The image file from the input.
 * @returns {Promise<string>} A promise that resolves with the data URL.
 */
function readImageAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- Status Styling Function ---
function getStatusClass(status) {
    switch (status) {
        case 'Resolved': return 'bg-green-100 text-green-800';
        case 'In Progress': return 'bg-yellow-100 text-yellow-800';
        case 'Pending': default: return 'bg-red-100 text-red-800';
    }
}

// --- Shared UI Functions ---

/**
 * Initializes the "Report an Issue" modal functionality.
 * This is now shared across multiple pages.
 */
function initReportModal() {
    const modal = document.getElementById('report-modal');
    if (!modal) return; // Exit if modal isn't on the page

    const form = document.getElementById('report-form');
    const openModalBtns = document.querySelectorAll('.open-report-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const submitBtn = document.getElementById('submit-report-btn');
    const formMessage = document.getElementById('form-message');

    const openModal = (e) => {
        e.preventDefault(); // Prevent default link behavior
        modal.classList.remove('hidden');
    };
    const closeModal = () => modal.classList.add('hidden');

    openModalBtns.forEach(btn => btn.addEventListener('click', openModal));
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        formMessage.classList.add('hidden');

        try {
            const category = form.querySelector('#issue-category').value;
            const location = form.querySelector('#location').value;
            const description = form.querySelector('#description').value;
            const photoFile = form.querySelector('#photo-upload').files[0];

            if (!category || !location || !photoFile) {
                throw new Error('Please fill out all required fields and add a photo.');
            }

            const imageData = await readImageAsDataURL(photoFile);

            const newReport = {
                id: generateId(),
                category,
                location,
                description,
                imageData,
                status: 'Pending',
                submittedAt: new Date().toISOString(),
            };

            addReport(newReport);

            formMessage.textContent = 'Report submitted successfully!';
            formMessage.className = 'p-3 rounded-lg text-sm bg-green-100 text-green-800';
            formMessage.classList.remove('hidden');

            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
            form.reset();

            setTimeout(() => {
                closeModal();
                formMessage.classList.add('hidden');
                // If we're on the explore page, refresh it to show the new report
                if (document.body.dataset.page === 'explore') {
                    initExplorePage();
                }
            }, 2000);

        } catch (error) {
            formMessage.textContent = `Error: ${error.message}`;
            formMessage.className = 'p-3 rounded-lg text-sm bg-red-100 text-red-800';
            formMessage.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
    });
}

/**
 * Initializes the image popup modal.
 * Shared by My Reports and Explore Issues pages.
 */
function initImageModal() {
    const imageModal = document.getElementById('image-modal');
    if (!imageModal) return;

    const modalImage = document.getElementById('modal-image');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    const openModal = (imageUrl) => {
        modalImage.src = imageUrl;
        imageModal.classList.remove('hidden');
    };
    const closeModal = () => {
        imageModal.classList.add('hidden');
        modalImage.src = ''; 
    };

    modalCloseBtn.addEventListener('click', closeModal);
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) closeModal();
    });

    // Listen for clicks on the body, delegating to image buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-image-btn') || e.target.classList.contains('explore-image-thumb')) {
            openModal(e.target.dataset.src);
        }
    });
}


// --- Page Initializers ---

/**
 * Sets up the User Dashboard page.
 */
function initUserDashboard() {
    // The modal logic is now shared
}

/**
 * Sets up the "My Reports" page.
 */
function initMyReports() {
    const tableBody = document.getElementById('reports-tbody');
    const noReportsMsg = document.getElementById('no-reports-message');
    const reports = getReports();

    if (reports.length === 0) {
        noReportsMsg.classList.remove('hidden');
        return;
    }

    tableBody.innerHTML = ''; // Clear table
    reports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)); // Sort newest first

    reports.forEach(issue => {
        const row = document.createElement('tr');
        const statusClasses = `px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(issue.status)}`;
        const submittedDate = new Date(issue.submittedAt).toLocaleDateString('en-IN');
        
        let actionButton = '';
        if (issue.status === 'Resolved') {
            actionButton = `<button class="reopen-btn text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium" data-id="${issue.id}">Reopen</button>`;
        }

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${submittedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${issue.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${issue.location}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="${statusClasses}">${issue.status}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="view-image-btn text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium" data-src="${issue.imageData}">View</button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                ${actionButton}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Reopen button handler
    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('reopen-btn')) {
            const reportId = e.target.dataset.id;
            updateReportStatus(reportId, 'Pending');
            initMyReports(); // Re-render the table
        }
    });
}

/**
 * Sets up the "Explore Issues" page.
 */
function initExplorePage() {
    const pendingList = document.getElementById('pending-list');
    const inProgressList = document.getElementById('in-progress-list');
    const resolvedList = document.getElementById('resolved-list');

    const pendingEmpty = document.getElementById('pending-empty');
    const inProgressEmpty = document.getElementById('in-progress-empty');
    const resolvedEmpty = document.getElementById('resolved-empty');

    const reports = getReports();

    // Filter reports by status
    const pending = reports.filter(r => r.status === 'Pending').sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const inProgress = reports.filter(r => r.status === 'In Progress').sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const resolved = reports.filter(r => r.status === 'Resolved').sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    /**
     * Creates the HTML for a single report card.
     * @param {object} report - The report object.
     * @returns {string} HTML string for the card.
     */
    function createReportCard(report) {
        const statusClasses = `px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(report.status)}`;
        const submittedDate = new Date(report.submittedAt).toLocaleDateString('en-IN');
        
        // Truncate description
        const description = report.description.length > 100 
            ? report.description.substring(0, 100) + '...' 
            : report.description;

        return `
            <div class="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
                <img src="${report.imageData}" alt="${report.category}" class="explore-image-thumb" data-src="${report.imageData}">
                <div class="p-4 flex flex-col flex-grow">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-semibold text-blue-600">${report.category}</span>
                        <span class="${statusClasses}">${report.status}</span>
                    </div>
                    <p class="text-lg font-semibold text-gray-800 mb-2">${report.location}</p>
                    <p class="text-sm text-gray-600 flex-grow mb-4">${description || 'No description provided.'}</p>
                    <div class="text-xs text-gray-500 mt-auto">
                        Reported on: ${submittedDate}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renders a list of report cards into a container.
     * @param {HTMLElement} container - The element to inject HTML into.
     * @param {HTMLElement} emptyEl - The element to show if reports are empty.
     * @param {Array} reports - The array of report objects.
     */
    function renderList(container, emptyEl, reports) {
        if (reports.length === 0) {
            emptyEl.classList.remove('hidden');
            container.innerHTML = '';
        } else {
            emptyEl.classList.add('hidden');
            container.innerHTML = reports.map(createReportCard).join('');
        }
    }

    // Render all three lists
    renderList(pendingList, pendingEmpty, pending);
    renderList(inProgressList, inProgressEmpty, inProgress);
    renderList(resolvedList, resolvedEmpty, resolved);
}


/**
 * Sets up the Authority Dashboard page.
 */
function initAuthorityDashboard() {
    let allReports = getReports();
    let currentFilter = 'All Reports';

    const statTotalEl = document.getElementById('stat-total');
    const statPendingEl = document.getElementById('stat-pending');
    const statResolvedEl = document.getElementById('stat-resolved');
    const complaintListEl = document.getElementById('complaint-list');
    const emptyStateEl = document.getElementById('empty-state');
    const headerTitleEl = document.getElementById('header-title');
    const complaintListTitleEl = document.getElementById('complaint-list-title');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    function updateStatistics() {
        statTotalEl.textContent = allReports.length;
        statPendingEl.textContent = allReports.filter(r => r.status === 'Pending').length;
        statResolvedEl.textContent = allReports.filter(r => r.status === 'Resolved').length;
    }

    function renderComplaintList() {
        complaintListEl.innerHTML = ''; // Clear list
        
        let filteredReports = [];
        if (currentFilter === 'All Reports') {
            filteredReports = allReports;
        } else if (['Pending', 'In Progress', 'Resolved'].includes(currentFilter)) {
            filteredReports = allReports.filter(r => r.status === currentFilter);
        } else {
            // Category filter
            filteredReports = allReports.filter(r => r.category === currentFilter);
        }

        // Sort by date, newest first
        filteredReports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        if (filteredReports.length === 0) {
            // Check if the empty state element is already there
            if (!complaintListEl.contains(emptyStateEl)) {
                 complaintListEl.appendChild(emptyStateEl);
            }
            emptyStateEl.classList.remove('hidden');
            return;
        }
        
        emptyStateEl.classList.add('hidden');

        filteredReports.forEach(report => {
            const card = createComplaintCard(report);
            complaintListEl.appendChild(card);
        });
    }

    function createComplaintCard(report) {
        const card = document.createElement('div');
        card.className = 'p-6 border-b border-gray-200 last:border-b-0';
        
        const formattedDate = new Date(report.submittedAt).toLocaleString('en-IN');
        const statusClasses = `px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(report.status)}`;

        card.innerHTML = `
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-x-3">
                    <span class="font-semibold text-gray-800">${report.category}</span>
                    <span class="${statusClasses}">${report.status}</span>
                </div>
                <div class="text-sm text-gray-500">
                    Reported on: ${formattedDate}
                </div>
            </div>
            
            <p class="mt-4 text-gray-700">${report.description || 'No description provided.'}</p>
            
            <a href="${report.imageData}" target="_blank" rel="noopener noreferrer" class="mt-4 inline-block">
                <img src="${report.imageData}" alt="Evidence" class="max-w-xs w-full sm:w-64 rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105">
            </a>
            
            <div class="mt-4 flex items-center justify-between flex-wrap gap-4">
                <div class="text-sm text-gray-600">
                    <p><strong>Location:</strong> ${report.location || 'Not specified'}</p>
                </div>
                
                <div class="flex-shrink-0 space-x-2">
                    ${report.status === 'Pending' ? `
                        <button data-id="${report.id}" data-status="In Progress" class="status-btn rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500">
                            Mark In Progress
                        </button>` 
                    : ''}
                    ${report.status === 'In Progress' || report.status === 'Pending' ? `
                        <button data-id="${report.id}" data-status="Resolved" class="status-btn rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
                            Mark Resolved
                        </button>` 
                    : ''}
                </div>
            </div>
        `;
        return card;
    }

    // --- Event Handlers ---

    function handleFilterClick(e) {
        e.preventDefault();
        currentFilter = e.currentTarget.dataset.filter;
        
        let title = currentFilter;
        if (currentFilter === 'All Reports') title = 'Dashboard';
        else if (currentFilter === 'Pending') title = 'No Progress (Pending)';
        else if (currentFilter === 'In Progress') title = 'Active (In Progress)';
        
        headerTitleEl.textContent = title;
        complaintListTitleEl.textContent = `${title} Reports`;
        
        sidebarLinks.forEach(link => link.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        renderComplaintList();
        
        if (window.innerWidth < 768) {
            sidebar.classList.remove('open');
        }
    }

    complaintListEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('status-btn')) {
            const reportId = e.target.dataset.id;
            const newStatus = e.target.dataset.status;
            updateReportStatus(reportId, newStatus);
            // Re-fetch and re-render
            allReports = getReports();
            updateStatistics();
            renderComplaintList();
        }
    });

    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    sidebarLinks.forEach(link => link.addEventListener('click', handleFilterClick));

    // --- Initial Load ---
    updateStatistics();
    renderComplaintList();
}


/**
 * Sets up common functionality, like logout.
 */
function initCommon() {
    document.querySelectorAll('#logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // We just clear the userType. We'll leave the reports
            // so the "authority" can see them.
            localStorage.removeItem('userType');
            window.location.href = 'index.html';
        });
    });

    // Initialize the report modal on any page that has it
    initReportModal();
}

// --- Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    
    if (page === 'user-dashboard') {
        initUserDashboard();
    } else if (page === 'my-reports') {
        initMyReports();
        initImageModal(); // Add image modal listener
    } else if (page === 'explore') {
        initExplorePage();
        initImageModal(); // Add image modal listener
    } else if (page === 'authority-dashboard') {
        initAuthorityDashboard();
    }

    // Run common setup on all pages (handles logout and report modal)
    initCommon();
});
