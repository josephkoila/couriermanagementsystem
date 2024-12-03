// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';



// Utility Functions - Define these globally
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function getStatusClass(status) {
    const statusClasses = {
        'Item Accepted by Courier': 'status-accepted',
        'Collected': 'status-collected',
        'Shipped': 'status-shipped',
        'In-Transit': 'status-transit',
        'Out for Delivery': 'status-delivery',
        'Arrived At Destination': 'status-arrived'
    };
    return statusClasses[status] || 'status-default';
}

// Global function declarations
async function editBranch(branchId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/branches/${branchId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch branch details');
        
        const branch = await response.json();
        
        // Rest of your editBranch function code...
        const contentArea = document.querySelector('.content-area');
        contentArea.innerHTML = `
            <div class="form-container">
                <h2>Edit Branch</h2>
                <form id="editBranchForm">
                    <input type="hidden" name="id" value="${branch.id}">
                    <div class="form-group">
                        <label>Branch Code</label>
                        <input type="text" value="${branch.branch_code}" readonly disabled>
                    </div>
                    <div class="form-group">
                        <label>Country</label>
                        <input type="text" name="country" value="${branch.country}" required>
                    </div>
                    <div class="form-group">
                        <label>location</label>
                        <input type="text" name="city" value="${branch.city}" required>
                    </div>
                    <div class="form-group">
                        <label>Street/Building</label>
                        <input type="text" name="street_building" value="${branch.street_building}" required>
                    </div>
                    <div class="form-group">
                        <label>Postal Code</label>
                        <input type="text" name="postal_code" value="${branch.postal_code || ''}">
                    </div>
                    <div class="form-group">
                        <label>Contact #</label>
                        <input type="text" name="contact" value="${branch.contact || ''}">
                    </div>
                    <div class="button-group">
                        <button type="submit">Update</button>
                        <button type="button" class="cancel-btn" onclick="handleSectionDisplay('list-branch')">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('editBranchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const branchData = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch(`${API_BASE_URL}/admin/branches/${branchId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify(branchData)
                });
                
                if (response.ok) {
                    showNotification('Branch updated successfully', 'success');
                    handleSectionDisplay('list-branch');
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Failed to update branch', 'error');
                }
            } catch (error) {
                console.error('Error updating branch:', error);
                showNotification('Error updating branch', 'error');
            }
        });
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error loading branch details', 'error');
    }
}
async function deleteBranch(branchId) {
    if (confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/branches/${branchId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                showNotification('Branch deleted successfully', 'success');
                loadBranchList();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Failed to delete branch', 'error');
            }
        } catch (error) {
            console.error('Error deleting branch:', error);
            showNotification('Error deleting branch', 'error');
        }
    }
}

async function editStaff(staffId) {
    try {
        const [staffResponse, branchesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/staff/${staffId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            }),
            fetch(`${API_BASE_URL}/admin/branches`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            })
        ]);

        if (!staffResponse.ok || !branchesResponse.ok) {
            throw new Error('Failed to fetch data');
        }

        const staff = await staffResponse.json();
        const branches = await branchesResponse.json();

        const contentArea = document.querySelector('.content-area');
            contentArea.innerHTML = `
                <div class="form-container">
                    <h2>Edit Staff Member</h2>
                    <form id="editStaffForm">
                        <div class="form-group">
                            <label>Employee ID</label>
                            <input type="text" value="${staff.employee_id}" readonly disabled>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>First Name</label>
                                <input type="text" name="first_name" value="${staff.first_name}" required>
                            </div>
                            <div class="form-group">
                                <label>Last Name</label>
                                <input type="text" name="last_name" value="${staff.last_name}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${staff.email}" required>
                        </div>
                        <div class="form-group">
                            <label>Branch</label>
                            <select name="branch_id" required>
                                <option value="">Select Branch</option>
                                ${branches.map(branch => `
                                    <option value="${branch.id}" ${branch.id === staff.branch_id ? 'selected' : ''}>
                                        ${branch.country}, ${branch.county}, ${branch.location}, ${branch.street_building}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>New Password (leave blank to keep current)</label>
                            <input type="password" name="password">
                        </div>
                        <div class="button-group">
                            <button type="submit">Update</button>
                            <button type="button" class="cancel-btn" onclick="handleSectionDisplay('list-staff')">Cancel</button>
                        </div>
                    </form>
                </div>
            `;

            document.getElementById('editStaffForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const staffData = Object.fromEntries(formData.entries());
                
                // Remove password if empty
                if (!staffData.password) delete staffData.password;

                try {
                    const response = await fetch(`${API_BASE_URL}/admin/staff/${staffId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                        },
                        body: JSON.stringify(staffData)
                    });
                    
                    if (response.ok) {
                        showNotification('Staff member updated successfully', 'success');
                        handleSectionDisplay('list-staff');
                    } else {
                        const error = await response.json();
                        showNotification(error.message || 'Failed to update staff member', 'error');
                    }
                } catch (error) {
                    console.error('Error updating staff:', error);
                    showNotification('Error updating staff member', 'error');
                }
            });
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error loading staff details', 'error');
        }
    }

async function deleteStaff(staffId) {
    if (confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/staff/${staffId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                showNotification('Staff member deleted successfully', 'success');
                loadStaffList();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Failed to delete staff member', 'error');
            }
        } catch (error) {
            console.error('Error deleting staff:', error);
            showNotification('Error deleting staff member', 'error');
        }
    }
}

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }

    const resultsContainer = document.getElementById('reportResults');
    resultsContainer.innerHTML = '<div class="loading">Generating report...</div>';

    try {
        // Get filters for the current report type
        const filters = getReportFilters(reportType);

        const response = await fetch(`${API_BASE_URL}/admin/reports/${reportType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
                startDate,
                endDate,
                ...filters
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        
        const data = await response.json();
        // Add this section
        if (reportType === 'staff' && data.details) {
            // Calculate additional staff metrics
            const staffSummary = calculateStaffSummary(data.details);
            data.summary = {
                ...data.summary,
                ...staffSummary
            };
        }
        
        displayReportResults(reportType, data);
        
    } catch (error) {
        console.error('Error generating report:', error);
        resultsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                Error generating report. Please try again.
            </div>
        `;
        showNotification('Error generating report', 'error');
    }
}

function displayBriefSummary(reportType, data) {
    const resultsContainer = document.getElementById('reportResults');
    let briefHTML = '<div class="brief-summary">';
    
    // Ensure data.summary exists with default values
    const summary = {
        totalParcels: 0,
        avgDeliveryTime: 0,
        successRate: 0,
        totalStaff: 0,
        avgParcelsPerStaff: 0,
        totalParcelsHandled: 0,
        mostActiveBranch: 'N/A',
        totalBranches: 0,
        totalRevenue: 0,
        avgStaffPerBranch: 0,
        ...data.summary // Spread actual values if they exist
    };
    
    switch(reportType) {
        case 'parcels':
            briefHTML += `
                <div class="summary-header">
                    <h3>Brief Parcel Report Summary</h3>
                    <p class="date-range">Period: ${formatDate(new Date(data.startDate))} to ${formatDate(new Date(data.endDate))}</p>
                </div>
                <div class="key-metrics">
                    <div class="metric">
                        <span class="label">Total Parcels:</span>
                        <span class="value">${summary.totalParcels || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Average Delivery Time:</span>
                        <span class="value">${(summary.avgDeliveryTime || 0).toFixed(1)} days</span>
                    </div>
                    <div class="metric">
                        <span class="label">Success Rate:</span>
                        <span class="value">${(summary.successRate || 0).toFixed(1)}%</span>
                    </div>
                </div>
            `;
            break;
            
            case 'staff':
                summaryHTML += `
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="card-label">Total Staff</div>
                            <div class="card-value">${data.summary.totalStaff || 0}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Average Parcels per Staff</div>
                            <div class="card-value">${(data.summary.avgParcelsPerStaff || 0).toFixed(1)}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Total Parcels Handled</div>
                            <div class="card-value">${data.summary.totalParcelsHandled || 0}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Average Success Rate</div>
                            <div class="card-value">${(data.summary.successRate || 0).toFixed(1)}%</div>
                        </div>
                    </div>
                    ${data.summary.mostActiveStaff ? `
                        <div class="most-active-staff">
                            <h4>Most Active Staff Member</h4>
                            <p>${data.summary.mostActiveStaff.name} - ${data.summary.mostActiveStaff.parcels} parcels</p>
                        </div>
                    ` : ''}
                `;
                break;
            
        case 'branches':
            briefHTML += `
                <div class="summary-header">
                    <h3>Brief Branch Report Summary</h3>
                    <p class="date-range">Period: ${formatDate(new Date(data.startDate))} to ${formatDate(new Date(data.endDate))}</p>
                </div>
                <div class="key-metrics">
                    <div class="metric">
                        <span class="label">Total Branches:</span>
                        <span class="value">${summary.totalBranches || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Total Revenue:</span>
                        <span class="value">$${(summary.totalRevenue || 0).toLocaleString()}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Average Staff/Branch:</span>
                        <span class="value">${(summary.avgStaffPerBranch || 0).toFixed(1)}</span>
                    </div>
                </div>
            `;
            break;
    }
    
    briefHTML += '</div>';
    resultsContainer.innerHTML = briefHTML;
}


// Check if we're on the login page
if (document.getElementById('adminLoginForm')) {
    // Login Page Logic
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('adminToken', data.token);
                window.location.href = 'admin-dashboard.html';
            } else {
                errorMessage.textContent = data.message || 'Invalid credentials';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'An error occurred. Please try again.';
        }
    });
} else {
    // Dashboard Logic
    // Check authentication
    if (!localStorage.getItem('adminToken')) {
        window.location.href = 'index.html';
    }

    // Add logout button event listener
    document.addEventListener('DOMContentLoaded', function() {
        // Add this line to handle logout button click
        document.querySelector('.logout-btn')?.addEventListener('click', handleLogout);

        // Existing dashboard initialization code...
        handleSectionDisplay('dashboard');

        document.querySelectorAll('.sidebar a').forEach(link => {
            // ... existing sidebar navigation code ...
        });
    });

    // Initialize dashboard data
    async function loadDashboardStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('adminToken');
                    window.location.href = 'index.html';
                    return;
                }
                throw new Error('Failed to fetch dashboard stats');
            }
            
            const data = await response.json();
            
            // Update stats cards
            document.getElementById('totalBranches').textContent = data.totalBranches;
            document.getElementById('totalParcels').textContent = data.totalParcels;
            document.getElementById('totalStaff').textContent = data.totalStaff;
            
            // Update status table
            const tableBody = document.getElementById('statusTableBody');
            if (!tableBody) return; // Exit if element doesn't exist
            
            tableBody.innerHTML = '';
            
            // Map status data to a more readable format
            const statusMapping = {
                'Item Accepted by Courier': 'Item Accepted',
                'Collected': 'Collected',
                'Shipped': 'Shipped',
                'In-Transit': 'In Transit',
                'Out for Delivery': 'Out for Delivery',
                'Arrived At Destination': 'Arrived'
            };
            
            // Create array of status counts
            const statusData = data.parcelStatus.map(status => ({
                status: statusMapping[status.status] || status.status,
                count: status.count
            }));

            // Populate table
            statusData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${item.status}</td>
                    <td>${item.count}</td>
                `;
                tableBody.appendChild(row);
            });

            // Create pie chart if Chart.js is available
            const chartCanvas = document.querySelector('.chart-container canvas');
            if (chartCanvas && window.Chart) {
                // Destroy existing chart if it exists
                if (window.currentChart) {
                    window.currentChart.destroy();
                }

                window.currentChart = new Chart(chartCanvas, {
                    type: 'pie',
                    data: {
                        labels: statusData.map(item => item.status),
                        datasets: [{
                            data: statusData.map(item => item.count),
                            backgroundColor: [
                                '#FF6384',
                                '#36A2EB',
                                '#FFCE56',
                                '#4BC0C0',
                                '#9966FF',
                                '#FF9F40'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right'
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            showNotification('Error loading dashboard data', 'error');
        }
    }

    // Handle sidebar navigation
    document.addEventListener('DOMContentLoaded', function() {
        // Initial load of dashboard
        handleSectionDisplay('dashboard');

        document.querySelectorAll('.sidebar a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                
                // Remove active class from all links
                document.querySelectorAll('.sidebar a').forEach(l => {
                    l.parentElement.classList.remove('active');
                });
                
                // Add active class to clicked link
                e.currentTarget.parentElement.classList.add('active');

                // If the parent li has submenu, toggle it
                const parentLi = e.currentTarget.parentElement;
                if (parentLi.querySelector('.submenu')) {
                    parentLi.classList.toggle('open');
                }
                
                // Handle section display if section is specified
                if (section) {
                    handleSectionDisplay(section);
                }
            });
        });
    });

    // Section display handler
    function handleSectionDisplay(section) {
        const contentArea = document.querySelector('.content-area');
        
        switch(section) {
            case 'dashboard':
                contentArea.innerHTML = `
                    <div class="stats-cards">
                        <div class="card pink">
                            <div class="card-icon"></div>
                            <div class="card-info">
                                <h3>Total Branches</h3>
                                <p id="totalBranches">0</p>
                            </div>
                        </div>
                        <div class="card green">
                            <div class="card-icon"></div>
                            <div class="card-info">
                                <h3>Total Parcels</h3>
                                <p id="totalParcels">0</p>
                            </div>
                        </div>
                        <div class="card blue">
                            <div class="card-icon"></div>
                            <div class="card-info">
                                <h3>Total Staff</h3>
                                <p id="totalStaff">0</p>
                            </div>
                        </div>
                    </div>
                    <div class="charts-section">
                        <div class="status-table">
                            <h3>Daily Activities</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Sr No</th>
                                        <th>Status</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>
                                <tbody id="statusTableBody"></tbody>
                            </table>
                        </div>
                        <div class="chart-container">
                            <canvas></canvas>
                        </div>
                    </div>
                `;
                loadDashboardStats();
                break;

            case 'add-branch':
                contentArea.innerHTML = `
                    <div class="form-container">
                        <h2>Add New Branch</h2>
                        <form id="addBranchForm">
                            <div class="form-group">
                                <label>Country</label>
                                <input type="text" name="country" required>
                            </div>
                            <div class="form-group">
                                <label>County</label>
                                <input type="text" name="county" required>
                            </div>
                            <div class="form-group">
                                <label>Location</label>
                                <input type="text" name="location" required>
                            </div>
                            <div class="form-group">
                                <label>Building/Street</label>
                                <input type="text" name="street_building" required>
                            </div>
                            <div class="form-group">
                                <label>Zip Code</label>
                                <input type="text" name="postal_code">
                            </div>
                            <div class="form-group">
                                <label>Contacts</label>
                                <input type="text" name="contact">
                            </div>
                            <div class="button-group">
                                <button type="submit">Save</button>
                                <button type="button" class="cancel-btn" onclick="handleSectionDisplay('list-branch')">Cancel</button>
                            </div>
                        </form>
                    </div>
                `;

                // Add branch form handler
                document.getElementById('addBranchForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const branchData = Object.fromEntries(formData.entries());
                    
                    try {
                        const response = await fetch(`${API_BASE_URL}/admin/branch`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                            },
                            body: JSON.stringify(branchData)
                        });
                        
                        if (response.ok) {
                            showNotification('Branch added successfully', 'success');
                            handleSectionDisplay('list-branch');
                        } else {
                            const error = await response.json();
                            showNotification(error.message || 'Failed to add branch', 'error');
                        }
                    } catch (error) {
                        console.error('Error adding branch:', error);
                        showNotification('Error adding branch', 'error');
                    }
                });
                break;
                
            case 'list-branch':
                loadBranchList();
                break;

            case 'add-staff':
                (async () => {
                    try {
                        const response = await fetch(`${API_BASE_URL}/admin/branches`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                            }
                        });
                        
                        if (!response.ok) throw new Error('Failed to fetch branches');
                        const branches = await response.json();
                        
                        contentArea.innerHTML = `
                            <div class="form-container">
                                <h2>Add New Branch Staff</h2>
                                <form id="addStaffForm">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label>First Name</label>
                                            <input type="text" name="first_name" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Last Name</label>
                                            <input type="text" name="last_name" required>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="email" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Password</label>
                                        <input type="password" name="password" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Branch</label>
                                        <select name="branch_id" required>
                                            <option value="">Select Branch</option>
                                            ${branches.map(branch => `
                                                <option value="${branch.id}">
                                                    ${branch.country}, ${branch.county}, ${branch.location}, ${branch.street_building}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <div class="button-group">
                                        <button type="submit">Save</button>
                                        <button type="button" class="cancel-btn" onclick="handleSectionDisplay('list-staff')">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        `;

                        // Add form submission handler
                        document.getElementById('addStaffForm').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const staffData = Object.fromEntries(formData.entries());
                            
                            try {
                                const response = await fetch(`${API_BASE_URL}/admin/staff`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                                    },
                                    body: JSON.stringify(staffData)
                                });
                                
                                if (response.ok) {
                                    showNotification('Staff member added successfully', 'success');
                                    handleSectionDisplay('list-staff');
                                } else {
                                    const error = await response.json();
                                    showNotification(error.message || 'Failed to add staff member', 'error');
                                }
                            } catch (error) {
                                console.error('Error adding staff:', error);
                                showNotification('Error adding staff member', 'error');
                            }
                        });
                        
                    } catch (error) {
                        console.error('Error:', error);
                        contentArea.innerHTML = `
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                Error loading form. Please try again later.
                            </div>
                        `;
                    }
                })();
                break;
                
            case 'list-staff':
                loadStaffList();
                break;

            case 'parcels':
                loadParcelsList();
                break;

            case 'reports':
                loadReportsSection();
                break;
        }
    }

    // Load branch list function
    async function loadBranchList() {
        const contentArea = document.querySelector('.content-area');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/branches`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch branches');
            
            const branches = await response.json();
            
            contentArea.innerHTML = `
                <div class="table-container">
                    <div class="list-header">
                        <h2>Branch List</h2>
                        <button onclick="handleSectionDisplay('add-branch')" class="add-btn">
                            <i class="fas fa-plus"></i> Add New
                        </button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Branch Code</th>
                                <th>Country</th>
                                <th>County</th>
                                <th>Location</th>
                                <th>Building/Street</th>
                                <th>Zip Code</th>
                                <th>Contacts</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="branchTableBody">
                            ${branches.length === 0 ? 
                                '<tr><td colspan="7" class="text-center">No branches found</td></tr>' :
                                branches.map((branch, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${branch.branch_code}</td>
                                        <td>${branch.country}</td>
                                        <td>${branch.county || '-'}</td>
                                        <td>${branch.location || '-'}</td>
                                        <td>${branch.street_building}</td>
                                        <td>${branch.postal_code || '-'}</td>
                                        <td>${branch.contact || '-'}</td>
                                        <td>
                                            <button class="edit-btn" onclick="editBranch(${branch.id})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="delete-btn" onclick="deleteBranch(${branch.id})">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading branches:', error);
            contentArea.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Error loading branches. Please try again later.
                </div>
            `;
        }
    }

    
    // Staff management functions
    async function loadStaffList() {
        const contentArea = document.querySelector('.content-area');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/staff`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch staff list');
            
            const staffList = await response.json();
            
            contentArea.innerHTML = `
                <div class="table-container">
                    <div class="list-header">
                        <h2>Staff List</h2>
                        <button onclick="handleSectionDisplay('add-staff')" class="add-btn">
                            <i class="fas fa-plus"></i> Add New Staff
                        </button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Branch</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${staffList.length === 0 ? 
                                '<tr><td colspan="6" class="text-center">No staff members found</td></tr>' :
                                staffList.map((staff, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${staff.employee_id}</td>
                                        <td>${staff.first_name} ${staff.last_name}</td>
                                        <td>${staff.email}</td>
                                        <td>${staff.branch_name || 'Not Assigned'}</td>
                                        <td>
                                            <button class="edit-btn" onclick="editStaff(${staff.id})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="delete-btn" onclick="deleteStaff(${staff.id})">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading staff:', error);
            contentArea.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Error loading staff list. Please try again later.
                </div>
            `;
        }
    }

    

    // Parcels management functions
    async function loadParcelsList() {
        const contentArea = document.querySelector('.content-area');
        contentArea.innerHTML = `
            <div class="list-container">
                <div class="list-header">
                    <h2>Parcels List</h2>
                    <div class="search-section">
                        <div class="search-box">
                            <input type="text" id="searchParcel" placeholder="Search by tracking number...">
                            <button onclick="searchParcels()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="status-tabs">
                    <button class="tab-btn active" data-status="all">All</button>
                    <button class="tab-btn" data-status="Item Accepted by Courier">Item Accepted</button>
                    <button class="tab-btn" data-status="Collected">Collected</button>
                    <button class="tab-btn" data-status="Shipped">Shipped</button>
                    <button class="tab-btn" data-status="In-Transit">In Transit</button>
                    <button class="tab-btn" data-status="Out for Delivery">Out for Delivery</button>
                    <button class="tab-btn" data-status="Arrived At Destination">Arrived</button>
                </div>

                <table class="parcels-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tracking Number</th>
                            <th>Sender Name</th>
                            <th>Recipient Name</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="parcelsTableBody">
                        <tr>
                            <td colspan="7" class="text-center">Loading parcels...</td>
                        </tr>
                    </tbody>
                </table>
                <div class="pagination" id="parcelsPagination"></div>
            </div>
        `;

        // Add event listeners for status tabs
        document.querySelectorAll('.status-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.status-tabs .tab-btn').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                loadParcelsData(e.target.dataset.status);
            });
        });

        // Add event listener for search input
        document.getElementById('searchParcel').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchParcels();
            }
        });

        // Load initial parcels data
        loadParcelsData('all');
    }

    async function loadParcelsData(status = 'all', page = 1, search = '') {
        const tableBody = document.getElementById('parcelsTableBody');
        
        try {
            let url = `${API_BASE_URL}/admin/parcels?page=${page}`;
            if (status !== 'all') url += `&status=${encodeURIComponent(status)}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch parcels');
            
            const data = await response.json();
            
            if (data.parcels.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">No parcels found</td>
                    </tr>
                `;
                document.getElementById('parcelsPagination').innerHTML = '';
                return;
            }

            tableBody.innerHTML = data.parcels.map((parcel, index) => `
                <tr>
                    <td>${(page - 1) * 10 + index + 1}</td>
                    <td>${parcel.tracking_number}</td>
                    <td>${parcel.sender_name}</td>
                    <td>${parcel.recipient_name}</td>
                    <td>
                        <span class="status-badge ${getStatusClass(parcel.status)}">
                            ${parcel.status}
                        </span>
                    </td>
                    <td>${formatDateTime(parcel.created_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="view-btn" onclick="viewParcelDetails('${parcel.tracking_number}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="edit-btn" onclick="updateParcelStatus('${parcel.tracking_number}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Update pagination
            const totalPages = Math.ceil(data.total / 10);
            updatePagination(totalPages, page, status);
        } catch (error) {
            console.error('Error loading parcels:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-error">
                        Error loading parcels. Please try again.
                    </td>
                </tr>
            `;
        }
    }

    async function viewParcelDetails(trackingNumber) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/parcels/${trackingNumber}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch parcel details');
            
            const parcel = await response.json();
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'parcelDetailsModal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Parcel Details</h3>
                        <button class="close-btn" onclick="closeModal('parcelDetailsModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="details-section">
                            <h4>Tracking Information</h4>
                            <p><strong>Tracking Number:</strong> ${parcel.tracking_number}</p>
                            <p><strong>Status:</strong> 
                                <span class="status-badge ${getStatusClass(parcel.status)}">
                                    ${parcel.status}
                                </span>
                            </p>
                        </div>
                        <div class="details-section">
                            <h4>Sender Information</h4>
                            <p><strong>Name:</strong> ${parcel.sender_name}</p>
                            <p><strong>Address:</strong> ${parcel.sender_address}</p>
                            <p><strong>Contact:</strong> ${parcel.sender_phone || 'N/A'}</p>
                            <p><strong>Email:</strong> ${parcel.sender_email || 'N/A'}</p>
                        </div>
                        <div class="details-section">
                            <h4>Recipient Information</h4>
                            <p><strong>Name:</strong> ${parcel.recipient_name}</p>
                            <p><strong>Address:</strong> ${parcel.recipient_address}</p>
                            <p><strong>Contact:</strong> ${parcel.recipient_phone || 'N/A'}</p>
                            <p><strong>Email:</strong> ${parcel.recipient_email || 'N/A'}</p>
                        </div>
                        <div class="details-section">
                            <h4>Parcel Information</h4>
                            <p><strong>Weight:</strong> ${parcel.weight} kg</p>
                            <p><strong>Type:</strong> ${parcel.delicacy || 'N/A'}</p>
                            <p><strong>Size:</strong> ${parcel.size || 'N/A'}</p>
                            <p><strong>Price:</strong> $${parcel.price.toFixed(2)}</p>
                        </div>
                        <div class="details-section">
                            <h4>Tracking History</h4>
                            <div class="tracking-timeline">
                                ${generateTrackingTimeline(parcel.tracking_history)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listener to close modal on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal('parcelDetailsModal');
                }
            });
        } catch (error) {
            console.error('Error viewing parcel details:', error);
            showNotification('Error loading parcel details', 'error');
        }
    }

    async function updateParcelStatus(trackingNumber) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/parcels/${trackingNumber}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch parcel details');
            
            const parcel = await response.json();
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'updateStatusModal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Update Parcel Status</h3>
                        <button class="close-btn" onclick="closeModal('updateStatusModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="updateStatusForm">
                            <div class="form-group">
                                <label>Tracking Number</label>
                                <input type="text" value="${parcel.tracking_number}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Current Status</label>
                                <input type="text" value="${parcel.status}" readonly>
                            </div>
                            <div class="form-group">
                                <label>New Status</label>
                                <select name="status" required>
                                    <option value="">Select Status</option>
                                    <option value="Item Accepted by Courier">Item Accepted by Courier</option>
                                    <option value="Collected">Collected</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="In-Transit">In Transit</option>
                                    <option value="Out for Delivery">Out for Delivery</option>
                                    <option value="Arrived At Destination">Arrived At Destination</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Location</label>
                                <input type="text" name="location" required>
                            </div>
                            <div class="form-group">
                                <label>Comments</label>
                                <textarea name="comments" rows="3"></textarea>
                            </div>
                            <div class="button-group">
                                <button type="submit" class="save-btn">Update Status</button>
                                <button type="button" class="cancel-btn" onclick="closeModal('updateStatusModal')">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add form submission handler
            document.getElementById('updateStatusForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const statusData = Object.fromEntries(formData.entries());
                
                try {
                    const response = await fetch(`${API_BASE_URL}/admin/parcels/${trackingNumber}/status`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                        },
                        body: JSON.stringify(statusData)
                    });
                    
                    if (response.ok) {
                        showNotification('Status updated successfully', 'success');
                        closeModal('updateStatusModal');
                        loadParcelsData('all');
                    } else {
                        const error = await response.json();
                        showNotification(error.message || 'Failed to update status', 'error');
                    }
                } catch (error) {
                    console.error('Error updating status:', error);
                    showNotification('Error updating status', 'error');
                }
            });
            
            // Add event listener to close modal on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal('updateStatusModal');
                }
            });
        } catch (error) {
            console.error('Error loading parcel details:', error);
            showNotification('Error loading parcel details', 'error');
        }
    }

    // Reports Section
    function loadReportsSection() {
        const contentArea = document.querySelector('.content-area');
        
        // Create reports interface HTML
        contentArea.innerHTML = `
            <div class="reports-container">
                <div class="reports-header">
                    <h2>Generate Reports</h2>
                    <div class="report-filters">
                        <div class="filter-group">
                            <label>Report Type</label>
                            <select id="reportType" onchange="handleReportTypeChange()">
                                
                                <option value="staff">Staff Reports</option>
                                <option value="branches">Branch Reports</option>
                                <option value="parcels">Parcel Reports</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Date Range</label>
                            <div class="date-inputs">
                                <input type="date" id="startDate">
                                <span>to</span>
                                <input type="date" id="endDate">
                            </div>
                        </div>
                        <div class="filter-group" id="branchFilterContainer">
                            <label>Branch</label>
                            <select id="branchFilter">
                                <option value="">All Branches</option>
                            </select>
                        </div>
                        <div class="filter-group" id="statusFilterContainer" style="display: none;">
                            <label>Status</label>
                            <select id="statusFilter">
                                <option value="">All Statuses</option>
                                <option value="Item Accepted by Courier">Item Accepted</option>
                                <option value="Collected">Collected</option>
                                <option value="Shipped">Shipped</option>
                                <option value="In-Transit">In Transit</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Arrived At Destination">Arrived</option>
                            </select>
                        </div>
                    </div>
                    <div class="button-group">
                        <button class="generate-btn" onclick="generateReport()">
                            <i class="fas fa-sync-alt"></i> Generate Report
                        </button>
                        <button class="export-btn" onclick="exportReportToCSV()">
                            <i class="fas fa-download"></i> Export CSV
                        </button>
                    </div>
                </div>
                <div id="reportResults" class="report-results">
                    <!-- Results will be populated here -->
                </div>
            </div>
        `;
    
        // Set default dates (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('startDate').value = formatDate(firstDay);
        document.getElementById('endDate').value = formatDate(today);
    
        // Load branches for the filter
        loadBranchesForFilter();
    }
    
    async function loadBranchesForFilter() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/branches`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
    
            if (!response.ok) throw new Error('Failed to fetch branches');
            
            const branches = await response.json();
            const branchSelect = document.getElementById('branchFilter');
            
            branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.id;
                option.textContent = `${branch.street_building}, ${branch.county}`;
                branchSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading branches:', error);
            showNotification('Error loading branches', 'error');
        }
    }
    
    function handleReportTypeChange() {
        const reportType = document.getElementById('reportType').value;
        const statusFilterContainer = document.getElementById('statusFilterContainer');
        
        // Show status filter only for parcel reports
        statusFilterContainer.style.display = reportType === 'parcels' ? 'block' : 'none';
        
        // Clear previous results
        document.getElementById('reportResults').innerHTML = '';
    }
    
    async function generateReport() {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const branchId = document.getElementById('branchFilter').value;
        const status = document.getElementById('statusFilter').value;
    
        if (!startDate || !endDate) {
            showNotification('Please select both start and end dates', 'error');
            return;
        }
    
        const resultsContainer = document.getElementById('reportResults');
        resultsContainer.innerHTML = '<div class="loading">Generating report...</div>';
    
        try {
            const filters = {
                startDate,
                endDate,
                ...(branchId && { branchId }),
                ...(status && { status })
            };
    
            const response = await fetch(`${API_BASE_URL}/admin/reports/${reportType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(filters)
            });
    
            if (!response.ok) throw new Error('Failed to generate report');
            
            const data = await response.json();
            displayReportResults(reportType, data);
            
        } catch (error) {
            console.error('Error generating report:', error);
            resultsContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    Error generating report. Please try again.
                </div>
            `;
            showNotification('Error generating report', 'error');
        }
    }
    
    function displayReportResults(reportType, data) {
        const resultsContainer = document.getElementById('reportResults');

            // Ensure data.summary exists with default values
    const summary = {
        totalStaff: 0,
        avgParcelsPerStaff: 0,
        totalParcelsHandled: 0,
        successRate: 0,
        mostActiveStaff: null,
        ...data.summary // Spread actual values if they exist
    };
        
        // Create summary section
        let summaryHTML = '<div class="summary-section">';
        switch(reportType) {
            case 'staff':
                summaryHTML += `
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="card-label">Total Staff</div>
                            <div class="card-value">${summary.totalStaff}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Average Parcels per Staff</div>
                            <div class="card-value">${(summary.avgParcelsPerStaff || 0).toFixed(1)}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Total Parcels Handled</div>
                            <div class="card-value">${summary.totalParcelsHandled}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Average Success Rate</div>
                            <div class="card-value">${(summary.successRate || 0).toFixed(1)}%</div>
                        </div>
                    </div>
                    ${summary.mostActiveStaff ? `
                        <div class="most-active-staff">
                            <h4>Most Active Staff Member</h4>
                            <p>${summary.mostActiveStaff.name} - ${summary.mostActiveStaff.parcels} parcels</p>
                        </div>
                    ` : ''}
                `;
                break;
            case 'parcels':
                summaryHTML += `
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="card-label">Total Parcels</div>
                            <div class="card-value">${data.summary.totalParcels}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Success Rate</div>
                            <div class="card-value">${data.summary.successRate?.toFixed(1)}%</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Avg Delivery Time</div>
                            <div class="card-value">${data.summary.avgDeliveryTime?.toFixed(1)} days</div>
                        </div>
                    </div>
                `;
                break;
            case 'branches':
                summaryHTML += `
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="card-label">Total Branches</div>
                            <div class="card-value">${data.summary.totalBranches}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Total Revenue</div>
                            <div class="card-value">$${data.summary.totalRevenue?.toLocaleString()}</div>
                        </div>
                        <div class="summary-card">
                            <div class="card-label">Avg Staff/Branch</div>
                            <div class="card-value">${data.summary.avgStaffPerBranch?.toFixed(1)}</div>
                        </div>
                    </div>
                `;
                break;
        }
        summaryHTML += '</div>';
    
        // Create detailed results table
        let tableHTML = `
            <div class="results-table">
                <table>
                    <thead>
                        <tr>
        `;
    
        // Add appropriate headers based on report type
        switch(reportType) {
            case 'staff':
                tableHTML += `
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Branch</th>
                    <th>Parcels Handled</th>
                    <th>Success Rate</th>
                    <th>Join Date</th>
                `;
                break;
            case 'parcels':
                tableHTML += `
                    <th>Tracking #</th>
                    <th>Status</th>
                    <th>Sender</th>
                    <th>Recipient</th>
                    <th>Created Date</th>
                    <th>Branch</th>
                `;
                break;
            case 'branches':
                tableHTML += `
                    <th>Branch Code</th>
                    <th>Location</th>
                    <th>Staff Count</th>
                    <th>Parcel Count</th>
                    <th>Status</th>
                `;
                break;
        }
    
        tableHTML += `
                        </tr>
                    </thead>
                    <tbody>
        `;
    
        // Add table rows
        if (data.details && Array.isArray(data.details)) {
            data.details.forEach(item => {
                switch(reportType) {
                    case 'staff':
                        tableHTML += `
                            <tr>
                                <td>${item.employee_id || '-'}</td>
                                <td>${item.staff_name || '-'}</td>
                                <td>${item.email || '-'}</td>
                                <td>${item.branch_name || '-'}</td>
                                <td>${item.parcels_handled || 0}</td>
                                <td>${(item.success_rate || 0).toFixed(1)}%</td>
                                <td>${item.join_date ? formatDateTime(item.join_date) : '-'}</td>
                            </tr>
                        `;
                        break;
                case 'parcels':
                    tableHTML += `
                        <tr>
                            <td>${item.tracking_number}</td>
                            <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
                            <td>${item.sender_name}</td>
                            <td>${item.recipient_name}</td>
                            <td>${formatDateTime(item.created_at)}</td>
                            <td>${item.branch_name || '-'}</td>
                        </tr>
                    `;
                    break;
                case 'branches':
                    tableHTML += `
                        <tr>
                            <td>${item.branch_code}</td>
                            <td>${item.location}</td>
                            <td>${item.staff_count}</td>
                            <td>${item.parcel_count}</td>
                            <td>${item.status}</td>
                        </tr>
                    `;
                    break;
                }
            });
        } else {
            tableHTML += `
                <tr>
                    <td colspan="7" class="text-center">No data available</td>
                </tr>
            `;
        }
    
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
    
        // Combine all sections and add to container
        resultsContainer.innerHTML = summaryHTML + tableHTML;
    
        // If Chart.js is available, create a chart
        if (window.Chart && data.chartData) {
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-section';
            chartContainer.innerHTML = '<canvas id="reportChart"></canvas>';
            resultsContainer.insertBefore(chartContainer, resultsContainer.firstChild.nextSibling);
    
            const ctx = document.getElementById('reportChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: data.chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Parcels'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: 'Staff Performance Overview'
                        }
                    }
                }
            });
        }
    }
    
    async function exportReportToCSV() {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const branchId = document.getElementById('branchFilter').value;
        const status = document.getElementById('statusFilter').value;
    
        if (!startDate || !endDate) {
            showNotification('Please select both start and end dates', 'error');
            return;
        }
    
        try {
            const filters = {
                startDate,
                endDate,
                ...(branchId && { branchId }),
                ...(status && { status }),
                format: 'csv'
            };
    
            const response = await fetch(`${API_BASE_URL}/admin/reports/${reportType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(filters)
            });
    
            if (!response.ok) throw new Error('Failed to generate CSV');
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}_report_${startDate}_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
    
            showNotification('Report exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            showNotification('Error exporting report', 'error');
        }
    }
   
    // Generate tracking timeline
    function generateTrackingTimeline(history) {
        if (!history || history.length === 0) {
            return '<p class="no-history">No tracking history available</p>';
        }

        return history.map(item => `
            <div class="timeline-item">
                <div class="timeline-marker ${getStatusClass(item.status)}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="status-badge ${getStatusClass(item.status)}">
                            ${item.status}
                        </span>
                        <span class="timeline-date">
                            ${formatDateTime(item.timestamp)}
                        </span>
                    </div>
                    <p class="timeline-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${item.location || 'Location not specified'}
                    </p>
                    ${item.description ? `
                        <p class="timeline-description">${item.description}</p>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    function getReportFilters(reportType) {
        const filters = {};
        
        // Get values from filter elements
        const branchFilter = document.getElementById('branchFilter');
        const statusFilter = document.getElementById('statusFilter');
    
        // Add branch filter if selected
        if (branchFilter?.value) {
            filters.branchId = branchFilter.value;
        }
    
        // Add status filter only for parcel reports if selected
        if (reportType === 'parcels' && statusFilter?.value) {
            filters.status = statusFilter.value;
        }
    
        // For specific report types, add additional filters
        switch(reportType) {
            case 'staff':
                // Add any staff-specific filters
                break;
    
            case 'branches':
                // Add any branch-specific filters
                const regionFilter = document.getElementById('regionFilter');
                if (regionFilter?.value) {
                    filters.region = regionFilter.value;
                }
                break;
    
            case 'parcels':
                // Add any parcel-specific filters
                break;
        }
    
        return filters;
    }

    // Update pagination
    function updatePagination(totalPages, currentPage) {
        const pagination = document.getElementById('parcelsPagination');
        let paginationHtml = '';
        
        if (totalPages > 1) {
            paginationHtml += `
                <button ${currentPage === 1 ? 'disabled' : ''} 
                        onclick="loadParcelsData('all', ${currentPage - 1})">
                    Previous
                </button>
            `;
            
            for (let i = 1; i <= totalPages; i++) {
                paginationHtml += `
                    <button class="${i === currentPage ? 'active' : ''}"
                            onclick="loadParcelsData('all', ${i})">
                        ${i}
                    </button>
                `;
            }
            
            paginationHtml += `
                <button ${currentPage === totalPages ? 'disabled' : ''} 
                        onclick="loadParcelsData('all', ${currentPage + 1})">
                    Next
                </button>
            `;
        }
        
        pagination.innerHTML = paginationHtml;
    }

    // Add this near the top of the file with other utility functions
    function handleLogout() {
        // Clear admin token
        localStorage.removeItem('adminToken');
        // Redirect to login page
        window.location.href = 'index.html';
        showNotification('Logged out successfully', 'success');
    }
}
function calculateStaffSummary(staffData) {
    const summary = {
        totalStaff: staffData.length,
        totalParcelsHandled: 0,
        avgParcelsPerStaff: 0,
        successRate: 0,
        mostActiveStaff: null
    };

    if (staffData.length > 0) {
        // Calculate total parcels and find most active staff
        let maxParcels = 0;
        let totalSuccessRate = 0;
        
        staffData.forEach(staff => {
            const parcelsHandled = parseInt(staff.parcels_handled) || 0;
            summary.totalParcelsHandled += parcelsHandled;
            
            // Track most active staff
            if (parcelsHandled > maxParcels) {
                maxParcels = parcelsHandled;
                summary.mostActiveStaff = {
                    name: staff.staff_name,
                    parcels: parcelsHandled
                };
            }
            
            // Add to total success rate
            totalSuccessRate += parseFloat(staff.success_rate) || 0;
        });

        // Calculate averages
        summary.avgParcelsPerStaff = summary.totalParcelsHandled / summary.totalStaff;
        summary.successRate = totalSuccessRate / summary.totalStaff;
    }

    return summary;
}

