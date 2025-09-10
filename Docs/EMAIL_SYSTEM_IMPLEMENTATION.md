# Email System Implementation - Complete Guide

## 📧 Overview

Complete email system implementation for user invitations, password reset, email verification, and notifications.

---

## 🔧 Email Service Configuration

### Environment Variables
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@retailverse.com
FROM_NAME=RetailVerse Platform

# Email Templates
EMAIL_TEMPLATES_DIR=./src/utils/emailTemplates
```

### Email Service Implementation
```javascript
// src/services/emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendEmail(to, subject, html, text) {
        try {
            const mailOptions = {
                from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
                to,
                subject,
                html,
                text
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendUserInvitation(invitationData) {
        const { email, role, companyName, inviterName, invitationToken } = invitationData;
        
        const subject = `Invitation to join ${companyName} on RetailVerse`;
        const html = await this.getTemplate('user-invitation', {
            email,
            role,
            companyName,
            inviterName,
            invitationLink: `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`
        });

        return await this.sendEmail(email, subject, html);
    }

    async sendPasswordReset(email, resetToken) {
        const subject = 'Password Reset - RetailVerse';
        const html = await this.getTemplate('password-reset', {
            email,
            resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        });

        return await this.sendEmail(email, subject, html);
    }

    async sendEmailVerification(email, verificationToken) {
        const subject = 'Email Verification - RetailVerse';
        const html = await this.getTemplate('email-verification', {
            email,
            verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
        });

        return await this.sendEmail(email, subject, html);
    }

    async sendWelcomeEmail(userData) {
        const { email, firstName, role, companyName } = userData;
        
        const subject = `Welcome to RetailVerse - ${companyName}`;
        const html = await this.getTemplate('welcome', {
            firstName,
            role,
            companyName,
            loginLink: `${process.env.FRONTEND_URL}/login`
        });

        return await this.sendEmail(email, subject, html);
    }

    async getTemplate(templateName, data) {
        try {
            const templatePath = path.join(process.env.EMAIL_TEMPLATES_DIR, `${templateName}.html`);
            let template = await fs.readFile(templatePath, 'utf8');
            
            // Replace placeholders with actual data
            Object.keys(data).forEach(key => {
                const placeholder = `{{${key}}}`;
                template = template.replace(new RegExp(placeholder, 'g'), data[key]);
            });

            return template;
        } catch (error) {
            console.error('Template loading failed:', error);
            return this.getDefaultTemplate(templateName, data);
        }
    }

    getDefaultTemplate(templateName, data) {
        const templates = {
            'user-invitation': `
                <h2>You're invited to join ${data.companyName}</h2>
                <p>Hello,</p>
                <p>${data.inviterName} has invited you to join ${data.companyName} as a ${data.role} on RetailVerse platform.</p>
                <p>Click the link below to accept the invitation:</p>
                <a href="${data.invitationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
                <p>This invitation will expire in 7 days.</p>
            `,
            'password-reset': `
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>You requested a password reset for your RetailVerse account.</p>
                <p>Click the link below to reset your password:</p>
                <a href="${data.resetLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
            `,
            'email-verification': `
                <h2>Email Verification</h2>
                <p>Hello,</p>
                <p>Please verify your email address to complete your registration.</p>
                <p>Click the link below to verify your email:</p>
                <a href="${data.verificationLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
            `,
            'welcome': `
                <h2>Welcome to RetailVerse!</h2>
                <p>Hello ${data.firstName},</p>
                <p>Welcome to RetailVerse platform as a ${data.role} for ${data.companyName}.</p>
                <p>You can now login and start using the platform:</p>
                <a href="${data.loginLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
            `
        };

        return templates[templateName] || '<p>Email template not found</p>';
    }
}

module.exports = new EmailService();
```

---

## 📧 Email Templates

### User Invitation Template
```html
<!-- src/utils/emailTemplates/user-invitation.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invitation to RetailVerse</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RetailVerse Platform</h1>
        </div>
        <div class="content">
            <h2>You're Invited!</h2>
            <p>Hello,</p>
            <p><strong>{{inviterName}}</strong> has invited you to join <strong>{{companyName}}</strong> as a <strong>{{role}}</strong> on the RetailVerse platform.</p>
            <p>RetailVerse is a comprehensive platform for brand-retailer collaboration and FIT score analysis.</p>
            <p>Click the button below to accept the invitation:</p>
            <a href="{{invitationLink}}" class="button">Accept Invitation</a>
            <p><strong>Important:</strong> This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2024 RetailVerse Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### Password Reset Template
```html
<!-- src/utils/emailTemplates/password-reset.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset - RetailVerse</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello,</p>
            <p>You requested a password reset for your RetailVerse account ({{email}}).</p>
            <p>Click the button below to reset your password:</p>
            <a href="{{resetLink}}" class="button">Reset Password</a>
            <p><strong>Important:</strong> This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2024 RetailVerse Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### Email Verification Template
```html
<!-- src/utils/emailTemplates/email-verification.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Email Verification - RetailVerse</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Verification</h1>
        </div>
        <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for registering with RetailVerse platform.</p>
            <p>Please verify your email address ({{email}}) to complete your registration:</p>
            <a href="{{verificationLink}}" class="button">Verify Email</a>
            <p><strong>Important:</strong> This link will expire in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2024 RetailVerse Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### Welcome Email Template
```html
<!-- src/utils/emailTemplates/welcome.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to RetailVerse</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to RetailVerse!</h1>
        </div>
        <div class="content">
            <h2>Hello {{firstName}}!</h2>
            <p>Welcome to the RetailVerse platform as a <strong>{{role}}</strong> for <strong>{{companyName}}</strong>.</p>
            <p>You now have access to:</p>
            <ul>
                <li>FIT score analysis and recommendations</li>
                <li>Retailer data management</li>
                <li>Category and subcategory selection</li>
                <li>Comprehensive reporting tools</li>
            </ul>
            <p>Click the button below to start using the platform:</p>
            <a href="{{loginLink}}" class="button">Login Now</a>
            <p>If you have any questions, please contact your administrator.</p>
        </div>
        <div class="footer">
            <p>© 2024 RetailVerse Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

---

## 🔧 API Endpoints for Email System

### User Invitation APIs
```javascript
// POST /api/invitations/send
// Send invitation to new user
{
  "email": "newuser@example.com",
  "role": "brand_user",
  "first_name": "John",
  "last_name": "Doe"
}

// GET /api/invitations/accept/:token
// Accept invitation and create user account
{
  "token": "invitation_token_here",
  "password": "newpassword123"
}

// GET /api/invitations/status/:token
// Check invitation status
```

### Password Reset APIs
```javascript
// POST /api/auth/forgot-password
// Request password reset
{
  "email": "user@example.com"
}

// POST /api/auth/reset-password
// Reset password with token
{
  "token": "reset_token_here",
  "password": "newpassword123"
}
```

### Email Verification APIs
```javascript
// POST /api/auth/verify-email
// Verify email with token
{
  "token": "verification_token_here"
}

// POST /api/auth/resend-verification
// Resend verification email
{
  "email": "user@example.com"
}
```

---

## 🔧 Frontend Components for Email System

### Email Verification Component
```jsx
// src/components/EmailVerification.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../services/authService';

const EmailVerification = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (token) {
            verifyEmail(token)
                .then(response => {
                    setStatus('success');
                    setMessage('Email verified successfully!');
                    setTimeout(() => navigate('/login'), 3000);
                })
                .catch(error => {
                    setStatus('error');
                    setMessage(error.message || 'Verification failed');
                });
        }
    }, [token, navigate]);

    const handleResendVerification = async () => {
        try {
            await resendVerification();
            setMessage('Verification email sent!');
        } catch (error) {
            setMessage('Failed to resend verification email');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Email Verification
                    </h2>
                    <div className="mt-4">
                        {status === 'verifying' && (
                            <div className="text-blue-600">Verifying your email...</div>
                        )}
                        {status === 'success' && (
                            <div className="text-green-600">{message}</div>
                        )}
                        {status === 'error' && (
                            <div className="text-red-600">
                                <p>{message}</p>
                                <button
                                    onClick={handleResendVerification}
                                    className="mt-2 text-blue-600 hover:text-blue-500"
                                >
                                    Resend Verification Email
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerification;
```

### Password Reset Component
```jsx
// src/components/PasswordReset.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';

const PasswordReset = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState('form');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        try {
            await resetPassword(token, formData.password);
            setStatus('success');
            setMessage('Password reset successfully!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            setMessage(error.message || 'Password reset failed');
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-green-600">
                            Password Reset Successful
                        </h2>
                        <p className="mt-2 text-gray-600">{message}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset Your Password
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <input
                            type="password"
                            placeholder="New Password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    {message && (
                        <div className="text-red-600 text-center">{message}</div>
                    )}
                    <button
                        type="submit"
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Reset Password
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordReset;
```

---

## 🔧 Testing Email System

### Email Service Tests
```javascript
// tests/services/emailService.test.js
const emailService = require('../../src/services/emailService');

describe('EmailService', () => {
    test('should send user invitation email', async () => {
        const invitationData = {
            email: 'test@example.com',
            role: 'brand_user',
            companyName: 'Test Company',
            inviterName: 'John Doe',
            invitationToken: 'test_token'
        };

        const result = await emailService.sendUserInvitation(invitationData);
        expect(result.success).toBe(true);
    });

    test('should send password reset email', async () => {
        const result = await emailService.sendPasswordReset('test@example.com', 'reset_token');
        expect(result.success).toBe(true);
    });

    test('should send email verification', async () => {
        const result = await emailService.sendEmailVerification('test@example.com', 'verification_token');
        expect(result.success).toBe(true);
    });
});
```

---

## 📊 Email System Monitoring

### Email Delivery Tracking
```javascript
// src/services/emailService.js - Add tracking
class EmailService {
    async sendEmail(to, subject, html, text) {
        try {
            const mailOptions = {
                from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
                to,
                subject,
                html,
                text,
                headers: {
                    'X-Email-Type': 'system',
                    'X-User-Email': to
                }
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            // Log email delivery
            await this.logEmailDelivery({
                to,
                subject,
                messageId: result.messageId,
                status: 'sent',
                timestamp: new Date()
            });

            return { success: true, messageId: result.messageId };
        } catch (error) {
            // Log email failure
            await this.logEmailDelivery({
                to,
                subject,
                status: 'failed',
                error: error.message,
                timestamp: new Date()
            });

            return { success: false, error: error.message };
        }
    }

    async logEmailDelivery(emailData) {
        // Log to database or file
        console.log('Email delivery log:', emailData);
    }
}
```

---

**Email system is now complete with all necessary components for user management, password reset, and notifications.**
