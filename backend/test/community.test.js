import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let dbFile;
let base;
let community;

before(async () => {
  dbFile = path.join(tmpdir(), `community-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  process.env.DB_PATH = dbFile;
  base = await import('../src/repos/base.js');
  community = await import('../src/controllers/communityController.js');
});

after(() => {
  for (const suf of ['', '-wal', '-shm']) {
    try { fs.rmSync(dbFile + suf); } catch { /* ignore */ }
  }
});

function mockRes() {
  const res = { _status: 200, _body: null };
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  return res;
}

/** 造一个经验帖，返回 { userId, postId } */
async function makePost(over = {}) {
  const userId = await base.insert('users', { username: `u-${Date.now()}-${Math.random().toString(36).slice(2)}`, password: 'x' });
  await base.insert('users', { username: `v-${Date.now()}-${Math.random().toString(36).slice(2)}`, password: 'x' });
  const postId = await base.insert('posts', {
    userId,
    title: '测试帖',
    content: '测试内容',
    board: over.board || 'experience',
    anon: over.anon ?? 1,
    status: 'approved',
  });
  return { userId, postId };
}

function req(over = {}) {
  return {
    params: over.params || {},
    query: over.query || {},
    body: over.body || {},
    user: over.user ? { id: over.user } : undefined,
  };
}

test('getPost：公开帖可读，带 pinned/favorited 字段', async () => {
  const { postId } = await makePost();
  const res = mockRes();
  await community.getPost(req({ params: { id: postId }, user: null }), res);
  assert.equal(res._status, 200);
  const p = res._body.post;
  assert.equal(p.id, postId);
  assert.equal(p.board, 'experience');
  assert.equal(typeof p.pinned, 'boolean');
  assert.equal(p.favorited, false);
  assert.ok(p.author && p.author.username);
});

test('getPost：非公开帖仅本人或管理员可见', async () => {
  const userId = await base.insert('users', { username: `u-${Date.now()}`, password: 'x' });
  const postId = await base.insert('posts', { userId, title: 'x', content: 'x', board: 'experience', status: 'pending' });
  // 匿名访客 → 404
  const anonRes = mockRes();
  await community.getPost(req({ params: { id: postId }, user: null }), anonRes);
  assert.equal(anonRes._status, 404);
  assert.equal(anonRes._body.message, '帖子不存在');
  // 本人可见
  const ownerRes = mockRes();
  await community.getPost(req({ params: { id: postId }, user: userId }), ownerRes);
  assert.equal(ownerRes._status, 200);
});

test('评论 + 回复：主评论写入、回复挂 parentId 且两级', async () => {
  const { postId } = await makePost();
  const u1 = await base.insert('users', { username: `a-${Date.now()}`, password: 'x' });
  const u2 = await base.insert('users', { username: `b-${Date.now()}`, password: 'x' });

  // 主评论
  const res1 = mockRes();
  await community.addComment(req({ params: { id: postId }, body: { content: '主评论' }, user: u1 }), res1);
  assert.equal(res1._status, 201);
  const mainId = res1._body.comment.id;
  assert.equal(res1._body.comment.parentId, null);

  // 回复主评论
  const res2 = mockRes();
  await community.addComment(req({ params: { id: postId }, body: { content: '回复1', parentId: mainId }, user: u2 }), res2);
  const replyId = res2._body.comment.id;
  assert.equal(res2._body.comment.parentId, mainId);

  // 回复的回复 → 拒绝（最多两级）
  const res3 = mockRes();
  await community.addComment(req({ params: { id: postId }, body: { content: '三级回复', parentId: replyId }, user: u1 }), res3);
  assert.equal(res3._status, 400);

  // 列表：两级结构，主评论带 replies
  const listRes = mockRes();
  await community.listComments(req({ params: { id: postId } }), listRes);
  const mains = listRes._body.list;
  assert.equal(mains.length, 1);
  assert.equal(mains[0].id, mainId);
  assert.equal(mains[0].replies.length, 1);
  assert.equal(mains[0].replies[0].id, replyId);
  assert.equal(mains[0].replies[0].liked, false);
});

test('评论点赞：点赞 +1、幂等不重复、取消成功', async () => {
  const { postId } = await makePost();
  const u1 = await base.insert('users', { username: `c-${Date.now()}`, password: 'x' });
  const u2 = await base.insert('users', { username: `d-${Date.now()}`, password: 'x' });
  const cid = await base.insert('comments', { postId, userId: u1, content: '待赞' });

  const r1 = mockRes();
  await community.likeComment(req({ params: { id: cid }, user: u2 }), r1);
  assert.deepEqual(r1._body, { liked: true, likes: 1 });

  const r2 = mockRes();
  await community.likeComment(req({ params: { id: cid }, user: u2 }), r2); // 重复 → 取消
  assert.deepEqual(r2._body, { liked: false, likes: 0 });

  // 另一用户点赞 → 1
  const r3 = mockRes();
  await community.likeComment(req({ params: { id: cid }, user: u1 }), r3);
  assert.deepEqual(r3._body, { liked: true, likes: 1 });
});

test('评论排序：liked 按点赞数倒序', async () => {
  const { postId } = await makePost();
  const u1 = await base.insert('users', { username: `s-${Date.now()}`, password: 'x' });
  const u2 = await base.insert('users', { username: `t-${Date.now()}`, password: 'x' });

  const c1 = await base.insert('comments', { postId, userId: u1, content: '低赞' });
  const c2 = await base.insert('comments', { postId, userId: u2, content: '高赞' });
  // 给 c2 点 2 次赞
  await community.likeComment(req({ params: { id: c2 }, user: u1 }), mockRes());
  const zid = await base.insert('users', { username: `z-${Date.now()}`, password: 'x' });
  await community.likeComment(req({ params: { id: c2 }, user: zid }), mockRes());

  const latestRes = mockRes();
  await community.listComments(req({ params: { id: postId }, query: { sort: 'latest' } }), latestRes);
  // latest 都无 parentId，顺序保持 createdAt 升序
  assert.equal(latestRes._body.list[0].id, c1);

  const likedRes = mockRes();
  await community.listComments(req({ params: { id: postId }, query: { sort: 'liked' } }), likedRes);
  assert.equal(likedRes._body.list[0].id, c2); // 高赞在前
});

test('树洞评论作者匿名遮蔽', async () => {
  const { postId } = await makePost({ board: 'treehole', anon: 1 });
  const u = await base.insert('users', { username: `anon-${Date.now()}`, password: 'x' });
  const cid = await base.insert('comments', { postId, userId: u, content: '匿名评论' });

  const listRes = mockRes();
  await community.listComments(req({ params: { id: postId } }), listRes);
  const c = listRes._body.list.find((x) => x.id === cid);
  assert.ok(c.author.username.startsWith('树洞用户'));
  assert.notEqual(c.author.username, `anon-${Date.now()}`);
});

test('帖子点赞：幂等，赞/取消赞往返，且带在列表 liked 态', async () => {
  const { postId } = await makePost();
  const u = await base.insert('users', { username: `pl-${Date.now()}`, password: 'x' });

  // 点赞 → liked=true, +1
  const r1 = mockRes();
  await community.likePost(req({ params: { id: postId }, user: u }), r1);
  assert.deepEqual(r1._body.liked, true);
  assert.equal(r1._body.likes, 1);

  // 再点 → 取消，回到 0
  const r2 = mockRes();
  await community.likePost(req({ params: { id: postId }, user: u }), r2);
  assert.deepEqual(r2._body.liked, false);
  assert.equal(r2._body.likes, 0);

  // 列表详情带 liked=false（仍未赞）
  const rowRes = mockRes();
  await community.getPost(req({ params: { id: postId }, user: u }), rowRes);
  assert.equal(rowRes._body.post.liked, false);

  // 再赞一次 → liked=true
  await community.likePost(req({ params: { id: postId }, user: u }), mockRes());
  const listRes = mockRes();
  await community.listPosts(req({ query: {}, user: u }), listRes);
  const mine = listRes._body.list.find((p) => p.id === postId);
  assert.equal(mine.liked, true);
  assert.equal(mine.likes, 1);
});