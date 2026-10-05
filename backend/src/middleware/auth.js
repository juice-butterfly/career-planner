import jwt from 'jsonwebtoken';
import { findById } from '../repos/base.js';

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    // 优先 HttpOnly Cookie，兼容旧的 Authorization 头
    const token = req.cookies?.token || bearer;
    if (!token) return res.status(401).json({ message: '未登录' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findById('users', decoded.id);
    if (!user) return res.status(401).json({ message: '用户不存在' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: '登录已过期' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: '无权限' });
}