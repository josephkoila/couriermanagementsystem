const nodemailer = require('nodemailer');
const config = require('./config');

// Create Nodemailer transporter using config
const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
        user: config.email.user,
        pass: config.email.password
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Email templates
const emailTemplates = {
    senderNotification: (data) => ({
        subject: `Your Parcel Has Been Registered - Tracking #${data.trackingNumber}`,
        html: `
            <h2>Parcel Registration Confirmation</h2>
            <p>Dear ${data.senderName},</p>
            <p>Your parcel has been successfully registered with our courier service. Here are the details:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
                <p><strong>Recipient:</strong> ${data.recipientName}</p>
                <p><strong>Status:</strong> ${data.status}</p>
                <p><strong>Weight:</strong> ${data.weight} kg</p>
                <p><strong>Type:</strong> ${data.delicacy}</p>
                <p><strong>Size:</strong> ${data.size}</p>
                <p><strong>Pickup Branch Details:</strong></p>
                <ul style="list-style: none; padding-left: 20px;">
                    <li><strong>Country:</strong> ${data.pickup_branch.country}</li>
                    <li><strong>County:</strong> ${data.pickup_branch.county}</li>
                    <li><strong>Location:</strong> ${data.pickup_branch.location}</li>
                    <li><strong>Building/Street:</strong> ${data.pickup_branch.street_building}</li>
                    <li><strong>Zip Code:</strong> ${data.pickup_branch.postal_code}</li>
                    <li><strong>Contacts:</strong> ${data.pickup_branch.contact}</li>
                </ul>
            </div>
            <p>You can track your parcel's status using the tracking number above.</p>
            <p>Thank you for choosing our service!</p>
        `
    }),

    recipientNotification: (data) => ({
        subject: `A Parcel is On Its Way to You - Tracking #${data.trackingNumber}`,
        html: `
            <h2>Parcel Notification</h2>
            <p>Dear ${data.recipientName},</p>
            <p>A parcel has been sent to you through our courier service. Here are the details:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
                <p><strong>From:</strong> ${data.senderName}</p>
                <p><strong>Status:</strong> ${data.status}</p>
                <p><strong>Weight:</strong> ${data.weight} kg</p>
                <p><strong>Type:</strong> ${data.delicacy}</p>
                <p><strong>Size:</strong> ${data.size}</p>
                <p><strong>Pickup Branch Details:</strong></p>
                <ul style="list-style: none; padding-left: 20px;">
                    <li><strong>Country:</strong> ${data.pickup_branch.country}</li>
                    <li><strong>County:</strong> ${data.pickup_branch.county}</li>
                    <li><strong>Location:</strong> ${data.pickup_branch.location}</li>
                    <li><strong>Building/Street:</strong> ${data.pickup_branch.street_building}</li>
                    <li><strong>Zip Code:</strong> ${data.pickup_branch.postal_code}</li>
                    <li><strong>Contacts:</strong> ${data.pickup_branch.contact}</li>
                </ul>
            </div>
            <p>You can track your parcel's status using the tracking number above.</p>
            <p>We will notify you of any status updates.</p>
        `
    }),

    statusUpdate: (data) => ({
        subject: `Parcel Status Update - Tracking #${data.trackingNumber}`,
        html: `
            <h2>Parcel Status Update</h2>
            <p>Dear ${data.name},</p>
            <p>There has been an update to your parcel with tracking number <strong>${data.trackingNumber}</strong>:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>New Status:</strong> ${data.status}</p>
                <p><strong>Current Location:</strong> ${data.location || 'N/A'}</p>
                <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
                ${data.comments ? `<p><strong>Additional Information:</strong> ${data.comments}</p>` : ''}
            </div>
            <p>You can track your parcel using the tracking number above on our website.</p>
            <p>Thank you for using our service!</p>
        `
    })
};

// Email notification service
const emailService = {
    // Send new parcel notifications
    sendNewParcelNotification: async (parcelData) => {
        try {
            const emailPromises = [];

            // Send notification to sender
            if (parcelData.sender_email) {
                const senderTemplate = emailTemplates.senderNotification({
                    trackingNumber: parcelData.tracking_number,
                    senderName: parcelData.sender_name,
                    recipientName: parcelData.recipient_name,
                    recipientAddress: parcelData.recipient_address,
                    status: 'Item Accepted by Courier',
                    weight: parcelData.weight,
                    delicacy: parcelData.delicacy,
                    size: parcelData.size,
                    pickup_branch: parcelData.pickup_branch,
                    delivery_branch: parcelData.delivery_branch
                });

                emailPromises.push(
                    transporter.sendMail({
                        from: config.email.from,
                        to: parcelData.sender_email,
                        subject: senderTemplate.subject,
                        html: senderTemplate.html
                    })
                );
            }

            // Send notification to recipient
            if (parcelData.recipient_email) {
                const recipientTemplate = emailTemplates.recipientNotification({
                    trackingNumber: parcelData.tracking_number,
                    recipientName: parcelData.recipient_name,
                    recipientAddress: parcelData.recipient_address,
                    senderName: parcelData.sender_name,
                    status: 'Item Accepted by Courier',
                    weight: parcelData.weight,
                    delicacy: parcelData.delicacy,
                    size: parcelData.size,
                    pickup_branch: parcelData.pickup_branch,
                    delivery_branch: parcelData.delivery_branch
                });

                emailPromises.push(
                    transporter.sendMail({
                        from: config.email.from,
                        to: parcelData.recipient_email,
                        subject: recipientTemplate.subject,
                        html: recipientTemplate.html
                    })
                );
            }

            await Promise.all(emailPromises);
            console.log(`Parcel registration notifications sent successfully for tracking number: ${parcelData.tracking_number}`);
            return true;
        } catch (error) {
            console.error('Error sending parcel registration notifications:', error);
            throw error;
        }
    },

    // Send status update notifications
    sendStatusUpdateNotification: async (parcelData) => {
        try {
            const emailPromises = [];

            // Common template data
            const templateData = {
                trackingNumber: parcelData.tracking_number,
                status: parcelData.status,
                location: parcelData.location,
                comments: parcelData.comments
            };

            // Send to sender
            if (parcelData.sender_email) {
                const senderTemplate = emailTemplates.statusUpdate({
                    ...templateData,
                    name: parcelData.sender_name
                });

                emailPromises.push(
                    transporter.sendMail({
                        from: config.email.from,
                        to: parcelData.sender_email,
                        subject: senderTemplate.subject,
                        html: senderTemplate.html
                    })
                );
            }

            // Send to recipient
            if (parcelData.recipient_email) {
                const recipientTemplate = emailTemplates.statusUpdate({
                    ...templateData,
                    name: parcelData.recipient_name
                });

                emailPromises.push(
                    transporter.sendMail({
                        from: config.email.from,
                        to: parcelData.recipient_email,
                        subject: recipientTemplate.subject,
                        html: recipientTemplate.html
                    })
                );
            }

            await Promise.all(emailPromises);
            console.log(`Status update notifications sent successfully for tracking number: ${parcelData.tracking_number}`);
            return true;
        } catch (error) {
            console.error('Error sending status update notifications:', error);
            throw error;
        }
    }
};

module.exports = emailService;