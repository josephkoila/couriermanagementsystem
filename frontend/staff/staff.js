// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';


// Global function declarations
window.searchParcelForUpdate = async function(trackingNumber) {
    // If no tracking number is provided, get it from the input field
    if (!trackingNumber) {
        trackingNumber = document.getElementById('trackingSearchInput').value.trim();
    }
    
    const updateForm = document.getElementById('parcelUpdateForm');
    
    if (!trackingNumber) {
        showNotification('Please enter a tracking number', 'error');
        return;
    }

    try {
        // Change to the update status section if we're not already there
        const contentArea = document.querySelector('.content-area');
        if (!contentArea.querySelector('.status-update-container')) {
            loadStatusUpdateSection();
            updateForm = document.getElementById('parcelUpdateForm');
        }

        updateForm.style.display = 'block';
        updateForm.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                Searching for parcel...
            </div>
        `;

        const response = await fetch(`${API_BASE_URL}/track/${trackingNumber}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Parcel not found');

        const parcel = await response.json();
        updateForm.innerHTML = generateUpdateForm(parcel);
        
        // Set the tracking number in the search input
        const searchInput = document.getElementById('trackingSearchInput');
        if (searchInput) {
            searchInput.value = trackingNumber;
        }
        
    } catch (error) {
        console.error('Error fetching parcel:', error);
        updateForm.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                No parcel found with this tracking number. Please check and try again.
            </div>
        `;
    }
};

window.handleSearchKeyPress = function(event) {
    if (event.key === 'Enter') {
        searchParcelForUpdate();
    }
};

window.updateParcelStatus = async function(event, trackingNumber) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const updateData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE_URL}/staff/parcels/${trackingNumber}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({
                status: updateData.status,
                location: updateData.location,
                comments: updateData.comments
            })
        });

        if (!response.ok) throw new Error('Failed to update status');

        // Send notification to customer
        await sendStatusUpdateNotification(trackingNumber, updateData.status);
        
        showNotification('Status updated successfully', 'success');
        searchParcelForUpdate(); // Refresh the form with updated data
        
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating parcel status', 'error');
    }
};

window.clearUpdateForm = function() {
    document.getElementById('parcelUpdateForm').style.display = 'none';
    document.getElementById('trackingSearchInput').value = '';
};

// Helper functions
function generateUpdateForm(parcel) {
    return `
        <div class="parcel-info-card">
            <div class="card-header">
                <h3>Parcel Information</h3>
                <span class="status-badge status-${parcel.status.toLowerCase()}">
                    ${parcel.status}
                </span>
            </div>
            
            <div class="info-grid">
                <div class="info-group">
                    <label>Tracking Number</label>
                    <p>${parcel.tracking_number}</p>
                </div>
                <div class="info-group">
                    <label>Sender</label>
                    <p>${parcel.sender_name}</p>
                </div>
                <div class="info-group">
                    <label>Recipient</label>
                    <p>${parcel.recipient_name}</p>
                </div>
                <div class="info-group">
                    <label>Destination</label>
                    <p>${parcel.recipient_address}</p>
                </div>
            </div>
        </div>

        <div class="status-update-form">
            <h3>Update Status</h3>
            <form id="updateStatusForm" onsubmit="updateParcelStatus(event, '${parcel.tracking_number}')">
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
                        <option value="Delivered">Delivered</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" required 
                           placeholder="Enter current location">
                </div>
                
                <div class="form-group">
                    <label>Comments</label>
                    <textarea name="comments" rows="3" 
                            placeholder="Add any additional comments..."></textarea>
                </div>

                <div class="form-actions">
                    <button type="submit" class="update-btn">
                        <i class="fas fa-sync-alt"></i>
                        Update Status
                    </button>
                    <button type="button" class="cancel-btn" onclick="clearUpdateForm()">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                </div>
            </form>
        </div>

        <div class="status-history">
            <h3>Status History</h3>
            <div class="timeline">
                ${generateStatusTimeline(parcel.status_history)}
            </div>
        </div>
    `;
}

function generateStatusTimeline(history) {
    if (!history || history.length === 0) {
        return '<p class="no-history">No status updates yet.</p>';
    }

    return history.map(item => `
        <div class="timeline-item">
            <div class="timeline-marker ${item.status.toLowerCase()}"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="status-badge status-${item.status.toLowerCase()}">
                        ${item.status}
                    </span>
                    <span class="timeline-date">
                        ${formatDateTime(item.timestamp)}
                    </span>
                </div>
                <p class="timeline-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${item.location}
                </p>
                ${item.comments ? `
                    <p class="timeline-comments">${item.comments}</p>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize the dashboard functionality when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!localStorage.getItem('staffToken')) {
        window.location.href = 'staff-login.html';
        return;
    }

    // Make functions globally accessible
window.viewParcelDetails = async function(trackingNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/track/${trackingNumber}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch parcel details');
        
        const parcel = await response.json();
        
        // Create and show modal
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>Parcel Details</h2>
                        <button class="close-btn" onclick="closeModal()">×</button>
                    </div>
                    <div class="modal-content">
                        <div class="info-section">
                            <h3>Tracking Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Tracking Number:</label>
                                    <p>${parcel.tracking_number}</p>
                                </div>
                                <div class="info-item">
                                    <label>Current Status:</label>
                                    <p><span class="status-badge status-${parcel.status.toLowerCase()}">${parcel.status}</span></p>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>Sender Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Name:</label>
                                    <p>${parcel.sender_name}</p>
                                </div>
                                <div class="info-item">
                                    <label>Phone:</label>
                                    <p>${parcel.sender_phone || 'N/A'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Email:</label>
                                    <p>${parcel.sender_email || 'N/A'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Address:</label>
                                    <p>${parcel.sender_address}</p>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>Recipient Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Name:</label>
                                    <p>${parcel.recipient_name}</p>
                                </div>
                                <div class="info-item">
                                    <label>Phone:</label>
                                    <p>${parcel.recipient_phone || 'N/A'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Email:</label>
                                    <p>${parcel.recipient_email || 'N/A'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Address:</label>
                                    <p>${parcel.recipient_address}</p>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>Parcel Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Weight:</label>
                                    <p>${parcel.weight} kg</p>
                                </div>
                                <div class="info-item">
                                    <label>Delicacy:</label>
                                    <p>${parcel.delicacy}</p>
                                </div>
                                <div class="info-item">
                                    <label>Size:</label>
                                    <p>${parcel.size}</p>
                                </div>
                                <div class="info-item">
                                    <label>Price:</label>
                                    <p>$${parcel.price}</p>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>Tracking History</h3>
                            <div class="timeline">
                                ${generateStatusTimeline(parcel.status_history || [])}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (error) {
        console.error('Error loading parcel details:', error);
        showNotification('Error loading parcel details', 'error');
    }
};

window.editParcelDetails = async function(trackingNumber) {
    try {
        const parcelResponse = await fetch(`${API_BASE_URL}/track/${trackingNumber}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!parcelResponse.ok) throw new Error('Failed to fetch parcel details');
        
        const parcel = await parcelResponse.json();
        
        // Create and show edit modal
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>Edit Parcel Details</h2>
                        <button class="close-btn" onclick="closeModal()">×</button>
                    </div>
                    <div class="modal-content">
                        <form id="editParcelForm" onsubmit="updateParcelDetails(event, '${trackingNumber}')">
                            <div class="form-section">
                                <h3>Sender Information</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Name</label>
                                        <input type="text" name="sender_name" value="${parcel.sender_name}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Phone</label>
                                        <input type="tel" name="sender_phone" value="${parcel.sender_phone || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="sender_email" value="${parcel.sender_email || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Address</label>
                                        <textarea name="sender_address" required>${parcel.sender_address}</textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h3>Recipient Information</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Name</label>
                                        <input type="text" name="recipient_name" value="${parcel.recipient_name}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Phone</label>
                                        <input type="tel" name="recipient_phone" value="${parcel.recipient_phone || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="recipient_email" value="${parcel.recipient_email || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Address</label>
                                        <textarea name="recipient_address" required>${parcel.recipient_address}</textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h3>Parcel Information</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Weight (kg)</label>
                                        <input type="number" step="0.01" name="weight" value="${parcel.weight}" required onchange="updatePrice()">
                                    </div>
                                    <div class="form-group">
                                        <label>Delicacy</label>
                                        <select name="delicacy" required>
                                            <option value="fragile" ${parcel.delicacy === 'fragile' ? 'selected' : ''}>Fragile</option>
                                            <option value="non-fragile" ${parcel.delicacy === 'non-fragile' ? 'selected' : ''}>Non-Fragile</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Size</label>
                                        <select name="size" required onchange="updatePrice()">
                                            <option value="small" ${parcel.size === 'small' ? 'selected' : ''}>Small</option>
                                            <option value="medium" ${parcel.size === 'medium' ? 'selected' : ''}>Medium</option>
                                            <option value="large" ${parcel.size === 'large' ? 'selected' : ''}>Large</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Price ($)</label>
                                        <input type="number" step="0.01" name="price" value="${parcel.price}" readonly>
                                    </div>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="save-btn">
                                    <i class="fas fa-save"></i> Save Changes
                                </button>
                                <button type="button" class="cancel-btn" onclick="closeModal()">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (error) {
        console.error('Error loading parcel details:', error);
        showNotification('Error loading parcel details', 'error');
    }
};

// Also make updateParcelDetails globally accessible
window.updateParcelDetails = async function(event, trackingNumber) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const parcelData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE_URL}/staff/parcels/${trackingNumber}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify(parcelData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update parcel');
        }

        showNotification('Parcel updated successfully', 'success');
        closeModal();
        // Refresh the parcels list
        loadParcelsList();
        
    } catch (error) {
        console.error('Error updating parcel:', error);
        showNotification(error.message || 'Error updating parcel', 'error');
    }
};

// Make closeModal globally accessible
window.closeModal = function() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
};
});

// Check if we're on the login page
if (document.getElementById('staffLoginForm')) {
    // Login Page Logic
    document.getElementById('staffLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        
        try {
            const response = await fetch(`${API_BASE_URL}/staff/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('staffToken', data.token);
                localStorage.setItem('staffData', JSON.stringify(data.staff));
                window.location.href = 'staff-dashboard.html';
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
    if (!localStorage.getItem('staffToken')) {
        window.location.href = 'staff-login.html';
    }

    // Load staff data
    const staffData = JSON.parse(localStorage.getItem('staffData') || '{}');
    if (staffData.name) {
        document.getElementById('staffName').textContent = staffData.name;
    }

    // Handle sidebar navigation
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
            
            // Handle section display
            handleSectionDisplay(section);
        });
    });

    // Section display handler
    function handleSectionDisplay(section) {
        const contentArea = document.querySelector('.content-area');
        
        switch(section) {
            case 'add-parcel':
                loadAddParcelForm();
                break;
            case 'list-parcels':
                loadParcelsList();
                break;
            case 'update-status':
                loadStatusUpdateSection();
                break;
            default:
                if (section.includes('-')) {
                    loadParcelsList(section);
                }
        }
    }

    // Load add parcel form
    async function loadAddParcelForm() {
        const contentArea = document.querySelector('.content-area');
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/branches`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch branches');
            
            const branches = await response.json();
            
            contentArea.innerHTML = `
                <div class="form-container">
                    <h2>Add New Parcel</h2>
                    <form id="addParcelForm">
                        <!-- Sender Information -->
                        <div class="form-section">
                            <h3>Sender Information</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Name</label>
                                    <input type="text" name="sender_name" required>
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" name="sender_email" required>
                                </div>
                                <div class="form-group">
                                    <label>Phone Number</label>
                                    <input type="tel" name="sender_phone" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <textarea name="sender_address" required></textarea>
                            </div>
                        </div>

                        <!-- Recipient Information -->
                        <div class="form-section">
                            <h3>Recipient Information</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Name</label>
                                    <input type="text" name="recipient_name" required>
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" name="recipient_email" required>
                                </div>
                                <div class="form-group">
                                    <label>Phone Number</label>
                                    <input type="tel" name="recipient_phone" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <textarea name="recipient_address" required></textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Branch Processed</label>
                                    <select name="pickup_branch" required>
                                        <option value="">Select Branch</option>
                                        ${branches.map(branch => `
                                            <option value="${branch.id}">
                                                ${branch.country}, ${branch.county}, ${branch.location}, ${branch.street_building}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Delivery Branch</label>
                                    <select name="delivery_branch" required>
                                        <option value="">Select Branch</option>
                                        ${branches.map(branch => `
                                            <option value="${branch.id}">
                                                ${branch.country}, ${branch.county}, ${branch.location}, ${branch.street_building}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Parcel Information -->
                        <div class="form-section">
                            <h3>Parcel Information</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Weight (kg)</label>
                                    <input type="number" step="0.01" name="weight" required onchange="updatePrice()">
                                </div>
                                <div class="form-group">
                                    <label>Delicacy</label>
                                    <select name="delicacy" required>
                                        <option value="">Select Type</option>
                                        <option value="fragile">Fragile</option>
                                        <option value="non-fragile">Non-Fragile</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Size</label>
                                    <select name="size" required onchange="updatePrice()">
                                        <option value="">Select Size</option>
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Price ($)</label>
                                    <input type="number" step="0.01" name="price" readonly>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Tracking Number</label>
                                <input type="text" name="tracking_number" value="${generateTrackingNumber()}" readonly>
                            </div>
                        </div>

                        <div class="button-group">
                            <button type="submit" class="save-btn">Save Parcel</button>
                            <button type="button" class="cancel-btn" onclick="handleSectionDisplay('list-parcels')">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            `;

            // Add form submission handler
            document.getElementById('addParcelForm').addEventListener('submit', handleParcelSubmission);
            
        } catch (error) {
            console.error('Error loading form:', error);
            showNotification('Error loading form', 'error');
        }
    }

    // Handle parcel form submission
    async function handleParcelSubmission(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Create parcel data object with correct field names
        const parcelData = {
            sender_name: formData.get('sender_name'),
            sender_address: formData.get('sender_address'),
            sender_email: formData.get('sender_email'),
            sender_phone: formData.get('sender_phone'),
            recipient_name: formData.get('recipient_name'),
            recipient_address: formData.get('recipient_address'),
            recipient_email: formData.get('recipient_email'),
            recipient_phone: formData.get('recipient_phone'),
            weight: formData.get('weight'),
            delicacy: formData.get('delicacy'),
            size: formData.get('size'),
            price: formData.get('price'),
            // Convert branch selections to integers
            pickup_branch_id: parseInt(formData.get('pickup_branch'), 10),
            delivery_branch_id: parseInt(formData.get('delivery_branch'), 10)
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/staff/parcels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
                },
                body: JSON.stringify(parcelData)
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save parcel');
            }
    
            const result = await response.json();
            
            // Send email notifications
            await sendParcelNotifications({
                ...parcelData,
                tracking_number: result.tracking_number
            });
            
            showNotification('Parcel added successfully', 'success');
            handleSectionDisplay('list-parcels');
        } catch (error) {
            console.error('Error saving parcel:', error);
            showNotification(error.message || 'Error saving parcel', 'error');
        }
    }
    // Send email notifications
    async function sendParcelNotifications(parcelData) {
        try {
            await fetch(`${API_BASE_URL}/notifications/parcel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
                },
                body: JSON.stringify({
                    senderEmail: parcelData.sender_email,
                    recipientEmail: parcelData.recipient_email,
                    trackingNumber: parcelData.tracking_number,
                    parcelInfo: {
                        sender: parcelData.sender_name,
                        recipient: parcelData.recipient_name,
                        weight: parcelData.weight,
                        delicacy: parcelData.delicacy,
                        size: parcelData.size,
                        pickup_branch: parcelData.pickup_branch
                    }
                })
            });
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    }

    // Load parcels list
    async function loadParcelsList(status = null) {
        const contentArea = document.querySelector('.content-area');
        
        contentArea.innerHTML = `
            <div class="table-container">
                <div class="list-header">
                    <h2>${status ? capitalizeStatus(status) : 'All'} Parcels</h2>
                    <div class="search-box">
                        <input type="text" id="searchParcel" placeholder="Enter tracking number...">
                        <button onclick="searchParcel()">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Tracking Number</th>
                            <th>Sender</th>
                            <th>Recipient</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="parcelsTableBody">
                        <tr>
                            <td colspan="5" class="text-center">Loading parcels...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    
        try {
            let url = `${API_BASE_URL}/staff/parcels`;
            if (status) url += `?status=${status}`;
    
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
                }
            });
    
            if (!response.ok) throw new Error('Failed to fetch parcels');
            
            const parcels = await response.json();
            
            const tableBody = document.getElementById('parcelsTableBody');
            
            if (parcels.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No parcels found</td>
                    </tr>
                `;
                return;
            }
    
            tableBody.innerHTML = parcels.map(parcel => `
                <tr>
                    <td>${parcel.tracking_number}</td>
                    <td>${parcel.sender_name}</td>
                    <td>${parcel.recipient_name}</td>
                    <td>
                        <span class="status-badge status-${parcel.status.toLowerCase()}">
                            ${parcel.status}
                        </span>
                    </td>
                    <td>
                        <button class="view-btn" onclick="viewParcelDetails('${parcel.tracking_number}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="edit-btn" onclick="editParcelDetails('${parcel.tracking_number}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </td>
                </tr>
            `).join('');
    
            // Add button styles if not already present
            if (!document.getElementById('actionButtonStyles')) {
                const styles = document.createElement('style');
                styles.id = 'actionButtonStyles';
                styles.textContent = `
                    .view-btn, .edit-btn {
                        padding: 6px 12px;
                        margin: 0 4px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                    }
    
                    .view-btn {
                        background-color: #4CAF50;
                        color: white;
                    }
    
                    .view-btn:hover {
                        background-color: #45a049;
                    }
    
                    .edit-btn {
                        background-color: #2196F3;
                        color: white;
                    }
    
                    .edit-btn:hover {
                        background-color: #1976D2;
                    }
    
                    .view-btn i, .edit-btn i {
                        font-size: 14px;
                    }
                `;
                document.head.appendChild(styles);
            }
    
        } catch (error) {
            console.error('Error loading parcels:', error);
            document.getElementById('parcelsTableBody').innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Error loading parcels</td>
                </tr>
            `;
        }
    }

    // Load status update section
    function loadStatusUpdateSection() {
        const contentArea = document.querySelector('.content-area');
        contentArea.innerHTML = `
            <div class="status-update-container">
                <div class="search-section">
                    <h2>Update Parcel Status</h2>
                    <div class="search-box">
                        <input type="text" 
                               id="trackingSearchInput" 
                               placeholder="Enter tracking number"
                               onkeypress="handleSearchKeyPress(event)">
                        <button onclick="searchParcelForUpdate()">
                            <i class="fas fa-search"></i>
                            Search
                        </button>
                    </div>
                </div>

                <div id="parcelUpdateForm" class="update-form" style="display: none;">
                    <!-- Form will be populated when a parcel is found -->
                </div>
            </div>
        `;
    }

   

    // Generate update form
    function generateUpdateForm(parcel) {
        return `
            <div class="parcel-info-card">
                <div class="card-header">
                    <h3>Parcel Information</h3>
                    <span class="status-badge status-${parcel.status.toLowerCase()}">
                        ${parcel.status}
                    </span>
                </div>
                
                <div class="info-grid">
                    <div class="info-group">
                        <label>Tracking Number</label>
                        <p>${parcel.tracking_number}</p>
                    </div>
                    <div class="info-group">
                        <label>Sender</label>
                        <p>${parcel.sender_name}</p>
                    </div>
                    <div class="info-group">
                        <label>Recipient</label>
                        <p>${parcel.recipient_name}</p>
                    </div>
                    <div class="info-group">
                        <label>Destination</label>
                        <p>${parcel.recipient_address}</p>
                    </div>
                </div>
            </div>

            <div class="status-update-form">
                <h3>Update Status</h3>
                <form id="updateStatusForm" onsubmit="updateParcelStatus(event, '${parcel.tracking_number}')">
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
                            <option value="Delivered">Delivered</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" name="location" required 
                               placeholder="Enter current location">
                    </div>
                    
                    <div class="form-group">
                        <label>Comments</label>
                        <textarea name="comments" rows="3" 
                                placeholder="Add any additional comments..."></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="update-btn">
                            <i class="fas fa-sync-alt"></i>
                            Update Status
                        </button>
                        <button type="button" class="cancel-btn" onclick="clearUpdateForm()">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            <div class="status-history">
                <h3>Status History</h3>
                <div class="timeline">
                    ${generateStatusTimeline(parcel.status_history)}
                </div>
            </div>
        `;
    }

   

    // Send status update notification
    async function sendStatusUpdateNotification(trackingNumber, status) {
        try {
            await fetch(`${API_BASE_URL}/notifications/status-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
                },
                body: JSON.stringify({
                    trackingNumber,
                    status
                })
            });
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

   
    // Helper Functions
    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function handleSearchKeyPress(event) {
        if (event.key === 'Enter') {
            searchParcelForUpdate();
        }
    }

    function clearUpdateForm() {
        document.getElementById('parcelUpdateForm').style.display = 'none';
        document.getElementById('trackingSearchInput').value = '';
    }

    function generateTrackingNumber() {
        const prefix = 'DX';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }

    function capitalizeStatus(status) {
        return status.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function updatePrice() {
        const sizeSelect = document.querySelector('select[name="size"]');
        const priceInput = document.querySelector('input[name="price"]');
        const weightInput = document.querySelector('input[name="weight"]');
        
        const basePrice = {
            small: 10,
            medium: 20,
            large: 30
        };
        
        const size = sizeSelect.value;
        const weight = parseFloat(weightInput.value) || 0;
        
        if (size && weight) {
            const price = basePrice[size] + (weight * 2);
            priceInput.value = price.toFixed(2);
        }
    }

    // Notification function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Search function for parcel list
    function searchParcel() {
        const searchInput = document.getElementById('searchParcel');
        const searchTerm = searchInput.value.trim();
        
        if (searchTerm) {
            loadParcelsList(null, searchTerm);
        }
    }

    // View parcel details
    async function viewParcelDetails(trackingNumber) {
        try {
            const response = await fetch(`${API_BASE_URL}/track/${trackingNumber}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch parcel details');
            
            const parcel = await response.json();
            
            // Create and show modal
            const modalHtml = `
                <div class="modal-overlay">
                    <div class="modal">
                        <div class="modal-header">
                            <h2>Parcel Details</h2>
                            <button class="close-btn" onclick="closeModal()">×</button>
                        </div>
                        <div class="modal-content">
                            <div class="info-section">
                                <h3>Tracking Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Tracking Number:</label>
                                        <p>${parcel.tracking_number}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Current Status:</label>
                                        <p><span class="status-badge status-${parcel.status.toLowerCase()}">${parcel.status}</span></p>
                                    </div>
                                </div>
                            </div>
    
                            <div class="info-section">
                                <h3>Sender Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Name:</label>
                                        <p>${parcel.sender_name}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Phone:</label>
                                        <p>${parcel.sender_phone || 'N/A'}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Email:</label>
                                        <p>${parcel.sender_email || 'N/A'}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Address:</label>
                                        <p>${parcel.sender_address}</p>
                                    </div>
                                </div>
                            </div>
    
                            <div class="info-section">
                                <h3>Recipient Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Name:</label>
                                        <p>${parcel.recipient_name}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Phone:</label>
                                        <p>${parcel.recipient_phone || 'N/A'}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Email:</label>
                                        <p>${parcel.recipient_email || 'N/A'}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Address:</label>
                                        <p>${parcel.recipient_address}</p>
                                    </div>
                                </div>
                            </div>
    
                            <div class="info-section">
                                <h3>Parcel Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Weight:</label>
                                        <p>${parcel.weight} kg</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Delicacy:</label>
                                        <p>${parcel.delicacy}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Size:</label>
                                        <p>${parcel.size}</p>
                                    </div>
                                    <div class="info-item">
                                        <label>Price:</label>
                                        <p>$${parcel.price}</p>
                                    </div>
                                </div>
                            </div>
    
                            <div class="info-section">
                                <h3>Tracking History</h3>
                                <div class="timeline">
                                    ${generateTrackingTimeline(parcel.tracking_history)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
        } catch (error) {
            console.error('Error loading parcel details:', error);
            showNotification('Error loading parcel details', 'error');
        }
    }

    // Close modal function
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    }

    // Edit Parcel Details
async function editParcelDetails(trackingNumber) {
    try {
        // Fetch branches for the dropdown
        const branchesResponse = await fetch(`${API_BASE_URL}/admin/branches`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        const branches = await branchesResponse.json();
        
        // Fetch parcel details
        const parcelResponse = await fetch(`${API_BASE_URL}/track/${trackingNumber}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!parcelResponse.ok) throw new Error('Failed to fetch parcel details');
        
        const parcel = await parcelResponse.json();
        
        // Create and show edit modal
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>Edit Parcel Details</h2>
                        <button class="close-btn" onclick="closeModal()">×</button>
                    </div>
                    <div class="modal-content">
                        <form id="editParcelForm" onsubmit="updateParcelDetails(event, '${trackingNumber}')">
                            <div class="form-section">
                                <h3>Sender Information</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Name</label>
                                        <input type="text" name="sender_name" value="${parcel.sender_name}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Phone</label>
                                        <input type="tel" name="sender_phone" value="${parcel.sender_phone || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="sender_email" value="${parcel.sender_email || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Address</label>
                                        <textarea name="sender_address" required>${parcel.sender_address}</textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h3>Recipient Information</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Name</label>
                                        <input type="text" name="recipient_name" value="${parcel.recipient_name}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Phone</label>
                                        <input type="tel" name="recipient_phone" value="${parcel.recipient_phone || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="recipient_email" value="${parcel.recipient_email || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Address</label>
                                        <textarea name="recipient_address" required>${parcel.recipient_address}</textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h3>Parcel Information</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Weight (kg)</label>
                                        <input type="number" step="0.01" name="weight" value="${parcel.weight}" required onchange="updatePrice()">
                                    </div>
                                    <div class="form-group">
                                        <label>Delicacy</label>
                                        <select name="delicacy" required>
                                            <option value="fragile" ${parcel.delicacy === 'fragile' ? 'selected' : ''}>Fragile</option>
                                            <option value="non-fragile" ${parcel.delicacy === 'non-fragile' ? 'selected' : ''}>Non-Fragile</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Size</label>
                                        <select name="size" required onchange="updatePrice()">
                                            <option value="small" ${parcel.size === 'small' ? 'selected' : ''}>Small</option>
                                            <option value="medium" ${parcel.size === 'medium' ? 'selected' : ''}>Medium</option>
                                            <option value="large" ${parcel.size === 'large' ? 'selected' : ''}>Large</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Price ($)</label>
                                        <input type="number" step="0.01" name="price" value="${parcel.price}" readonly>
                                    </div>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="save-btn">
                                    <i class="fas fa-save"></i> Save Changes
                                </button>
                                <button type="button" class="cancel-btn" onclick="closeModal()">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (error) {
        console.error('Error loading parcel details:', error);
        showNotification('Error loading parcel details', 'error');
    }
}

// Update parcel details
async function updateParcelDetails(event, trackingNumber) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const parcelData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE_URL}/staff/parcels/${trackingNumber}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify(parcelData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update parcel');
        }

        showNotification('Parcel updated successfully', 'success');
        closeModal();
        // Refresh the parcels list
        loadParcelsList();
        
    } catch (error) {
        console.error('Error updating parcel:', error);
        showNotification(error.message || 'Error updating parcel', 'error');
    }
}

// Close modal function
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Update the table generation in loadParcelsList()
function generateParcelRow(parcel) {
    return `
        <tr>
            <td>${parcel.tracking_number}</td>
            <td>${parcel.sender_name}</td>
            <td>${parcel.recipient_name}</td>
            <td>
                <span class="status-badge status-${parcel.status.toLowerCase()}">
                    ${parcel.status}
                </span>
            </td>
            <td>
                <button class="view-btn" onclick="viewParcelDetails('${parcel.tracking_number}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="edit-btn" onclick="editParcelDetails('${parcel.tracking_number}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `;
}


    // Event listener for logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffData');
        window.location.href = 'staff-login.html';
    });

    // Initial load
    handleSectionDisplay('add-parcel');
}