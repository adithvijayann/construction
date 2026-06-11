import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;

const portalUrl = (loginUrl) => loginUrl || env.CLIENT_URL.split(",")[0] || env.API_PUBLIC_URL || "";

const logEmailFailure = ({ to, subject, reason }) => {
  console.error("Email send failed", { to, subject, reason });
};

const isPlaceholderEmailUser = () => env.EMAIL_USER === "your-gmail-address@gmail.com" || env.EMAIL_USER.includes("your-gmail-address");

const emailReadinessProblem = () => {
  if (!env.ENABLE_EMAIL_NOTIFICATIONS) return "Email notifications are disabled";
  if (!env.EMAIL_USER || !env.EMAIL_PASS) return "Gmail SMTP is missing EMAIL_USER or EMAIL_PASS";
  if (isPlaceholderEmailUser()) return "Gmail SMTP EMAIL_USER is still the placeholder. Replace it with the Gmail address that generated EMAIL_PASS.";
  return "";
};

const friendlyGmailError = (error) => {
  const message = error?.message || "Unknown Gmail SMTP error";
  if (message.includes("535-5.7.8") || message.toLowerCase().includes("badcredentials")) {
    return "Gmail login failed. Set EMAIL_USER to the exact Gmail address that generated EMAIL_PASS, and use a valid Google App Password.";
  }
  return message;
};

const getTransporter = () => {
  transporter ||= nodemailer.createTransport({
    service: "gmail",
    connectionTimeout: env.EMAIL_SEND_TIMEOUT_MS,
    greetingTimeout: env.EMAIL_SEND_TIMEOUT_MS,
    socketTimeout: env.EMAIL_SEND_TIMEOUT_MS,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS
    }
  });

  return transporter;
};

export const sendMail = async ({ to, subject, html, text }) => {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (!recipients.length) {
    const reason = "No recipient email address was provided";
    logEmailFailure({ to, subject, reason });
    return { sent: false, provider: "gmail", reason };
  }

  const readinessProblem = emailReadinessProblem();
  if (readinessProblem) {
    const reason = readinessProblem;
    logEmailFailure({ to: recipients, subject, reason });
    return { sent: false, provider: "gmail", reason };
  }

  try {
    const info = await getTransporter().sendMail({
      from: env.EMAIL_USER,
      to: recipients,
      subject,
      text,
      html
    });

    return { sent: true, provider: "gmail", id: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (error) {
    const reason = friendlyGmailError(error);
    logEmailFailure({ to: recipients, subject, reason });
    return { sent: false, provider: "gmail", reason };
  }
};

export const sendMailInBackground = ({ send, to, subject, label = "Email" }) => {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (!recipients.length) {
    const reason = "No recipient email address was provided";
    logEmailFailure({ to, subject, reason });
    return { sent: false, sending: false, provider: "gmail", reason };
  }

  const readinessProblem = emailReadinessProblem();
  if (readinessProblem) {
    const reason = readinessProblem;
    logEmailFailure({ to: recipients, subject, reason });
    return { sent: false, sending: false, provider: "gmail", reason };
  }

  setImmediate(async () => {
    try {
      const result = await send();
      if (!result?.sent) {
        console.error(`${label} was not sent`, { to: recipients, subject, reason: result?.reason || "Unknown email failure" });
      }
    } catch (error) {
      console.error(`${label} failed`, { to: recipients, subject, reason: error.message });
    }
  });

  return { sent: null, sending: true, provider: "gmail" };
};

const credentialText = ({ name, email, temporaryPassword, role, loginUrl }) => {
  const passwordLine = temporaryPassword
    ? `Temporary password: ${temporaryPassword}`
    : "Use your existing password for this account.";

  return [
    `Hello ${name || "there"},`,
    "",
    `Your ${role} account is ready.`,
    `Contractor name: ${name || "Not provided"}`,
    `Login email: ${email}`,
    passwordLine,
    `Login URL: ${portalUrl(loginUrl)}`
  ].join("\n");
};

const credentialHtml = ({ name, email, temporaryPassword, role, loginUrl, dashboardLabel = "Open dashboard" }) => {
  const passwordLine = temporaryPassword
    ? `<strong>Temporary password:</strong> ${temporaryPassword}`
    : "Use your existing password for this account.";

  return `
    <p>Hello ${name || "there"},</p>
    <p>Your <strong>${role}</strong> account is ready.</p>
    <p>
      <strong>Contractor name:</strong> ${name || "Not provided"}<br/>
      <strong>Login email:</strong> ${email}<br/>
      ${passwordLine}
    </p>
    <p><a href="${portalUrl(loginUrl)}">${dashboardLabel}</a></p>
  `;
};

export const sendContractorCredentialsEmail = ({ name, email, temporaryPassword, loginUrl }) =>
  sendMail({
    to: email,
    subject: "Construction log contractor account",
    text: credentialText({ name, email, temporaryPassword, role: "contractor", loginUrl }),
    html: credentialHtml({ name, email, temporaryPassword, role: "contractor", loginUrl })
  });

export const sendClientInviteEmail = async ({ name, email, project, temporaryPassword, loginUrl }) =>
  sendMail({
    to: email,
    subject: `Construction log access: ${project?.name || "Project portal"}`,
    text: credentialText({ name: name || project?.clientName || "", email, temporaryPassword, role: "client portal", loginUrl }),
    html: credentialHtml({ name: name || project?.clientName || "", email, temporaryPassword, role: "client portal", loginUrl, dashboardLabel: "Open portal" })
  });

export const sendUserCredentialsEmail = async ({ name, email, temporaryPassword, role, loginUrl }) =>
  sendMail({
    to: email,
    subject: `Construction log ${role} account`,
    text: credentialText({ name, email, temporaryPassword, role, loginUrl }),
    html: credentialHtml({ name, email, temporaryPassword, role, loginUrl })
  });

export const sendLogSubmittedEmail = async ({ email, project, log }) =>
  sendMail({
    to: email,
    subject: `Daily log submitted: ${project.name}`,
    text: `A daily log for ${project.name} was submitted for ${log.logDate.toISOString().slice(0, 10)}.`,
    html: `<p>A daily log for <strong>${project.name}</strong> was submitted for <strong>${log.logDate.toISOString().slice(0, 10)}</strong>.</p>`
  });
