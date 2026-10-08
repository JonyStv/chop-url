import { Resend } from 'resend';
import { render } from 'react-email';
import { createElement } from 'react';
import { VerificationEmail } from '../templates/VerificationEmail.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  async sendVerification(email, username, rawToken) {
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    const html = await render(
      createElement(VerificationEmail, { username, verifyUrl: url })
    );

    const { error } = await resend.emails.send({
      from: 'StvDev <noreply@stvdev.com>',
      to: email,
      subject: 'Verifica tu cuenta',
      html,
    });

    if (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Error sending verification email');
    }
  },
};