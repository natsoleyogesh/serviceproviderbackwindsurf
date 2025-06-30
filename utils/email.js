// const nodemailer = require('nodemailer');
// const pug = require('pug');
// const { htmlToText } = require('html-to-text');
// const AppError = require('./appError');

// // Configure email settings
// const emailConfig = {
//   // SendGrid SMTP settings
//   host: process.env.SENDGRID_SMTP_HOST || 'smtp.sendgrid.net',
//   port: process.env.SENDGRID_SMTP_PORT || 587,
//   secure: process.env.SENDGRID_SMTP_SECURE === 'true', // true for 465, false for other ports
//   auth: {
//     user: process.env.SENDGRID_SMTP_USERNAME || 'apikey',
//     pass: process.env.SENDGRID_API_KEY || ''
//   },
//   from: {
//     name: process.env.EMAIL_FROM_NAME || 'Your App Name',
//     address: process.env.EMAIL_FROM || 'noreply@yourdomain.com'
//   }
// };

// module.exports = class Email {
//   constructor(user, url) {
//     this.to = user.email;
//     this.firstName = user.firstname || user.firstName || 'User';
//     this.url = url;
//     this.from = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`;
//   }

//   // Create a transporter
//   newTransport() {
//     // Always use SendGrid with SMTP
//     return nodemailer.createTransport({
//       host: emailConfig.host,
//       port: emailConfig.port,
//       secure: emailConfig.secure,
//       auth: emailConfig.auth,
//       tls: {
//         // Do not fail on invalid certs
//         rejectUnauthorized: false
//       }
//     });
//   }

//   // Send the actual email
//   async send(template, subject) {
//     // 1) Render HTML based on a pug template
//     const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
//       firstName: this.firstName,
//       url: this.url,
//       subject,
//     });

//     // 2) Define email options
//     const mailOptions = {
//       from: this.from,
//       to: this.to,
//       subject,
//       html,
//       text: htmlToText(html, {
//         wordwrap: 130,
//       }),
//     };

//     // 3) Create a transport and send email
//     await this.newTransport().sendMail(mailOptions);
//   }

//   // Send welcome email
//   async sendWelcome() {
//     await this.send('welcome', 'Welcome to Our Platform!');
//   }

//   // Send password reset email
//   async sendPasswordReset() {
//     await this.send(
//       'passwordReset',
//       'Your password reset token (valid for only 10 minutes)'
//     );
//   }

//   // Send email verification
//   async sendVerification() {
//     await this.send(
//       'verifyEmail',
//       'Verify your email address (valid for 10 minutes)'
//     );
//   }

//   // Send approval notification
//   async sendApprovalNotification() {
//     await this.send(
//       'accountApproved',
//       'Your Account Has Been Approved!'
//     );
//   }

//   // Send rejection notification
//   async sendRejectionNotification(reason) {
//     this.rejectionReason = reason;
//     await this.send(
//       'accountRejected',
//       'Your Account Approval Was Rejected'
//     );
//   }

//   // Send document approval notification
//   async sendDocumentApprovalNotification(documentType) {
//     this.documentType = documentType;
//     await this.send(
//       'documentApproved',
//       `Your ${documentType} has been approved`
//     );
//   }

//   // Send document rejection notification
//   async sendDocumentRejectionNotification(documentType, reason) {
//     this.documentType = documentType;
//     this.rejectionReason = reason;
//     await this.send(
//       'documentRejected',
//       `Your ${documentType} was rejected`
//     );
//   }
// };

// // Direct send email function
// exports.sendEmail = async (to, subject, html, attachments = []) => {
//   try {
//     // Create transporter with SendGrid SMTP settings
//     const transporter = nodemailer.createTransport({
//       host: emailConfig.host,
//       port: emailConfig.port,
//       secure: emailConfig.secure,
//       auth: emailConfig.auth,
//       tls: {
//         // Do not fail on invalid certs
//         rejectUnauthorized: false
//       }
//     });

//     // Send mail with defined transport object
//     const mailOptions = {
//       from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
//       to: Array.isArray(to) ? to.join(', ') : to,
//       subject,
//       html,
//       text: htmlToText(html, { wordwrap: 130 }),
//       attachments,
//       // Enable SendGrid specific settings
//       'x-smtpapi': JSON.stringify({
//         filters: {
//           clicktrack: {
//             settings: {
//               enable: 1,
//               enable_text: 1
//             }
//           },
//           opentrack: {
//             settings: {
//               enable: 1
//             }
//           }
//         }
//       })
//     };

//     await transporter.sendMail(mailOptions);
//     return true;
//   } catch (error) {
//     console.error('Error sending email:', error);
//     throw new AppError('There was an error sending the email. Please try again later.', 500);
//   }
// };



const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
const AppError = require('./appError');

// Configure email settings
const emailConfig = {
  // SMTP settings
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Your App Name',
    address: process.env.EMAIL_FROM || 'noreply@yourdomain.com'
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  }
};

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstname || user.firstName || 'User';
    this.url = url;
    this.from = `"${emailConfig.from.name}" <${emailConfig.from.address}>`;
  }

  // Create a transporter
  newTransport() {
    return nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: emailConfig.tls
    });
  }

  // Send the actual email
  async send(template, subject, data = {}) {
    try {
      // 1) Render HTML based on a pug template
      const html = pug.renderFile(
        `${__dirname}/../views/emails/${template}.pug`,
        {
          firstName: this.firstName,
          url: this.url,
          subject,
          ...data
        }
      );

      // 2) Define email options
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html, { wordwrap: 130 })
      };

      // 3) Create a transport and send email
      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      console.error('Error in Email.send:', error);
      throw new AppError('There was an error sending the email.', 500);
    }
  }

  // Send welcome email
  async sendWelcome() {
    await this.send('welcome', 'Welcome to Our Platform!');
  }

  // Send password reset email
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }

  // Send email verification
  async sendVerification() {
    await this.send(
      'verifyEmail',
      'Verify your email address (valid for 10 minutes)'
    );
  }

  // Send approval notification
  async sendApprovalNotification() {
    await this.send('accountApproved', 'Your Account Has Been Approved!');
  }

  // Send rejection notification
  async sendRejectionNotification(reason) {
    this.rejectionReason = reason;
    await this.send(
      'accountRejected',
      'Your Account Approval Was Rejected',
      { reason }
    );
  }

  // Send document approval notification
  async sendDocumentApprovalNotification(documentType) {
    this.documentType = documentType;
    await this.send(
      'documentApproved',
      `Your ${documentType} has been approved`,
      { documentType }
    );
  }

  // Send document rejection notification
  async sendDocumentRejectionNotification(documentType, reason) {
    this.documentType = documentType;
    this.rejectionReason = reason;
    await this.send(
      'documentRejected',
      `Your ${documentType} was rejected`,
      { documentType, reason }
    );
  }

  // Send booking confirmation
  async sendBookingConfirmation(booking) {
    await this.send(
      'bookingConfirmation',
      'Your Booking Confirmation',
      { booking }
    );
  }

  // Send booking status update
  async sendBookingStatusUpdate(booking, status) {
    await this.send(
      'bookingStatusUpdate',
      `Your Booking is ${status}`,
      { booking, status }
    );
  }
}

// Direct send email function (for simpler use cases)
const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: emailConfig.tls
    });

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: htmlToText(html, { wordwrap: 130 }),
      attachments
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw new AppError('There was an error sending the email.', 500);
  }
};

module.exports = { Email, sendEmail };
