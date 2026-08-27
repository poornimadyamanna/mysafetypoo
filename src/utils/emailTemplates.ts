export const generateVerificationEmailTemplate = (link: string) => `
  <div style="font-family: Arial, sans-serif; background-color: #f4f4f7; padding: 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="padding: 30px 40px;">
          <h2 style="color: #333333; text-align: center;">Verify Your Email Address</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            You're almost there! Click the button below to verify your new email address and complete the update.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" target="_blank" style="background-color: #4CAF50; color: #ffffff; padding: 14px 24px; text-decoration: none; font-size: 16px; border-radius: 6px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #888888; font-size: 13px; text-align: center;">
            This link will expire in 24 hours or after verification.<br/>
            If you didn’t request this, you can safely ignore this email.
          </p>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding: 20px 40px; color: #999999; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Wintru Games. All rights reserved.
        </td>
      </tr>
    </table>
  </div>
`;
