import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import * as assess from '../controllers/assessmentController.js';
import * as career from '../controllers/careerController.js';
import * as study from '../controllers/studyController.js';
import * as community from '../controllers/communityController.js';
import * as admin from '../controllers/adminController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as chat from '../controllers/chatController.js';
import * as resume from '../controllers/resumeController.js';
import * as school from '../controllers/schoolController.js';
import * as growth from '../controllers/growthController.js';
import * as contest from '../controllers/contestController.js';
import * as cert from '../controllers/certController.js';
import * as task from '../controllers/taskController.js';
import * as review from '../controllers/reviewController.js';
import { auth as authMw, adminOnly } from '../middleware/auth.js';

const router = Router();

// 统一异步处理器包装：把每个 async 处理器产生的 rejection 交给 Express 错误中间件（→500），
// 避免 Express 4 无法自动捕获 async 抛错导致 unhandledRejection。中间件(3参)与处理器都包。
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
for (const m of ['get', 'post', 'put', 'delete', 'patch']) {
  const orig = router[m].bind(router);
  router[m] = (path, ...handlers) => orig(path, ...handlers.map((h) => (h.length >= 4 ? h : asyncHandler(h))));
}

// 认证
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);
router.post('/auth/forgot', auth.resetPassword); // 忘记密码第二步：验证码校验后重置
router.post('/auth/forgot/send-code', auth.sendResetCode); // 忘记密码第一步：发送邮箱验证码
router.get('/auth/me', authMw, auth.me);
router.put('/auth/profile', authMw, auth.updateProfile);
router.put('/auth/password', authMw, auth.changePassword); // 修改密码：需旧密码

// 测评
router.get('/assessment/questions', authMw, assess.getQuestions);
router.post('/assessment/submit', authMw, assess.submit);
router.get('/assessment/mine', authMw, assess.myAssessments);

// 职业资源
router.get('/industries', career.listIndustries);
router.get('/jobs', career.listJobs);
router.get('/jobs/:id', career.getJob);

// 深造路径（考研/保研/学术）
router.get('/study/paths', study.listStudyPaths);
router.get('/study/paths/:key', study.getStudyPathByKey);
// 深造中心：保研 / 考研 / 考公 内容 + 一键生成规划
router.get('/study/center/baoyan', authMw, study.getBaoyanCenter);
router.get('/study/center/kaoyan', authMw, study.getKaoyanCenter);
router.get('/study/center/kaozhao', authMw, study.getKaozhaoCenter);
router.get('/study/abroad', authMw, study.getStudyAbroad);
router.post('/study/center/plan', authMw, study.buildCenterPlan);
// 深造中心增强：升学档案 + AI 定位 + 日历 + 考公向导 + 院校订阅追踪
router.get('/study/profile', authMw, study.getStudyProfile);
router.put('/study/profile', authMw, study.saveStudyProfile);
router.post('/study/position/baoyan', authMw, study.startBaoyanPosition);
router.post('/study/position/kaoyan', authMw, study.startKaoyanSchool);
router.post('/study/position/abroad', authMw, study.startAbroadPosition);
router.get('/study/reports/:kind', authMw, study.latestReport);
router.get('/study/calendar', authMw, study.getCalendar);
router.get('/study/wizard/positions', authMw, study.wizardPositions);
router.get('/study/subscriptions', authMw, study.listSubscriptions);
router.post('/study/subscriptions', authMw, study.addSubscription);
router.delete('/study/subscriptions/:id', authMw, study.deleteSubscription);
router.post('/study/subscriptions/:id/to-plan', authMw, study.subscriptionToPlan);
router.post('/plans', authMw, career.savePlan);
router.get('/plans/mine', authMw, career.myPlans);
router.put('/plans/:id', authMw, career.updateProgress);
router.post('/plans/:id/items', authMw, career.addPlanItem);
router.put('/plans/items/:itemId', authMw, career.updatePlanItem);
router.delete('/plans/items/:itemId', authMw, career.deletePlanItem);
router.post('/plans/items/:itemId/review', authMw, review.reviewPlanItem); // 事项级 AI 复盘 + 回写
router.delete('/plans/:id', authMw, career.deletePlan);

// 论坛
router.get('/posts', community.listPosts);
router.get('/posts/ranking', community.listRanking);
router.get('/posts/my', authMw, community.myPosts);
router.get('/favorites', authMw, community.myFavorites);
router.post('/posts', authMw, community.createPost);
router.post('/posts/:id/like', authMw, community.likePost);
router.post('/posts/:id/favorite', authMw, community.favoritePost);
router.delete('/posts/:id/favorite', authMw, community.unfavoritePost);
router.post('/posts/:id/pin', authMw, community.pinPost);
router.get('/posts/:id/comments', community.listComments);
router.post('/posts/:id/comments', authMw, community.addComment);
// 独立详情页
router.get('/posts/:id', community.getPost);

// 举报（登录用户）
router.post('/posts/:id/report', authMw, community.reportPost);
router.post('/comments/:id/report', authMw, community.reportComment);
// 评论点赞
router.post('/comments/:id/like', authMw, community.likeComment);

// 积分（个人）
router.get('/points/balance', authMw, community.getPointsBalance);
router.get('/points/ledger', authMw, community.getPointsLedger);

// 管理端：待审/审核/删除/举报处理/违禁词（仅管理员）
router.get('/admin/posts/pending', authMw, adminOnly, community.listPendingPosts);
router.post('/admin/posts/:id/approve', authMw, adminOnly, community.approvePost);
router.post('/admin/posts/:id/reject', authMw, adminOnly, community.rejectPost);
router.delete('/admin/posts/:id', authMw, adminOnly, community.deletePost);
router.get('/admin/reports', authMw, adminOnly, community.listReports);
router.post('/admin/reports/:id/handle', authMw, adminOnly, community.handleReport);
router.get('/admin/sensitive-words', authMw, adminOnly, community.listSensitiveWords);
router.post('/admin/sensitive-words', authMw, adminOnly, community.createSensitiveWord);
router.delete('/admin/sensitive-words/:id', authMw, adminOnly, community.deleteSensitiveWord);

// 题库 & AI 求职赋能
router.get('/questions', community.listQuestions);
router.post('/ai/interview', authMw, community.interview);
router.post('/ai/resume', authMw, community.optimizeResume);

// 简历制作 & 优化（增强版）
router.post('/resume/optimize', authMw, resume.optimizeResume);
router.post('/resume/generate', authMw, resume.generateResume);
router.post('/resume/polish', authMw, resume.polishText);
router.get('/resume/list', authMw, resume.listResumes);
router.get('/resume/match', authMw, resume.matchResume);
router.get('/resume/:id', authMw, resume.getResume);
router.post('/resume', authMw, resume.saveResume);
router.put('/resume/:id', authMw, resume.updateResume);
router.delete('/resume/:id', authMw, resume.deleteResume);
router.post('/resume/:id/lock', authMw, resume.lockResume);
router.post('/resume/:id/unlock', authMw, resume.unlockResume);

// 个人主页看板
router.get('/dashboard/overview', authMw, dashboard.overview);

// 成长体系：等级 / 成就 / 每日签到
router.get('/growth', authMw, growth.getGrowth);
router.post('/growth/checkin', authMw, growth.checkin);

// 学科竞赛库
router.get('/contests', authMw, contest.listContests);
router.get('/contests/recommend', authMw, contest.recommendContests);
router.get('/contests/mine', authMw, contest.myContestPlans);
router.get('/contests/for-job/:jobId', authMw, contest.contestsForJob);
router.post('/contests/seed', authMw, adminOnly, contest.seedContests);
router.get('/contests/:id', authMw, contest.getContest);
router.post('/contests/:id/plan', authMw, contest.addContestToPlan);

// 证书库（通用/专业）
router.get('/certificates', authMw, cert.listCertificates);
router.get('/certificates/categories', authMw, cert.certCategories);
router.get('/certificates/recommend', authMw, cert.recommendCerts);
router.post('/certificates/seed', authMw, adminOnly, cert.seedCertificates);
router.get('/certificates/:id', authMw, cert.getCertificate);
router.post('/certificates/:id/plan', authMw, cert.addCertToPlan);

// AI 职业顾问
router.get('/chat/sessions', authMw, chat.listSessions);
router.post('/chat/sessions', authMw, chat.createSession);
router.delete('/chat/sessions/:id', authMw, chat.deleteSession);
router.get('/chat/sessions/:id/messages', authMw, chat.getMessages);
router.post('/chat/sessions/:id/messages', authMw, chat.sendMessage);
router.post('/chat/sessions/:id/messages/stream', authMw, chat.sendMessageStream);

// 管理端
router.get('/admin/users', authMw, adminOnly, admin.listUsers);
router.put('/admin/users/:id/role', authMw, adminOnly, admin.toggleUserRole);
router.delete('/admin/users/:id', authMw, adminOnly, admin.deleteUser);
router.post('/admin/industries', authMw, adminOnly, admin.createIndustry);
router.put('/admin/industries/:id', authMw, adminOnly, admin.updateIndustry);
router.delete('/admin/industries/:id', authMw, adminOnly, admin.deleteIndustry);
router.post('/admin/jobs', authMw, adminOnly, admin.createJob);
router.put('/admin/jobs/:id', authMw, adminOnly, admin.updateJob);
router.delete('/admin/jobs/:id', authMw, adminOnly, admin.deleteJob);
router.post('/admin/questions', authMw, adminOnly, admin.createQuestion);
router.put('/admin/questions/:id', authMw, adminOnly, admin.updateQuestion);
router.delete('/admin/questions/:id', authMw, adminOnly, admin.deleteQuestion);

// 学校化知识库（升学/考公/就业/培养方案 + 抓取管理）
router.get('/school/profile', authMw, school.profile);
router.get('/school/colleges', authMw, school.listColleges);
router.get('/school/directions', authMw, school.listDirections);
router.get('/school/docs', authMw, school.listDocs);
router.get('/school/docs/:id', authMw, school.getDoc);
router.delete('/school/docs/:id', authMw, adminOnly, school.deleteDoc);
router.post('/school/crawl', authMw, adminOnly, school.triggerCrawl);
router.get('/school/crawl-logs', authMw, school.listLogs);
router.put('/school/settings', authMw, adminOnly, school.updateSettings);
router.get('/school/curriculums', authMw, school.listCurriculumsHandler);
router.get('/school/curriculums/:id', authMw, school.getCurriculumDetail);
router.post('/school/curriculums/:id/interpret', authMw, school.interpretCurriculum);

// 异步任务：查询后台生成任务的状态/进度/结果
router.get('/tasks/:id', authMw, task.taskStatus);

export default router;