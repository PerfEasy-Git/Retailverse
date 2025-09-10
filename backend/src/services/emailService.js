const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

class EmailService {
    constructor() {
        // Check if SMTP credentials are configured
        const hasSmtpCredentials = process.env.SMTP_USER && process.env.SMTP_PASS;
        
        if (hasSmtpCredentials) {
            // Use real SMTP if credentials are provided
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            this.isMockMode = false;
        } else {
            // Use mock mode for development
            this.transporter = null;
            this.isMockMode = true;
            console.log('📧 Email Service: Running in MOCK mode (no real emails will be sent)');
        }
        
        this.templatesPath = path.join(__dirname, '../templates/email');
        this.templates = {};
        this.loadTemplates();
    }

    async loadTemplates() {
        try {
            const templateFiles = [
                'welcome.html',
                'invitation.html', 
                'password-reset.html',
                'email-verification.html',
                'fit-score-notification.html'
            ];

            for (const file of templateFiles) {
                const templatePath = path.join(this.templatesPath, file);
                const templateContent = await fs.readFile(templatePath, 'utf8');
                this.templates[file.replace('.html', '')] = handlebars.compile(templateContent);
            }
        } catch (error) {
            console.error('Error loading email templates:', error);
        }
    }

    async sendEmail(to, subject, html, text) {
        try {
            if (this.isMockMode) {
                // Mock mode - log the email instead of sending
                console.log('📧 MOCK EMAIL SENT:');
                console.log('   To:', to);
                console.log('   Subject:', subject);
                console.log('   Content Preview:', text.substring(0, 100) + '...');
                console.log('   HTML Length:', html.length, 'characters');
                console.log('   ======================================');
                
                // Simulate successful sending
                return { success: true, messageId: 'mock-' + Date.now() };
            } else {
                // Real SMTP mode
                const mailOptions = {
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: to,
                    subject: subject,
                    html: html,
                    text: text
                };

                const result = await this.transporter.sendMail(mailOptions);
                console.log('Email sent successfully:', result.messageId);
                return { success: true, messageId: result.messageId };
            }
        } catch (error) {
            console.error('Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendWelcomeEmail(emailData) {
        const { email, firstName, role, companyName } = emailData;
        const subject = 'Welcome to RetailVerse';
        
        const templateData = {
            firstName: firstName,
            email: email,
            role: role,
            companyName: companyName || 'RetailVerse',
            loginUrl: `${process.env.FRONTEND_URL}/login`
        };

        const html = this.templates.welcome ? this.templates.welcome(templateData) : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to RetailVerse, ${firstName}!</h2>
                <p>Your account has been successfully created as a ${role}.</p>
                <p>You can now log in and start using the platform.</p>
                <p>If you have any questions, please contact our support team.</p>
            </div>
        `;
        
        const text = `Welcome to RetailVerse, ${firstName}! Your account has been created as a ${role}.`;
        return await this.sendEmail(email, subject, html, text);
    }

    async sendInvitationEmail(emailData) {
        const { email, firstName, role, companyName, invitationToken } = emailData;
        const subject = 'You\'re Invited to Join RetailVerse';
        
        const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
        
        const templateData = {
            firstName: firstName,
            companyName: companyName,
            role: role,
            invitationUrl: invitationUrl,
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        };

        const html = this.templates.invitation ? this.templates.invitation(templateData) : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You're invited to join RetailVerse</h2>
                <p>Hello ${firstName},</p>
                <p>You have been invited to join ${companyName} on RetailVerse as a ${role}.</p>
                <p>Click the link below to accept the invitation:</p>
                <a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
                <p>This invitation expires in 7 days.</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
        `;
        
        const text = `You're invited to join ${companyName} as a ${role}. Click here to accept: ${invitationUrl}`;
        return await this.sendEmail(email, subject, html, text);
    }

    async sendPasswordResetEmail(email, resetToken) {
        const subject = 'Reset Your Password - RetailVerse';
        
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const templateData = {
            resetUrl: resetUrl
        };

        const html = this.templates['password-reset'] ? this.templates['password-reset'](templateData) : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>We received a request to reset your password for RetailVerse.</p>
                <p>Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
        `;
        
        const text = `Reset your RetailVerse password: ${resetUrl}`;
        return await this.sendEmail(email, subject, html, text);
    }

    async sendEmailVerificationEmail(email, verificationToken) {
        const subject = 'Verify Your Email - RetailVerse';
        
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        
        const templateData = {
            verificationUrl: verificationUrl
        };

        const html = this.templates['email-verification'] ? this.templates['email-verification'](templateData) : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify Your Email Address</h2>
                <p>Please verify your email address to complete your account setup.</p>
                <p>Click the link below to verify your email:</p>
                <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
                <p>If you didn't create this account, please ignore this email.</p>
            </div>
        `;
        
        const text = `Verify your email address: ${verificationUrl}`;
        return await this.sendEmail(email, subject, html, text);
    }

    async sendFitScoreNotificationEmail(user, fitScoreData) {
        const subject = 'FIT Score Analysis Complete - RetailVerse';
        
        const templateData = {
            firstName: user.first_name,
            brandName: fitScoreData.brandName,
            totalRetailers: fitScoreData.totalRetailers,
            highPriority: fitScoreData.highPriority,
            mediumPriority: fitScoreData.mediumPriority,
            lowPriority: fitScoreData.lowPriority,
            topRecommendations: fitScoreData.topRecommendations || [],
            dashboardUrl: `${process.env.FRONTEND_URL}/fit-analysis`
        };

        const html = this.templates['fit-score-notification'] ? this.templates['fit-score-notification'](templateData) : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>FIT Score Analysis Complete</h2>
                <p>Hello ${user.first_name},</p>
                <p>Your FIT score analysis for ${fitScoreData.brandName} has been completed.</p>
                <p>Total Retailers Analyzed: ${fitScoreData.totalRetailers}</p>
                <p>High Priority: ${fitScoreData.highPriority} | Medium Priority: ${fitScoreData.mediumPriority} | Low Priority: ${fitScoreData.lowPriority}</p>
                <p>View the complete analysis in your dashboard:</p>
                <a href="${templateData.dashboardUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Analysis</a>
            </div>
        `;
        
        const text = `FIT Score Analysis Complete for ${fitScoreData.brandName}. View results: ${templateData.dashboardUrl}`;
        return await this.sendEmail(user.email, subject, html, text);
    }

    // Test email configuration
    async testConnection() {
        try {
            if (this.isMockMode) {
                console.log('Email service: Mock mode - no connection test needed');
                return true;
            } else {
                await this.transporter.verify();
                console.log('Email service connection verified');
                return true;
            }
        } catch (error) {
            console.error('Email service connection failed:', error);
            return false;
        }
    }
}

module.exports = new EmailService();