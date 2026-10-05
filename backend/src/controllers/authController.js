import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { all, one, insert, update, findById } from '../repos/base.js';
import { sendMail, isMailConfigured } from '../utils/mail.js';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天，与 JWT 一致

/** 把 JWT 写入 HttpOnly Cookie，前端 JS 无法读取，更安全 */
function setTokenCookie(res, user) {
  res.cookie('token', signToken(user), {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  });
}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

// ---------- 校验规则 ----------
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 返回错误消息字符串，通过则返回 null */
function checkPassword(val) {
  if (typeof val !== 'string' || val.length < 8) return '密码至少 8 位';
  if (!/[a-zA-Z]/.test(val)) return '密码需包含字母';
  if (!/\d/.test(val)) return '密码需包含数字';
  return null;
}

/** 校验用户名，返回错误消息或 null */
function checkUsername(val) {
  if (typeof val !== 'string' || !USERNAME_RE.test(val)) {
    return '用户名需为 3-20 位字母、数字或下划线';
  }
  return null;
}

/** 校验邮箱，返回错误消息或 null（允许为空） */
function checkEmail(val) {
  if (!val) return null;
  if (typeof val !== 'string' || !EMAIL_RE.test(val)) return '邮箱格式不正确';
  return null;
}

// ---------- 防暴力登录（进程内内存记录） ----------
const MAX_ATTEMPTS = 5; // 连续失败次数
const LOCK_MS = 5 * 60 * 1000; // 锁定 5 分钟
const attempts = new Map(); // username -> { count, lockUntil }

// 邮箱找回密验证码：username -> { code, expiresAt, sentAt, tries }
const resetCodes = new Map();
const RESET_CODE_TTL = 10 * 60 * 1000; // 10 分钟有效
const RESET_RESEND_GAP = 60 * 1000;   // 60 秒内不得重发
const RESET_MAX_TRIES = 5;

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); } // 6 位数字
function pruneResetCodes() {
  const now = Date.now();
  for (const [k, v] of resetCodes) if (v.expiresAt < now) resetCodes.delete(k);
}

function getLock(username) {
  const r = attempts.get(username);
  if (!r || !r.lockUntil) return null; // 未锁定
  if (Date.now() > r.lockUntil) {
    attempts.delete(username);
    return null;
  }
  return r;
}

function recordFailure(username) {
  const r = attempts.get(username) || { count: 0, lockUntil: 0 };
  r.count += 1;
  if (r.count >= MAX_ATTEMPTS) {
    r.lockUntil = Date.now() + LOCK_MS;
    r.count = 0;
    attempts.set(username, r);
    return { locked: true, remain: MAX_ATTEMPTS };
  }
  r.remain = MAX_ATTEMPTS - r.count;
  attempts.set(username, r);
  return { locked: false, remain: r.remain };
}

export async function register(req, res) {
  const { username, password, email, nickname } = req.body;

  const uErr = checkUsername(username);
  if (uErr) return res.status(400).json({ message: uErr });
  const pErr = checkPassword(password);
  if (pErr) return res.status(400).json({ message: pErr });
  const eErr = checkEmail(email);
  if (eErr) return res.status(400).json({ message: eErr });

  if (await one('SELECT id FROM users WHERE username = ?', username)) {
    return res.status(400).json({ message: '用户名已存在' });
  }
  if (email && await one('SELECT id FROM users WHERE email = ?', email)) {
    return res.status(400).json({ message: '邮箱已被使用' });
  }

  const hash = await bcrypt.hash(password, 10);
  const id = await insert('users', {
    username,
    password: hash,
    email: email || null,
    nickname: nickname || username,
    role: 'student',
  });
  const user = await findById('users', id);

  // 注册成功后自动登录，token 写入 HttpOnly Cookie
  setTokenCookie(res, user);
  res.status(201).json({ message: '注册成功', user: publicUser(user) });
}

export async function login(req, res) {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ message: '用户名不能为空' });

  const lock = getLock(username);
  if (lock) {
    const sec = Math.ceil((lock.lockUntil - Date.now()) / 1000);
    return res.status(429).json({ message: `失败次数过多，账号已锁定，请 ${sec} 秒后重试` });
  }

  const user = await one('SELECT * FROM users WHERE username = ?', username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const r = recordFailure(username);
    if (r.locked) {
      return res.status(429).json({ message: '失败次数过多，账号已锁定 5 分钟' });
    }
    return res.status(401).json({ message: `用户名或密码错误（还可重试 ${r.remain} 次）` });
  }

  attempts.delete(username); // 成功登录清除记录
  setTokenCookie(res, user);
  res.json({ message: '登录成功', user: publicUser(user) });
}

/** 退出登录：清理 HttpOnly Cookie */
export function logout(req, res) {
  res.clearCookie('token', { path: '/' });
  res.json({ message: '已退出登录' });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const { nickname, email, major, grade, avatar } = req.body;

  // 若修改邮箱，校验格式与唯一性
  if (typeof email === 'string') {
    const eErr = checkEmail(email);
    if (eErr) return res.status(400).json({ message: eErr });
    const dup = await one('SELECT id FROM users WHERE email = ? AND id != ?', email, req.user.id);
    if (dup) return res.status(400).json({ message: '邮箱已被使用' });
  }

  await update('users', req.user.id, { nickname, email, major, grade, avatar });
  res.json({ user: publicUser(await findById('users', req.user.id)) });
}

/** 修改密码：需验证旧密码 */
export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: '旧密码和新密码必填' });
  if (oldPassword === newPassword) return res.status(400).json({ message: '新密码不能与旧密码相同' });

  const pErr = checkPassword(newPassword);
  if (pErr) return res.status(400).json({ message: pErr });

  const user = await findById('users', req.user.id);
  if (!(await bcrypt.compare(oldPassword, user.password))) {
    return res.status(400).json({ message: '旧密码不正确' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await update('users', req.user.id, { password: hash });
  res.json({ message: '密码修改成功' });
}

/** 忘记密码：用户名 + 邮箱匹配验证后重置 */
/** 忘记密码第一步：向绑定邮箱发送 6 位验证码。body:{ username, email } */
export async function sendResetCode(req, res) {
  const { username, email } = req.body;
  if (!username || !email) return res.status(400).json({ message: '用户名和邮箱必填' });

  const user = await one('SELECT * FROM users WHERE username = ?', username);
  // 不泄露账号是否存在：无论匹配与否，都返回同一提示（但若存在必须校验邮箱）
  if (!user || !user.email || user.email !== email) {
    return res.status(400).json({ message: '用户名与邮箱不匹配或邮箱未绑定' });
  }

  pruneResetCodes();
  const rec = resetCodes.get(username);
  if (rec && Date.now() - rec.sentAt < RESET_RESEND_GAP) {
    return res.status(429).json({ message: '验证码已发送，请 60 秒后再试' });
  }

  const code = genCode();
  resetCodes.set(username, { code, expiresAt: Date.now() + RESET_CODE_TTL, sentAt: Date.now(), tries: 0 });

  const sent = await sendMail({
    to: user.email,
    subject: '【职引】找回密码验证码',
    text: `你的验证码是：${code}，10 分钟内有效。若非本人操作请忽略本邮件。`,
    html: `<p>你的验证码是：<b style="font-size:20px">${code}</b></p><p>10 分钟内有效。若非本人操作请忽略本邮件。</p>`,
  });

  // 开发模式（未配置 SMTP）：无法真发信，把验证码放进响应便于联通调试；配好 SMTP 后自动走真实发送。
  if (sent.dev) {
    return res.json({ message: '邮件服务未配置 SMTP，已进入开发模式（验证码将在控制台/响应中显示）', dev: true, code, email: user.email });
  }
  if (!sent.ok) return res.status(500).json({ message: '邮件发送失败：' + (sent.error || '未知错误') });
  res.json({ message: '验证码已发送到绑定邮箱，请查收' });
}

/** 忘记密码第二步：校验验证码后重置。body:{ username, email, code, newPassword } */
export async function resetPassword(req, res) {
  const { username, email, code, newPassword } = req.body;
  if (!username || !email || !code) return res.status(400).json({ message: '用户名、邮箱和验证码必填' });
  const pErr = checkPassword(newPassword);
  if (pErr) return res.status(400).json({ message: pErr });

  const user = await one('SELECT * FROM users WHERE username = ?', username);
  if (!user || !user.email || user.email !== email) {
    return res.status(400).json({ message: '用户名与邮箱不匹配或邮箱未绑定' });
  }

  pruneResetCodes();
  const rec = resetCodes.get(username);
  if (!rec) return res.status(400).json({ message: '验证码不存在或已过期，请重新获取' });

  if (rec.code !== String(code).trim()) {
    rec.tries += 1;
    if (rec.tries >= RESET_MAX_TRIES) {
      resetCodes.delete(username);
      return res.status(429).json({ message: '验证码错误次数过多，请重新获取' });
    }
    return res.status(400).json({ message: '验证码错误，请重新输入' });
  }

  resetCodes.delete(username);
  const hash = await bcrypt.hash(newPassword, 10);
  await update('users', user.id, { password: hash });
  attempts.delete(username); // 重置后解除锁定
  res.json({ message: '密码重置成功，请使用新密码登录' });
}