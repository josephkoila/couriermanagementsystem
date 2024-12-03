// Track parcel function
async function trackParcel() {
    const trackingNumber = document.getElementById('trackingNumber').value.trim();
    const trackingResult = document.getElementById('trackingResult');
    
    if (!trackingNumber) {
        alert('Please enter a tracking number');
        return;
    }

    try {
        // Show loading state
        trackingResult.style.display = 'block';
        trackingResult.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                Tracking your parcel...
            </div>
        `;

        const response = await fetch(`http://localhost:3000/api/track/${trackingNumber}`);
        
        if (!response.ok) {
            throw new Error('Parcel not found');
        }

        const data = await response.json();
        
        if (!data || !data.tracking_history) {
            throw new Error('Invalid tracking data received');
        }
        
        // Update tracking result
        trackingResult.innerHTML = `
            <div class="parcel-info">
                <h3>Parcel Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Tracking Number:</strong>
                        <span>${data.tracking_number}</span>
                    </div>
                    <div class="info-item">
                        <strong>Current Status:</strong>
                        <span class="status-badge status-${data.status.toLowerCase().replace(/\s+/g, '-')}">
                            ${data.status}
                        </span>
                    </div>
                    <div class="info-item">
                        <strong>Sender:</strong>
                        <span>${data.sender_name}</span>
                    </div>
                    <div class="info-item">
                        <strong>Recipient:</strong>
                        <span>${data.recipient_name}</span>
                    </div>
                </div>
            </div>

            <div class="tracking-timeline">
                ${generateTimelineHTML(data.tracking_history)}
            </div>

            <button class="view-details-btn" onclick='showDetailedView(${JSON.stringify(data).replace(/'/g, "\\'")})'}>
                <i class="fas fa-eye"></i>
                View Detailed Information
            </button>
        `;
        
    } catch (error) {
        console.error('Error tracking parcel:', error);
        trackingResult.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                ${error.message === 'Parcel not found' ? 
                    'No parcel found with this tracking number. Please check and try again.' :
                    'An error occurred while tracking your parcel. Please try again later.'}
            </div>
        `;
    }
}

// Generate timeline HTML
function generateTimelineHTML(history) {
    if (!history || !Array.isArray(history)) {
        return '<div class="timeline-item">No tracking history available</div>';
    }

    return history.map(item => `
        <div class="timeline-item">
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '-')}">
                        ${item.status}
                    </span>
                    <span class="timeline-date">
                        ${formatDate(item.timestamp)}
                    </span>
                </div>
                <p>${item.description}</p>
                ${item.location ? `
                    <div class="timeline-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${item.location}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}
    
    // Show detailed parcel view
    function showDetailedView(parcelData) {
        const modal = document.getElementById('trackingModal');
        
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Detailed Tracking Information</h2>
                    <button class="close-btn" onclick="closeModal()">
                    Close
                    </button>
                </div>
                
                <div class="modal-body">
                    <!-- Parcel Details -->
                    <div class="detail-section">
                        <h3>Parcel Details</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Tracking Number:</label>
                                <span>${parcelData.tracking_number}</span>
                            </div>
                            <div class="detail-item">
                                <label>Current Status:</label>
                                <span class="status-badge status-${parcelData.status.toLowerCase()}">
                                    ${parcelData.status}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>Weight:</label>
                                <span>${parcelData.weight} kg</span>
                            </div>
                            <div class="detail-item">
                                <label>Type:</label>
                                <span>${parcelData.delicacy}</span>
                            </div>
                        </div>
                    </div>
    
                    <!-- Sender Information -->
                    <div class="detail-section">
                        <h3>Sender Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Name:</label>
                                <span>${parcelData.sender_name}</span>
                            </div>
                            <div class="detail-item">
                                <label>Address:</label>
                                <span>${parcelData.sender_address}</span>
                            </div>
                            <div class="detail-item">
                                <label>Contact:</label>
                                <span>${maskPhoneNumber(parcelData.sender_phone)}</span>
                            </div>
                        </div>
                    </div>
    
                    <!-- Recipient Information -->
                    <div class="detail-section">
                        <h3>Recipient Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Name:</label>
                                <span>${parcelData.recipient_name}</span>
                            </div>
                            <div class="detail-item">
                                <label>Address:</label>
                                <span>${parcelData.recipient_address}</span>
                            </div>
                            <div class="detail-item">
                                <label>Contact:</label>
                                <span>${maskPhoneNumber(parcelData.recipient_phone)}</span>
                            </div>
                        </div>
                    </div>
    
                    <!-- Shipment Route -->
                    <div class="detail-section">
                        <h3>Shipment Route</h3>
                        <div class="route-info">
                            <div class="route-point">
                                <i class="fas fa-circle"></i>
                                <div>
                                    <strong>Pickup Branch</strong>
                                    <p>${parcelData.pickup_branch_name}</p>
                                </div>
                            </div>
                            <div class="route-line"></div>
                            <div class="route-point">
                                <i class="fas fa-circle"></i>
                                <div>
                                    <strong>Delivery Branch</strong>
                                    <p>${parcelData.delivery_branch_name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <!-- Complete Tracking History -->
                    <div class="detail-section">
                        <h3>Complete Tracking History</h3>
                        <div class="detailed-timeline">
                            ${generateDetailedTimelineHTML(parcelData.tracking_history)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    
        // Add event listener to close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Generate detailed timeline HTML
function generateDetailedTimelineHTML(history) {
    if (!history || !Array.isArray(history)) {
        return '<div class="timeline-item">No detailed tracking history available</div>';
    }

    return history.map(item => `
        <div class="timeline-item">
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '-')}">
                        ${item.status}
                    </span>
                    <span class="timeline-date">
                        ${formatDate(item.timestamp)}
                    </span>
                </div>
                <p>${item.description}</p>
                <div class="timeline-details">
                    ${item.location ? `
                        <div class="timeline-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${item.location}
                        </div>
                    ` : ''}
                    <div class="timeline-time">
                        <i class="fas fa-clock"></i>
                        ${formatTime(item.timestamp)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}
    
    // Helper functions
    function closeModal() {
        document.getElementById('trackingModal').style.display = 'none';
    }
    
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function maskPhoneNumber(phone) {
        return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
    }
    
    // Add keyboard event listener for tracking number input
    document.getElementById('trackingNumber').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            trackParcel();
        }
    });
    
 