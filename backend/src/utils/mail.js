// 邮件发送工具（nodemailer，纯 JS 无原生依赖）。
// 使用 .env 中的 SMTP_* 配置。未配置 SMTP 时进入"开发模式"：不真正发信，
// 由调用方决定如何暴露验证码（便于先跑通流程，配好 SMTP 后自动切真实发送）。
import nodemailer from 'nodemailer';

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || (user ? `"平台通知" <${user}>` : '');
  if (!host || !user || !pass || !from) return null; // 未配置 → 开发模式
  return { host, port: Number(port) || 465, secure: Number(port) === 465, user, pass, from };
}

/** 是否已配置真 SMTP */
export function isMailConfigured() {
  return !!smtpConfig();
}

/** 发送一封邮件。未配置 SMTP 时返回 { ok:false, dev:true }，由调用方决定降级策略。 */
export async function sendMail({ to, subject, text, html }) {
  const cfg = smtpConfig();
  if (!cfg) return { ok: false, dev: true };
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  try {
    await transporter.sendMail({ from: cfg.from, to, subject, text, html });
    return { ok: true, dev: false };
  } catch (e) {
    return { ok: false, dev: false, error: e.message };
  }
}