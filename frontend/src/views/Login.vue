<template>
  <div class="login-wrap" :class="{ 'beaming': transitionOn }">
    <!-- 动漫雾海灯塔底图 -->
    <div class="bg-anime"></div>
    <!-- 右下角海面渐晕遮罩（盖住角落水印，贴合海面底色） -->
    <div class="corner-mask"></div>
    <!-- 薄雾飘移层 -->
    <div class="fog-drift"></div>
    <!-- 灯塔暖光呼吸 -->
    <div class="lamp-glow"></div>
    <!-- 登录成功白闪过渡层 -->
    <div class="beaming-flash"></div>

    <el-card class="login-card">
      <div class="brand">
        <SiteLogo tone="light" />
        <p class="slogan">为你的大学生涯定方向</p>
      </div>
      <el-tabs v-model="mode" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form ref="loginRef" :model="loginForm" :rules="loginRules" @submit.prevent>
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" placeholder="用户名" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="密码" show-password @keyup.enter="doLogin" />
            </el-form-item>
            <el-button type="primary" style="width:100%" :loading="loading" @click="doLogin">登录</el-button>
            <div class="row-between">
              <el-button link type="primary" @click="openForgot">忘记密码？</el-button>
              <span></span>
            </div>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form ref="regRef" :model="regForm" :rules="regRules" @submit.prevent>
            <el-form-item prop="username">
              <el-input v-model="regForm.username" placeholder="用户名（3-20位字母/数字/_）" />
            </el-form-item>
            <el-form-item prop="nickname">
              <el-input v-model="regForm.nickname" placeholder="昵称（选填）" />
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="regForm.email" placeholder="邮箱（必填，用于找回密码）" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="regForm.password" type="password" placeholder="密码（至少8位，含字母和数字）" show-password />
            </el-form-item>
            <el-form-item prop="confirm">
              <el-input v-model="regForm.confirm" type="password" placeholder="确认密码" show-password @keyup.enter="doRegister" />
            </el-form-item>
            <el-button type="primary" style="width:100%" :loading="loading" @click="doRegister">注册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 忘记密码弹窗 -->
    <el-dialog v-model="forgotVisible" title="找回密码" width="380px">
      <p class="forgot-tip">输入用户名与绑定邮箱，获取验证码后即可重置密码。</p>
      <el-form ref="forgotRef" :model="forgotForm" :rules="forgotRules">
        <el-form-item prop="username">
          <el-input v-model="forgotForm.username" placeholder="用户名" @change="codeSent = false" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="forgotForm.email" placeholder="绑定邮箱" @change="codeSent = false" />
        </el-form-item>
        <el-form-item prop="code">
          <div class="code-row">
            <el-input v-model="forgotForm.code" placeholder="6 位邮箱验证码" @keyup.enter="doForgot" />
            <el-button type="primary" :loading="sendingCode" :disabled="codeCountdown > 0" @click="sendCode">
              {{ codeCountdown > 0 ? `${codeCountdown}s 后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item prop="newPassword">
          <el-input v-model="forgotForm.newPassword" type="password" placeholder="新密码（至少8位，含字母和数字）" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="forgotVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" :disabled="!codeSent" @click="doForgot">重置密码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import http from '../api';
import { useUserStore } from '../store/user';
import SiteLogo from '../components/SiteLogo.vue';

const router = useRouter();
const userStore = useUserStore();
const mode = ref('login');
const loading = ref(false);
const transitionOn = ref(false);

const loginRef = ref();
const regRef = ref();
const forgotRef = ref();
const forgotVisible = ref(false);

const loginForm = reactive({ username: '', password: '' });
const regForm = reactive({ username: '', nickname: '', email: '', password: '', confirm: '' });
const forgotForm = reactive({ username: '', email: '', code: '', newPassword: '' });
const sendingCode = ref(false);
const codeSent = ref(false);
const codeCountdown = ref(0);
let countdownTimer = null;

// 通用密码校验器（与后端规则一致）
function passwordValidator(rule, value, cb) {
  if (!value) return cb(new Error('请输入密码'));
  if (value.length < 8) return cb(new Error('密码至少 8 位'));
  if (!/[a-zA-Z]/.test(value)) return cb(new Error('需包含字母'));
  if (!/\d/.test(value)) return cb(new Error('需包含数字'));
  cb();
}

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const regRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20位字母、数字或下划线', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [{ validator: passwordValidator, trigger: 'blur' }],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, cb) =>
        value === regForm.password ? cb() : cb(new Error('两次输入的密码不一致')),
      trigger: 'blur',
    },
  ],
};

const forgotRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入绑定邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  newPassword: [{ validator: passwordValidator, trigger: 'blur' }],
  code: [{ required: true, message: '请输入邮箱验证码', trigger: 'blur' }],
};

function openForgot() {
  forgotForm.username = loginForm.username;
  forgotForm.email = '';
  forgotForm.code = '';
  codeSent.value = false;
  forgotVisible.value = true;
}

async function doLogin() {
  await loginRef.value.validate();
  loading.value = true;
  try {
    const data = await http.post('/auth/login', loginForm);
    userStore.setLogin(data.user);
    ElMessage.success('登录成功');
    // 灯塔光柱横扫过渡后进入主界面
    transitionOn.value = true;
    setTimeout(() => router.push('/'), 1150);
  } finally {
    loading.value = false;
  }
}

async function doRegister() {
  await regRef.value.validate();
  loading.value = true;
  try {
    const data = await http.post('/auth/register', {
      username: regForm.username,
      nickname: regForm.nickname,
      email: regForm.email,
      password: regForm.password,
    });
    userStore.setLogin(data.user); // 注册成功自动登录
    ElMessage.success('注册成功');
    router.push('/');
  } finally {
    loading.value = false;
  }
}

async function sendCode() {
  if (!forgotForm.username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotForm.email)) {
    ElMessage.warning('请先填写用户名和正确的邮箱');
    return;
  }
  sendingCode.value = true;
  try {
    const data = await http.post('/auth/forgot/send-code', { username: forgotForm.username, email: forgotForm.email });
    forgotForm.code = data.code || forgotForm.code; // 开发模式（未配 SMTP）后端会回传验证码便于联调
    codeSent.value = true;
    ElMessage.success(data.dev ? `开发模式已生成验证码（见下方输入框/日志）` : '验证码已发送到邮箱');
    // 倒计时 60s 才可重发
    codeCountdown.value = 60;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      codeCountdown.value -= 1;
      if (codeCountdown.value <= 0) { clearInterval(countdownTimer); countdownTimer = null; }
    }, 1000);
  } catch (e) {
    ElMessage.error(e?.message || '发送失败');
  } finally {
    sendingCode.value = false;
  }
}

async function doForgot() {
  await forgotRef.value.validate();
  loading.value = true;
  try {
    await http.post('/auth/forgot', forgotForm);
    ElMessage.success('密码重置成功，请登录');
    forgotVisible.value = false;
    mode.value = 'login';
    loginForm.password = '';
  } finally {
    loading.value = false;
  }
}

</script>

<style scoped>
.login-wrap {
  min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
  background: #1a2330; /* 备底色 */
  color: var(--on-brand, #fff);
}
/* ===== 动漫雾海灯塔底图（新海诚风 · 左置小灯塔 · 冷调单色 + 唯一暖光） ===== */
.bg-anime {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; background-size: cover; background-position: center;
  background-image: url('../assets/login-sea-anime-lite.jpg');
  animation: kenburns 36s ease-in-out infinite alternate;
}
@keyframes kenburns { 0% { transform: scale(1.03); } 100% { transform: scale(1.10); } }

/* ===== 右下角极轻渐晕（仅柔化角落，盖住水印但不产生明显阴影） ===== */
.corner-mask {
  position: absolute; right: 0; bottom: 0; width: 26%; height: 22%; z-index: 1; pointer-events: none;
  background: linear-gradient(135deg, transparent 0%, rgba(62,80,102,.6) 90%);
  filter: blur(3px);
}

/* ===== 薄雾飘移层 ===== */
.fog-drift {
  position: absolute; left: 0; right: 0; bottom: 0; height: 50%; z-index: 1; pointer-events: none;
  background: radial-gradient(60% 70% at 30% 100%, rgba(190,204,220,.22), transparent 70%),
              radial-gradient(50% 60% at 75% 90%, rgba(190,204,220,.16), transparent 70%);
  filter: blur(14px);
  animation: fogDrift 22s ease-in-out infinite;
}
@keyframes fogDrift { 0%,100% { transform: translateX(-2%); opacity: .6; } 50% { transform: translateX(2%); opacity: .85; } }

/* ===== 灯塔暖光呼吸（对准左侧小灯塔的暖光） ===== */
.lamp-glow {
  position: absolute; left: 27%; top: 30%; width: 130px; height: 130px; z-index: 1; pointer-events: none;
  border-radius: 50%; transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(255,224,150,.5), rgba(255,200,120,.18) 45%, transparent 72%);
  filter: blur(5px);
  animation: lampGlow 4.5s ease-in-out infinite;
}
@keyframes lampGlow { 0%,100% { opacity: .6; } 50% { opacity: 1; } }

/* 登录成功：白色闪烁过渡层 */
.beaming-flash {
  position: absolute; inset: 0; z-index: 9; pointer-events: none; opacity: 0; background: #fff;
}
.login-wrap.beaming .beaming-flash { animation: beamingFlash 1.1s ease-in-out forwards; }
@keyframes beamingFlash {
  0%   { opacity: 0; }
  40%  { opacity: 1; }
  100% { opacity: 0; }
}

.login-card {
  width: 400px; padding: 22px 24px 12px; position: relative; z-index: 2;
  border-radius: var(--radius-lg); backdrop-filter: blur(16px) saturate(130%);
  background: color-mix(in srgb, #0d1835 78%, transparent);
  border: 1px solid rgba(160,200,255,.18);
  color: var(--on-brand, #fff);
  box-shadow: 0 30px 70px -20px rgba(0,0,20,.6);
}
.login-card::before {
  content: ''; position: absolute; top: 0; left: 24px; right: 24px; height: 3px; border-radius: 0 0 6px 6px;
  background: linear-gradient(90deg, #4f8bff, #9fc6ff, #69f0d0);
}
.brand { display: flex; flex-direction: column; align-items: center; margin: 4px 0 18px; }
.slogan { margin: 10px 0 0; color: rgba(220,235,255,.8); font-size: 13px; letter-spacing: 3px; }
.row-between { display: flex; justify-content: space-between; margin-top: 4px; }
.tip { margin-top: 12px; color: rgba(200,220,255,.65); font-size: 12px; text-align: center; }
.forgot-tip { color: rgba(220,235,255,.8); font-size: 13px; margin: 0 0 12px; }
.code-row { display: flex; gap: 8px; width: 100%; }
.code-row .el-input { flex: 1; }
.code-row .el-button { flex: 0 0 auto; white-space: nowrap; }

/* 登录卡片表单/输入框在深色底上的覆盖 */
.login-card :deep(.el-input__wrapper) { background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(160,200,255,.15); }
.login-card :deep(.el-input__inner) { color: #eaf2ff; }
.login-card :deep(.el-tabs__item) { color: rgba(210,228,255,.7); }
.login-card :deep(.el-tabs__item.is-active) { color: #9fc6ff; }
.login-card :deep(.el-tabs__active-bar) { background: #9fc6ff; }

@media (max-width: 768px) {
  .login-wrap { align-items: flex-start; justify-content: center; padding: 24px 14px; overflow: auto; }
  .login-card { width: 100%; max-width: 400px; margin: auto; padding: 20px 16px 12px; }
  .lamp-glow { display: none; }
  .corner-mask { display: none; }
  .code-row .el-button { font-size: 13px; padding: 0 10px; }
}
</style>
