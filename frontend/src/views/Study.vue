<template>
  <div>
    <el-card class="head-card">
      <template #header>
        <div class="head-wrap">
          <b>深造中心</b>
          <span class="head-sub">保研 · 考研 · 留学——规则、加分、择校、留学攻略全在这里，可一键生成规划</span>
        </div>
      </template>
      <div class="head-row">
        <p class="intro">基于本校专业实际，给你可执行的升学路径。保研看规则与加分，考研看方向、科目与参考书，留学看各地申请条件与时间线。每个方向内容均可一键加入「我的规划」逐项打卡。考公/选调请前往侧边栏「考公选调」板块。</p>
        <div class="head-actions">
          <span v-if="profileFilled" class="prof-chip filled">已填档案 · 前 {{ profile.rankPct }}%</span>
          <span v-else class="prof-chip empty">未填升学档案</span>
          <el-button type="primary" @click="openProfile">升学档案</el-button>
        </div>
      </div>
    </el-card>

    <el-tabs v-model="tab" class="center-tabs" @tab-change="onTabChange">
      <!-- ============ 保研 ============ -->
      <el-tab-pane label="保研" name="baoyan">
        <el-card v-loading="baLoading" class="pane-card">
          <template v-if="ba">
            <h3 class="pane-title">{{ ba.title }}</h3>
            <p class="hint">{{ ba.desc }} <el-tag size="small" type="info" effect="light">以学校当年文件为准</el-tag></p>

            <div v-for="r in ba.rules" :key="r.title" class="rule-block">
              <b class="rule-title">{{ r.title }}</b>
              <ul class="rule-list" v-if="r.items">
                <li v-for="(it, i) in r.items" :key="i">{{ it }}</li>
              </ul>
              <p v-if="r.note" class="rule-note">{{ r.note }}</p>
            </div>

            <h3 class="pane-sub">加分清单（常见项，可在竞赛/证书中心查看详情）</h3>
            <div class="bonus-list">
              <div v-for="(it, i) in ba.bonusItems" :key="i" class="bonus-row" :class="{ linked: it.linked }">
                <span class="bonus-name">{{ it.name }}</span>
                <span v-if="it.tip" class="bonus-tip">{{ it.tip }}</span>
                <span class="bonus-actions">
                  <el-button v-if="it.linked && it.source === 'contest'" size="small" text @click="$router.push('/competition')">竞赛中心 →</el-button>
                  <el-button v-if="it.linked && it.source === 'cert' && it.certId" size="small" text @click="$router.push({ path: '/certificate', query: { id: it.certId } })">证书详情 →</el-button>
                  <span v-if="it.examTime" class="exam-time">考试 {{ it.examTime }}</span>
                </span>
              </div>
            </div>

            <!-- 本校官方推免奖励加分细则 -->
            <div v-if="ba.bonusRules" class="bonus-rules">
              <h3 class="pane-sub">本校官方推免奖励加分细则<span class="sub-badge">官方公示</span></h3>
              <p class="hint">{{ ba.bonusRules.formula }}</p>
              <p class="hint text-accent"><b>总则：</b>{{ ba.bonusRules.campusCap }}。以下为本校《推免工作管理办法》及各学院公示细则，具体以你所在学院当年实施细则为准。</p>

              <!-- 学院切换：默认选中当前专业所属学院，可下拉看其它学院 -->
              <div class="college-picker">
                <span class="picker-label">学院</span>
                <el-select v-model="ruleCollege" size="default" style="width: 240px" @change="onRuleCollegeChange">
                  <el-option v-for="n in ba.bonusRules.collegeNames" :key="n" :label="n" :value="n" />
                </el-select>
                <el-tag v-if="curRule.unpub" size="small" type="danger" effect="plain">该学院分值暂未公开</el-tag>
              </div>

              <div class="rule-col">
                <h4 class="rule-col-title">学校奖励加分（上限 75 分，全校统一）</h4>
                <div v-for="(r, i) in ba.bonusRules.campus" :key="'c' + i" class="rule-row">
                  <span class="rule-module">{{ r.module }}</span>
                  <span class="rule-name">{{ r.name }}</span>
                  <span class="rule-score" :style="scoreStyle(r.score)">{{ r.score }}</span>
                  <span class="rule-cond">{{ r.cond }}</span>
                </div>
              </div>

              <div class="rule-col">
                <h4 class="rule-col-title">{{ ruleCollege }} · 学院奖励加分（上限 25 分）</h4>
                <template v-if="curRule.editable && curRule.editable.length">
                  <div v-for="(r, i) in curRule.editable" :key="'e' + i" class="rule-row">
                    <span class="rule-module">{{ r.module }}</span>
                    <span class="rule-name">{{ r.name }}</span>
                    <span class="rule-score" :style="scoreStyle(r.score)">{{ r.score }}</span>
                    <span class="rule-cond">{{ r.cond }}</span>
                  </div>
                </template>
                <p v-else class="rule-empty">{{ curRule.source }}</p>
              </div>

              <p class="rule-source">来源：{{ curRule.source }}<span v-if="curRule.url"> · </span><a v-if="curRule.url" :href="curRule.url" target="_blank" rel="noopener" class="rule-link">查看原始公示 →</a></p>
            </div>

            <h3 class="pane-sub">院校分档（示例，以推免系统为准）</h3>
            <div class="col-tiers">
              <div v-for="c in ba.colleges" :key="c.tier" class="tier-col">
                <span class="tier-badge" :style="{ background: c.color, color: '#fff' }">{{ c.tier }}</span>
                <span class="tier-note">{{ c.note }}</span>
              </div>
            </div>

            <!-- AI 竞争力定位 -->
            <h3 class="pane-sub">AI 竞争力定位</h3>
            <div class="ai-card">
              <p class="ai-desc">结合你的成绩排名、英语水平与目标层次，AI 给出冲/稳/保院校与补短板行动清单。结果可保存回看、院校可一键订阅追踪。</p>
              <div v-if="baTask.status === 'done' && baTask.result" class="ai-report">
                <p class="ai-summary">{{ baTask.result.summary }}</p>
                <div class="ai-grid" v-if="baTask.result.strengths && baTask.result.strengths.length">
                  <div class="ai-col good">
                    <b>你的优势</b>
                    <ul><li v-for="(s, i) in baTask.result.strengths" :key="i">{{ s }}</li></ul>
                  </div>
                  <div class="ai-col warn">
                    <b>待补齐</b>
                    <ul><li v-for="(g, i) in baTask.result.gaps" :key="i">{{ g }}</li></ul>
                  </div>
                </div>
                <div class="ai-recs">
                  <b>推荐院校（{{ baTask.result.targetTier || '' }}）</b>
                  <div v-for="(r, i) in baTask.result.recommendations" :key="i" class="ai-rec-row">
                    <span class="rec-tier" :style="tierStyle(r.tier)">{{ r.tier }}</span>
                    <span class="rec-school">{{ r.school }}</span>
                    <span class="rec-reason">{{ r.reason }}</span>
                    <el-button size="small" type="primary" @click="subSchool(r.school, r.tier, 'baoyan')">订阅</el-button>
                  </div>
                </div>
                <div class="ai-actions" v-if="baTask.result.actions && baTask.result.actions.length">
                  <b>行动清单</b>
                  <ul><li v-for="(a, i) in baTask.result.actions" :key="i">{{ actText(a) }}</li></ul>
                </div>
              </div>
              <div v-else-if="baTask.status === 'pending'" class="ai-pending">
                <el-progress :percentage="baTask.progress" :stroke-width="10" />
                <p>AI 正在评估你的竞争力，请稍候…</p>
              </div>
              <div v-else-if="baTask.status === 'failed'" class="ai-fail">
                <p>{{ baTask.error }}</p>
                <el-button size="small" type="primary" @click="startBaoyanPosition">重试</el-button>
              </div>
              <el-button v-else type="primary" :loading="baTask.status === 'pending'" @click="startBaoyanPosition">生成我的保研定位 →</el-button>
            </div>

            <!-- 保研材料包 -->
            <h3 class="pane-sub">保研材料包（示例模板，以各校要求为准）</h3>
            <div class="mat-grid">
              <div v-for="m in ba.materials" :key="m.key" class="mat-card">
                <b class="mat-name">{{ m.name }}</b>
                <p class="mat-goal">{{ m.goal }}</p>
                <ul class="mat-outline"><li v-for="(o, i) in m.outline" :key="i">{{ o }}</li></ul>
                <el-button v-if="m.goToResume" size="small" type="primary" @click="$router.push('/resume')">去简历工作台 →</el-button>
                <p v-else class="mat-tip">{{ m.tip }}</p>
              </div>
            </div>

            <div class="pane-actions">
              <el-button type="primary" :loading="saving" @click="addPlan('baoyan')">一键生成保研规划 →</el-button>
              <el-button @click="$router.push('/study/baoyan')">查看四年路线图 →</el-button>
            </div>
          </template>
        </el-card>
      </el-tab-pane>

      <!-- ============ 考研 ============ -->
      <el-tab-pane label="考研" name="kaoyan">
        <el-card v-loading="kaLoading" class="pane-card">
          <template v-if="allMajors.length">
            <div class="major-row">
              <span class="major-label">我的本科专业</span>
              <el-select v-model="major" size="default" class="major-select" @change="loadKaoyan">
                <el-option v-for="m in allMajors" :key="m" :label="m" :value="m" />
              </el-select>
              <el-tag size="small" type="info" effect="light">约 88 个本科专业均可选，下方展示对应考研方案</el-tag>
            </div>

            <template v-if="dir">
              <h3 class="pane-title">{{ major }}</h3>
              <p class="hint"><b>推荐方向：</b>{{ (dir.directions || []).join(' · ') }}</p>

              <h3 class="pane-sub">考试科目（初试 + 复试）</h3>
              <div class="subj-grid">
                <div v-for="s in subjectArgs" :key="s.n" class="subj-chip" :style="{ background: party.colors[s.i % party.colors.length] }" :title="s.d">
                  <span class="subj-n">{{ s.n }}</span><span class="subj-d">{{ s.d }}</span>
                </div>
              </div>

              <h3 class="pane-sub">参考书目（版本/出版社，示例）</h3>
              <div class="book-list">
                <div v-for="(b, i) in dir.books" :key="i" class="book-row">
                  <span class="book-name">{{ b.name }}</span>
                  <span class="book-meta">{{ [b.author, b.edition, b.publisher].filter(Boolean).join(' · ') }}</span>
                </div>
              </div>

              <h3 class="pane-sub">院校分档（冲 / 稳 / 保，示例，可订阅追踪）</h3>
              <div class="tier-grid">
                <div v-for="(list, tier) in dir.schools" :key="tier" class="tier-row">
                  <span class="tier-badge" :style="{ background: TIER_COLOR[tier], color: '#fff' }">{{ { high: '冲', mid: '稳', base: '保' }[tier] }}</span>
                  <div class="tier-body">
                    <div v-for="s in list" :key="s.n" class="school-line"><b>{{ s.n }}</b><span class="tier-tip">{{ s.tip }}</span><el-button link size="small" class="quick-add" @click="quickAdd(s.n)">加入</el-button></div>
                  </div>
                </div>
              </div>

              <!-- 目标院校：学生自选，生成规划时写入 -->
              <h3 class="pane-sub">目标院校（自行选定，生成规划时一并加入）</h3>
              <div class="target-row">
                <el-input v-model="schoolInput" size="default" class="target-input" placeholder="输入目标院校，如：中南财经政法大学" @keyup.enter="addTarget" />
                <el-button size="default" type="primary" @click="addTarget">添加</el-button>
              </div>
              <div v-if="targetSchools.length" class="target-chips">
                <el-tag v-for="(s, i) in targetSchools" :key="i" closable size="default" class="target-chip" @close="removeTarget(i)">{{ s }}</el-tag>
              </div>
              <p class="target-hint">可点上方院校「加入」，也可自由输入多所；不填则默认加入报考方向示例。</p>

              <!-- AI 择校助手 -->
              <h3 class="pane-sub">AI 择校助手</h3>
              <div class="ai-card">
                <p class="ai-desc">按你的专业、排名与目标层次，AI 生成冲/稳/保择校清单与关键分数线门槛，院校可一键订阅追踪。</p>
                <div v-if="kaTask.status === 'done' && kaTask.result" class="ai-report">
                  <p class="ai-summary">{{ kaTask.result.summary }}</p>
                  <div class="ai-recs">
                    <b>推荐院校</b>
                    <div v-for="(r, i) in kaTask.result.recommendations" :key="i" class="ai-rec-row">
                      <span class="rec-tier" :style="tierStyle(r.tier)">{{ r.tier }}</span>
                      <span class="rec-school">{{ r.school }}</span>
                      <span class="rec-reason">{{ r.reason }}</span>
                      <el-button size="small" type="primary" @click="subSchool(r.school, r.tier, 'kaoyan')">订阅</el-button>
                    </div>
                  </div>
                  <div class="ai-thresh" v-if="kaTask.result.keyThresholds">
                    <b>关键分数线/门槛</b>
                    <p>{{ kaTask.result.keyThresholds }}</p>
                  </div>
                  <div v-if="kaTask.result.warnings && kaTask.result.warnings.length" class="ai-warn-list">
                    <b>提醒</b>
                    <ul><li v-for="(w, i) in kaTask.result.warnings" :key="i">{{ actText(w) }}</li></ul>
                  </div>
                </div>
                <div v-else-if="kaTask.status === 'pending'" class="ai-pending">
                  <el-progress :percentage="kaTask.progress" :stroke-width="10" />
                  <p>AI 正在匹配目标院校，请稍候…</p>
                </div>
                <div v-else-if="kaTask.status === 'failed'" class="ai-fail">
                  <p>{{ kaTask.error }}</p>
                  <el-button size="small" type="primary" @click="startKaoyanSchool">重试</el-button>
                </div>
                <el-button v-else type="primary" :loading="kaTask.status === 'pending'" @click="startKaoyanSchool">生成择校建议 →</el-button>
              </div>

              <div class="note-demo">* 科目与参考书为目的代表性示例，实际以报考院校当年《招生简章/专业目录》为准。</div>

              <div class="pane-actions">
                <el-button type="primary" :loading="saving" @click="addPlan('kaoyan')">一键生成考研规划 →</el-button>
                <el-button @click="$router.push('/study/kaoyan')">查看四年路线图 →</el-button>
              </div>
            </template>
          </template>
        </el-card>

        <el-card class="pane-card academic-note">
          <b>学术（读博 / 直博 / 硕转博）</b>
          <p class="hint">{{ kao && kao.academic ? kao.academic.mergedNote : '' }}</p>
        </el-card>
      </el-tab-pane>

      <!-- ============ 留学 ============ -->
      <el-tab-pane label="留学" name="abroad">
        <el-card v-loading="abLoading" class="pane-card">
          <template v-if="abRegions.length || campusProjects.length">
            <!-- 原文：一键生成留学规划（顶部常驻，便于随时加入规划） -->
            <div class="abroad-cta">
              <div class="cta-left">
                <div class="cta-title">准备出国（境）深造？</div>
                <div class="cta-sub">一键生成本校合作项目 + 各地区要点组成的四年留学规划，逐项打卡。</div>
              </div>
              <div class="cta-actions">
                <el-button type="primary" :loading="saving" @click="addPlan('abroad')">一键生成留学规划 →</el-button>
                <el-button @click="$router.push('/study/abroad')">查看四年路线图 →</el-button>
              </div>
            </div>

            <!-- 本校国际联合培养项目（置顶，与学校绑定） -->
            <div v-if="campusProjects.length" class="campus-box">
              <h3 class="pane-title campus-title">
                本校国际联合培养项目
                <el-tag size="small" type="danger" effect="dark">中南财经政法大学 · 校际合作</el-tag>
              </h3>
              <p class="hint">面向本校学生的官方合作项目，多为「3+1」本硕连读或双学位。以学校国际教育学院当年度通知为准。</p>
              <div v-for="p in campusProjects" :key="p.name" class="campus-card">
                <div class="cp-row">
                  <b class="cp-name">{{ p.name }}</b>
                  <span v-if="p.mode" class="cp-mode">{{ p.mode }}</span>
                </div>
                <div v-if="p.partner" class="ab-line"><span class="ab-label">合作方</span>{{ p.partner }}</div>
                <div v-if="p.majors" class="ab-line"><span class="ab-label">可选方向</span>{{ p.majors }}</div>
                <div v-if="p.lang" class="ab-line"><span class="ab-label">语言</span>{{ p.lang }}</div>
                <div v-if="p.cost" class="ab-line"><span class="ab-label">费用</span>{{ p.cost }}</div>
                <div v-if="p.keyPoints && p.keyPoints.length" class="ab-sec"><b>要点</b>
                  <ul><li v-for="(k, i) in p.keyPoints" :key="i">{{ k }}</li></ul>
                </div>
                <div v-if="p.note" class="ab-note">💡 {{ p.note }}</div>
                <div class="ab-src">
                  <span>来源 · {{ p.sourceName }}</span>
                  <a v-if="p.sourceUrl" :href="p.sourceUrl" target="_blank" rel="noopener" class="ab-link">查看官方原文 ↗</a>
                </div>
                <el-button size="small" type="primary" :loading="saving" class="ab-on-btn" @click="addPlan('abroad', 'campus')">加入我的规划</el-button>
              </div>
            </div>

            <h3 class="pane-sub">各地区留学攻略</h3>
            <p class="hint">按地区整理各留学目的地的申请条件、语言门槛、费用、材料与时间线，来源可点击原文核实。若非本校合作项目，请以目标院校官网为准。</p>

            <div v-for="r in abRegions" :key="r.region" class="abroad-region">
              <h3 class="pane-sub region-title">{{ r.region }}<span class="region-sub" v-if="r.sub">{{ r.sub }}</span></h3>
              <div v-for="it in r.items" :key="it.name" class="abroad-card">
                <b class="ab-name">{{ it.name }}</b>
                <div v-if="it.overview" class="ab-line"><span class="ab-label">概况</span>{{ it.overview }}</div>
                <div v-if="it.lang" class="ab-line"><span class="ab-label">语言</span>{{ it.lang }}</div>
                <div v-if="it.gpa" class="ab-line"><span class="ab-label">绩点</span>{{ it.gpa }}</div>
                <div v-if="it.cost" class="ab-line"><span class="ab-label">费用</span>{{ it.cost }}</div>
                <div v-if="it.keyPoints && it.keyPoints.length" class="ab-sec"><b>要点</b>
                  <ul><li v-for="(k, i) in it.keyPoints" :key="i">{{ k }}</li></ul>
                </div>
                <div v-if="it.material && it.material.length" class="ab-sec"><b>需准备材料</b>
                  <div class="ab-tags"><el-tag v-for="(m, i) in it.material" :key="i" size="small" effect="plain" class="ab-tag">{{ m }}</el-tag></div>
                </div>
                <div v-if="it.timeline && it.timeline.length" class="ab-sec"><b>时间线</b>
                  <ul><li v-for="(t, i) in it.timeline" :key="i">{{ t }}</li></ul>
                </div>
                <div v-if="it.note" class="ab-note">💡 {{ it.note }}</div>
                <div class="ab-src">
                  <span>来源 · {{ it.sourceName }}</span>
                  <a v-if="it.sourceUrl" :href="it.sourceUrl" target="_blank" rel="noopener" class="ab-link">查看原文 ↗</a>
                </div>
                <el-button size="small" type="primary" :loading="saving" class="ab-on-btn" @click="addPlan('abroad', r.region)">加入我的规划</el-button>
              </div>
            </div>

            <!-- AI 留学申请定位（与保研/考研一致，置于板块底部） -->
            <h3 class="pane-sub">AI 留学申请定位</h3>
            <div class="ai-card">
              <p class="ai-desc">结合你的专业、成绩排名、英语水平与意向地区，AI 给出冲/稳/保目标院校与补短板行动清单。结果可保存回看。</p>
              <div v-if="abroadTask.status === 'done' && abroadTask.result" class="ai-report">
                <p class="ai-summary">{{ abroadTask.result.summary }}</p>
                <div class="ai-grid" v-if="abroadTask.result.strengths && abroadTask.result.strengths.length">
                  <div class="ai-col good">
                    <b>你的优势</b>
                    <ul><li v-for="(s, i) in abroadTask.result.strengths" :key="i">{{ s }}</li></ul>
                  </div>
                  <div class="ai-col warn">
                    <b>待补齐</b>
                    <ul><li v-for="(g, i) in abroadTask.result.gaps" :key="i">{{ g }}</li></ul>
                  </div>
                </div>
                <div class="ai-recs" v-if="abroadTask.result.recommendations && abroadTask.result.recommendations.length">
                  <b>推荐院校（{{ abroadTask.result.targetTier || '' }}）</b>
                  <div v-for="(r, i) in abroadTask.result.recommendations" :key="i" class="ai-rec-row">
                    <span class="rec-tier" :style="tierStyle(r.tier)">{{ r.tier }}</span>
                    <span class="rec-school">{{ r.school }}</span>
                    <span class="rec-reason">{{ r.reason }}</span>
                  </div>
                </div>
                <div class="ai-actions" v-if="abroadTask.result.actions && abroadTask.result.actions.length">
                  <b>行动清单</b>
                  <ul><li v-for="(a, i) in abroadTask.result.actions" :key="i">{{ actText(a) }}</li></ul>
                </div>
              </div>
              <div v-else-if="abroadTask.status === 'pending'" class="ai-pending">
                <el-progress :percentage="abroadTask.progress" :stroke-width="10" />
                <p>AI 正在评估你的留学竞争力，请稍候…</p>
              </div>
              <div v-else-if="abroadTask.status === 'failed'" class="ai-fail">
                <p>{{ abroadTask.error }}</p>
                <el-button size="small" type="primary" @click="startAbroadPosition">重试</el-button>
              </div>
              <el-button v-else type="primary" :loading="abroadTask.status === 'pending'" @click="startAbroadPosition">生成我的留学定位 →</el-button>
            </div>
          </template>
          <el-empty v-else-if="!abLoading" description="暂无留学数据" />
        </el-card>
      </el-tab-pane>

      <!-- ============ 升学日历 ============ -->
      <el-tab-pane label="升学日历" name="calendar">
        <el-card class="pane-card">
          <template v-if="calendar.length">
            <h3 class="pane-title">全年升学日历</h3>
            <p class="hint">按方向分组的全年关键节点，具体时间以当年官方通知为准。</p>
            <div v-for="(items, track) in calendarGroup" :key="track" class="cal-block">
              <h3 class="pane-sub">{{ TRACK_LABEL[track] }}</h3>
              <el-timeline>
                <el-timeline-item v-for="(c, i) in items" :key="i" :timestamp="`${c.month} 月 · ${c.node}`" placement="top">
                  <p class="tl-note">{{ c.note }}</p>
                </el-timeline-item>
              </el-timeline>
            </div>
          </template>
        </el-card>
      </el-tab-pane>

      <!-- ============ 院校追踪 ============ -->
      <el-tab-pane label="院校追踪" name="subscriptions">
        <el-card class="pane-card">
          <h3 class="pane-title">目标院校追踪</h3>
          <p class="hint">把目标院校加入订阅，记录报考阶段与截止日期，逾期自动标红提醒。</p>

          <div class="sub-add">
            <el-input v-model="subForm.school" placeholder="院校名称（必填）" class="sub-input" />
            <el-select v-model="subForm.tier" placeholder="档次" clearable class="sub-input">
              <el-option v-for="t in ['冲', '稳', '保']" :key="t" :label="t" :value="t" />
            </el-select>
            <el-select v-model="subForm.stage" placeholder="阶段" clearable class="sub-input">
              <el-option v-for="s in ['准备', '报名', '材料投递', '考核/笔试', '复试', '等结果']" :key="s" :label="s" :value="s" />
            </el-select>
            <el-date-picker v-model="subForm.deadline" type="date" value-format="YYYY-MM-DD" placeholder="截止日期" class="sub-input" />
            <el-button type="primary" @click="addSub">添加订阅</el-button>
          </div>

          <div class="sub-list" v-if="subs.length">
            <div v-for="s in subs" :key="s.id" class="sub-row" :class="{ overdue: s.overdue }">
              <span class="sub-school">{{ s.school }}</span>
              <span v-if="s.tier" class="sub-tier">{{ s.tier }}档</span>
              <span v-if="s.stage" class="sub-stage">{{ s.stage }}</span>
              <span v-if="s.deadline" class="sub-deadline">截止 {{ s.deadline }}</span>
              <span v-if="s.overdue" class="sub-overdue">已逾期</span>
              <span v-else-if="s.deadline" class="sub-ok">未逾期</span>
              <span v-if="s.note" class="sub-note">{{ s.note }}</span>
              <span class="sub-actions">
                <el-button size="small" type="primary" @click="subToPlan(s.id)">加入规划打卡</el-button>
                <el-button size="small" text @click="delSub(s.id)">删除</el-button>
              </span>
            </div>
          </div>
          <p v-else class="wizard-empty">还没有订阅院校，可在保研/考研页的 AI 推荐或上方手动添加。</p>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <StudyProfileForm ref="profileFormRef" @saved="onProfileSaved" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import http from '../api';
import { useTask } from '../composables/useTask';
import StudyProfileForm from '../components/StudyProfileForm.vue';

const tab = ref('baoyan');
const ba = ref(null);
const baLoading = ref(true);
const kao = ref(null);
const kaLoading = ref(true);
const abRegions = ref([]);
const campusProjects = ref([]);
const abLoading = ref(true);
const allMajors = ref([]);
const major = ref('');
const dirs = ref([]);
const schoolInput = ref('');
const targetSchools = ref([]);
const saving = ref(false);

// 保研加分细则：当前查看的学院
const ruleCollege = ref('');
const curRule = computed(() => {
  const map = (ba.value && ba.value.bonusRules && ba.value.bonusRules.collegeMap) || {};
  return map[ruleCollege.value] || { editable: [], source: '', unpub: false, url: '' };
});
function onRuleCollegeChange() { /* 纯展示切换，无需额外处理 */ }
function initRuleCollege() {
  const br = ba.value && ba.value.bonusRules;
  if (br) ruleCollege.value = br.activeCollege || (br.collegeNames && br.collegeNames[0]) || '';
}

// 升学档案
const profileFormRef = ref(null);
const profile = ref({});
const profileFilled = computed(() => !!profile.value.rankPct && !!profile.value.major);

// AI 定位（异步任务）
const baTask = useTask();
const kaTask = useTask();
const abroadTask = useTask();

// 升学日历
const calendar = ref([]);
const TRACK_LABEL = { baoyan: '保研', kaoyan: '考研' };
const calendarGroup = computed(() => {
  const g = { baoyan: [], kaoyan: [] };
  for (const c of calendar.value) (g[c.track] ||= []).push(c);
  return g;
});

// 院校追踪
const subs = ref([]);
const subForm = reactive({ school: '', tier: '', stage: '', deadline: '', note: '' });

const TIER_COLOR = { high: '#e5484d', mid: '#2f6fe0', base: '#16a34a' };
const TIER_STYLE = { 冲: '#e5484d', 稳: '#2f6fe0', 保: '#16a34a' };
const tierStyle = (t) => ({ background: TIER_STYLE[t] || '#6d7584', color: '#fff' });

/** 加分分值徽章配色：按分值高低给实底白字（高分橙红、中分蓝、低分绿），无数字用灰 */
function scoreStyle(v) {
  const m = String(v || '').match(/(\d+)/);
  const n = m ? Number(m[1]) : 0;
  let bg = '#6d7584';
  if (n >= 30) bg = '#e5484d';
  else if (n >= 15) bg = '#2f6fe0';
  else if (n > 0) bg = '#16a34a';
  return { background: bg, color: '#fff' };
}

/** 从向导岗位的「官方入口」文本里提取可用域名并拼成 https 链接；提取不到返回空串（不强拼非法 URL） */
function wizardUrl(p) {
  if (!p.link) return '';
  const match = String(p.link).match(/[a-zA-Z0-9-]+(?:\.(?:[a-zA-Z0-9-]+))+\.(?:cn|com|gov|org|net|edu)/i);
  if (!match) return '';
  const host = match[0];
  try { return `https://${host}`; } catch { return ''; }
}

/** 把 AI 返回的行动/提醒条目统一成可读文本（兼容字符串或 {action:"..."} 对象） */
function actText(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') return item.action || item.text || item.note || Object.values(item)[0] || '';
  return String(item);
}

/** 当前选中专业命中的考研方向（通常一个；未单独归类则命中通用指引） */
const dir = computed(() => dirs.value && dirs.value[0]);

/* 考试科目 chip 配色（模板中 party.colors 引用） */
const party = {
  colors: ['#2f6fe0', '#34b5a0', '#7b2ff2', '#e5484d', '#f0a04b'],
};

const subjectArgs = computed(() => {
  if (!dir.value) return [];
  return [
    { n: '政治', i: 4, d: '思想政治理论（全国统考）' },
    { n: '外语', i: 2, d: '英语一/二（全国统考）' },
    { n: '数学', i: 0, d: dir.value.math },
    { n: '专业课', i: 3, d: dir.value.proCourse },
    { n: '复试', i: 1, d: dir.value.reExam },
  ];
});

async function loadKaoyan(m) {
  major.value = m;
  const data = await http.get(`/study/center/kaoyan?major=${encodeURIComponent(m)}`);
  dirs.value = data.directions;
}

/* ---------- 升学档案 ---------- */
function openProfile() {
  profileFormRef.value.open(profile.value);
}
async function loadProfile() {
  const r = await http.get('/study/profile');
  profile.value = r.profile || {};
}

/* ---------- AI 定位 ---------- */
/** 发起前先从后端拉最新档案，避免用内存里的旧资料 */
async function startBaoyanPosition() {
  await loadProfile();
  if (!profileFilled.value) {
    ElMessage.warning('请先填写升学档案（成绩排名 + 专业）再生成定位');
    openProfile();
    return;
  }
  const r = await http.post('/study/position/baoyan', {});
  baTask.start(r.taskId);
}
async function startKaoyanSchool() {
  await loadProfile();
  if (!profile.value.major && !major.value) {
    ElMessage.warning('请先填写本科专业再生成择校建议');
    openProfile();
    return;
  }
  const r = await http.post('/study/position/kaoyan', {});
  kaTask.start(r.taskId);
}
async function startAbroadPosition() {
  await loadProfile();
  if (!profile.value.major && !major.value) {
    ElMessage.warning('请先填写本科专业再生成留学定位');
    openProfile();
    return;
  }
  const r = await http.post('/study/position/abroad', {});
  abroadTask.start(r.taskId);
}
/** 回看最近一次成功报告（不重调 AI） */
async function loadReports() {
  try {
    const ba = await http.get('/study/reports/baoyanPosition');
    if (ba.report && baTask.status !== 'idle') { baTask.result = ba.report; baTask.status = 'done'; }
  } catch { /* 无报告属正常 */ }
  try {
    const ka = await http.get('/study/reports/kaoyanSchool');
    if (ka.report && kaTask.status !== 'idle') { kaTask.result = ka.report; kaTask.status = 'done'; }
  } catch { /* 无报告属正常 */ }
  try {
    const ab = await http.get('/study/reports/abroadPosition');
    if (ab.report && abroadTask.status !== 'idle') { abroadTask.result = ab.report; abroadTask.status = 'done'; }
  } catch { /* 无报告属正常 */ }
}

/** 升学档案保存后：刷新档案 + 重置 AI 卡片为待生成态（旧解读作废，必须重新生成） */
function onProfileSaved() {
  loadProfile();
  baTask.status = 'idle'; baTask.result = null; baTask.progress = 0; baTask.stop();
  kaTask.status = 'idle'; kaTask.result = null; kaTask.progress = 0; kaTask.stop();
  abroadTask.status = 'idle'; abroadTask.result = null; abroadTask.progress = 0; abroadTask.stop();
}

/** 切 tab 时重新拉一次最新报告，避免任务完成但页面停在入口态 */
function onTabChange() {
  loadReports();
}

/* ---------- 院校追踪 ---------- */
async function loadSubs() {
  const r = await http.get('/study/subscriptions');
  subs.value = r.list || [];
}
async function addSub() {
  const school = subForm.school.trim();
  if (!school) { ElMessage.warning('请输入院校名称'); return; }
  await http.post('/study/subscriptions', { school, tier: subForm.tier, stage: subForm.stage, deadline: subForm.deadline });
  ElMessage.success('已订阅');
  Object.assign(subForm, { school: '', tier: '', stage: '', deadline: '', note: '' });
  await loadSubs();
}
async function subSchool(school, tier, pathKey) {
  if (!school) return;
  await http.post('/study/subscriptions', { school, tier, stage: '准备', pathKey });
  ElMessage.success(`已订阅「${school}」，可在「院校追踪」查看`);
  await loadSubs();
}
async function subToPlan(id) {
  const r = await http.post(`/study/subscriptions/${id}/to-plan`);
  ElMessage.success(r.added ? '已加入「我的规划」院校追踪打卡' : '该院校已在规划中');
  await loadSubs();
}
async function delSub(id) {
  await http.delete(`/study/subscriptions/${id}`);
  ElMessage.success('已删除订阅');
  await loadSubs();
}

/* ---------- 规划生成 ---------- */
function addTarget() {
  const v = schoolInput.value.trim();
  if (!v) return;
  if (!targetSchools.value.includes(v)) targetSchools.value.push(v);
  schoolInput.value = '';
}
function quickAdd(n) {
  if (n && !targetSchools.value.includes(n)) targetSchools.value.push(n);
}
function removeTarget(i) { targetSchools.value.splice(i, 1); }

const PLAN_LABEL = { baoyan: '保研', kaoyan: '考研', kaozhao: '考公选调', abroad: '留学' };
async function addPlan(path, scope) {
  saving.value = true;
  try {
    const body = path === 'kaoyan'
      ? { path, major: major.value, targetSchools: targetSchools.value }
      : scope != null ? { path, scope } : { path };
    const r = await http.post('/study/center/plan', body);
    ElMessage.success(r.existed ? '规划已存在，已为你补充新增内容' : `已生成「${PLAN_LABEL[path] || path}规划」，去规划页打卡吧`);
    await new Promise((res) => setTimeout(res, 600));
    window.location.href = '/plans';
  } finally { saving.value = false; }
}

onMounted(async () => {
  try {
    ba.value = (await http.get('/study/center/baoyan')).center;
    initRuleCollege();
  } finally { baLoading.value = false; }
  try {
    kao.value = await http.get('/study/center/kaoyan');
    allMajors.value = kao.value.allMajors || [];
    // 默认优先取当前用户专业，其次取第一个
    const mine = (window.__USER__ && window.__USER__.major) || '';
    const pick = allMajors.value.includes(mine) ? mine : (allMajors.value[0] || '');
    if (pick) await loadKaoyan(pick);
  } finally { kaLoading.value = false; }
  try {
    const r = await http.get('/study/abroad');
    abRegions.value = r.regions || [];
    campusProjects.value = r.campusProjects || [];
  } catch { /* ignore */ } finally { abLoading.value = false; }
  try { calendar.value = (await http.get('/study/calendar')).list || []; } catch { /* ignore */ }
  await Promise.all([loadProfile(), loadSubs(), loadReports()]);
});
</script>

<style scoped>
.head-card { margin-bottom: 16px; }
.head-wrap { display: flex; align-items: baseline; gap: 12px; }
.head-sub { color: var(--ink-3); font-size: 13px; font-weight: 400; }
.head-row { display: flex; align-items: flex-start; gap: 16px; justify-content: space-between; flex-wrap: wrap; }
.intro { color: var(--ink-2); margin: 0; font-size: 14px; max-width: 720px; line-height: 1.7; }
.head-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.prof-chip { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: #fff; }
.prof-chip.filled { background: #16a34a; }
.prof-chip.empty { background: #e5484d; }
.center-tabs { margin-top: 4px; }
.pane-card { border-radius: 12px; }

.pane-title { margin: 4px 0 8px; font-size: 18px; }
.pane-sub { margin: 22px 0 10px; font-size: 15px; }
.hint { color: var(--ink-2); font-size: 13px; margin: 4px 0 12px; }

/* 保研规则 */
.rule-block { padding: 10px 14px; border-radius: 10px; background: var(--bg-soft, #f6f8fb); border: 1px solid var(--line, #eef1f6); margin-bottom: 10px; }
.rule-title { font-size: 14px; }
.rule-list { margin: 8px 0 0; padding-left: 18px; color: var(--ink-2); font-size: 13px; line-height: 1.8; }
.rule-note { margin: 8px 0 0; color: var(--ink-3); font-size: 12px; }

/* 加分清单 */
.bonus-list { border: 1px solid var(--line, #eef1f6); border-radius: 10px; overflow: hidden; }
.bonus-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 1px dashed var(--line); flex-wrap: wrap; }
.bonus-row:last-child { border-bottom: none; }
.bonus-name { font-weight: 600; font-size: 14px; }
.bonus-tip { font-size: 12px; color: var(--ink-3); }
.bonus-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.exam-time { font-size: 12px; color: var(--ink-3); }

/* 本校官方推免加分细则 */
.bonus-rules { margin-top: 6px; }
.sub-badge { margin-left: 8px; padding: 1px 8px; border-radius: 10px; background: #16a34a; color: #fff; font-size: 11px; font-weight: 600; vertical-align: middle; }
.text-accent { color: var(--ink-2); }
.rule-col { border: 1px solid var(--line, #eef1f6); border-radius: 10px; padding: 8px 14px; margin-bottom: 12px; background: var(--bg-soft, #f6f8fb); }
.rule-col-title { margin: 6px 0 8px; font-size: 14px; }
.rule-row { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; border-bottom: 1px dashed var(--line, #eef1f6); flex-wrap: wrap; font-size: 13px; }
.rule-row:last-child { border-bottom: none; }
.rule-module { font-weight: 600; color: var(--ink); flex-shrink: 0; min-width: 70px; }
.rule-name { flex: 1; min-width: 180px; color: var(--ink-2); }
.rule-score { padding: 1px 10px; border-radius: 10px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.rule-cond { color: var(--ink-3); font-size: 12px; flex-basis: 100%; padding-left: 78px; }
.rule-source { margin: 10px 0 0; color: var(--ink-3); font-size: 12px; line-height: 1.7; }
.college-picker { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.picker-label { font-size: 13px; color: var(--ink-2); font-weight: 600; }
.rule-empty { margin: 6px 0; color: var(--ink-3); font-size: 13px; }
.rule-link { color: #2f6fe0; text-decoration: none; }

/* 院校分档 */
.col-tiers { display: flex; gap: 12px; flex-wrap: wrap; }
.tier-col { flex: 1; min-width: 180px; border: 1px solid var(--line, #eef1f6); border-radius: 10px; padding: 12px 14px; background: var(--bg-soft, #f6f8fb); }
.tier-badge { display: inline-block; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; }
.tier-note { display: block; margin-top: 8px; font-size: 13px; color: var(--ink-2); line-height: 1.6; }

/* 考研 */
.major-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.major-label { font-weight: 600; font-size: 14px; }
.major-select { width: 220px; }

.subj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.subj-chip { border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.5; color: #fff; }
.subj-n { font-weight: 700; font-size: 14px; display: block; color: #fff; }
.subj-d { color: rgba(255, 255, 255, .92); }

.book-list { border: 1px solid var(--line, #eef1f6); border-radius: 10px; overflow: hidden; }
.book-row { display: flex; justify-content: space-between; gap: 10px; padding: 9px 14px; border-bottom: 1px dashed var(--line); flex-wrap: wrap; }
.book-row:last-child { border-bottom: none; }
.book-name { font-size: 14px; }
.book-meta { color: var(--ink-3); font-size: 12px; }

.tier-grid { display: flex; flex-direction: column; gap: 10px; }
.tier-row { display: flex; gap: 12px; }
.tier-body { flex: 1; border: 1px solid var(--line, #eef1f6); border-radius: 8px; padding: 8px 12px; background: var(--bg-soft, #f6f8fb); }

.note-demo { margin-top: 10px; color: var(--ink-3); font-size: 12px; }

/* 目标院校自选 */
.target-row { display: flex; gap: 8px; margin-bottom: 8px; }
.target-input { flex: 1; max-width: 360px; }
.target-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.target-chip { background: #2f6fe0; color: #fff; border: none; }
.target-hint { margin: 0 0 4px; color: var(--ink-3); font-size: 12px; }
.quick-add { color: var(--accent, #2f6fe0); }

/* AI 卡片 */
.ai-card { border: 1px solid var(--line, #eef1f6); border-radius: 10px; padding: 14px 16px; background: var(--bg-soft, #f6f8fb); }
.ai-desc { margin: 0 0 10px; color: var(--ink-2); font-size: 13px; line-height: 1.7; }
.ai-report .ai-summary { font-size: 14px; line-height: 1.8; color: var(--ink); background: #fff; border: 1px solid var(--line, #eef1f6); border-radius: 8px; padding: 10px 12px; margin: 0 0 12px; }
.ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.ai-col { border-radius: 8px; padding: 10px 12px; font-size: 13px; }
.ai-col b { display: block; margin-bottom: 6px; }
.ai-col ul { margin: 0; padding-left: 18px; line-height: 1.8; }
.ai-col.good { background: rgba(22, 163, 74, .08); border: 1px solid rgba(22, 163, 74, .3); }
.ai-col.good b { color: #16a34a; }
.ai-col.warn { background: rgba(229, 72, 77, .07); border: 1px solid rgba(229, 72, 77, .28); }
.ai-col.warn b { color: #e5484d; }
.ai-recs b { display: block; margin-bottom: 8px; }
.ai-rec-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--line, #eef1f6); flex-wrap: wrap; }
.ai-rec-row:last-child { border-bottom: none; }
.rec-tier { padding: 1px 8px; border-radius: 10px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.rec-school { font-weight: 600; font-size: 14px; }
.rec-reason { flex: 1; color: var(--ink-3); font-size: 12px; min-width: 160px; }
.ai-actions { margin-top: 10px; }
.ai-actions b { display: block; margin-bottom: 6px; }
.ai-actions ul { margin: 0; padding-left: 18px; color: var(--ink-2); font-size: 13px; line-height: 1.8; }
.ai-pending { text-align: center; padding: 12px 0 4px; }
.ai-pending p { color: var(--ink-3); font-size: 13px; margin: 8px 0 0; }
.ai-fail p { color: #e5484d; font-size: 13px; margin: 0 0 8px; }
.ai-thresh { margin-top: 10px; padding: 8px 12px; background: rgba(47, 111, 224, .08); border: 1px solid rgba(47, 111, 224, .25); border-radius: 8px; font-size: 13px; color: var(--ink-2); }
.ai-thresh b { display: block; color: #2f6fe0; margin-bottom: 4px; }
.ai-thresh p { margin: 0; line-height: 1.7; }
.ai-warn-list { margin-top: 10px; font-size: 13px; }
.ai-warn-list b { display: block; margin-bottom: 4px; color: #b8560a; }
.ai-warn-list ul { margin: 0; padding-left: 18px; color: var(--ink-2); line-height: 1.8; }

/* 材料包 */
.mat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.mat-card { border: 1px solid var(--line, #eef1f6); border-radius: 10px; padding: 12px 14px; background: var(--bg-soft, #f6f8fb); transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.mat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-2, 0 6px 18px rgba(20,33,61,.10)); border-color: color-mix(in srgb, var(--accent) 30%, var(--line, #eef1f6)); }
.mat-name { font-size: 14px; }
.mat-goal { margin: 6px 0; color: var(--ink-2); font-size: 12px; line-height: 1.6; }
.mat-outline { margin: 0 0 8px; padding-left: 18px; color: var(--ink-2); font-size: 12px; line-height: 1.7; }
.mat-tip { margin: 4px 0 0; color: var(--ink-3); font-size: 12px; }

/* 考公 / 选调 */
.type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.type-card { padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line, #eef1f6); background: var(--bg-soft, #f6f8fb); }
.type-name { font-size: 15px; color: var(--ink); display: block; margin-bottom: 6px; }
.type-line { font-size: 13px; color: var(--ink-2); margin: 2px 0; line-height: 1.5; }
.type-label { display: inline-block; color: #fff; background: #2f6fe0; border-radius: 4px; padding: 0 6px; font-size: 12px; margin-right: 6px; }
.foot-note { color: var(--ink-3); font-size: 12px; margin: 0 0 8px; }
.tl-note { margin: 4px 0 0; color: var(--ink-2); font-size: 13px; }
.mat-list { display: flex; flex-wrap: wrap; gap: 8px; }
.mat-tag { --el-tag-border-color: var(--line, #eef1f6); }
.school-line { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; padding: 3px 10px 3px 0; }
.tier-tip { color: var(--ink-3); font-size: 12px; }

/* 考公向导 */
.wizard-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.wizard-select { width: 170px; }
.wizard-list { border: 1px solid var(--line, #eef1f6); border-radius: 10px; overflow: hidden; }
.wizard-item { padding: 10px 14px; border-bottom: 1px dashed var(--line, #eef1f6); }
.wizard-item:last-child { border-bottom: none; }
.wizard-name { font-size: 14px; }
.wizard-note { margin: 4px 0 2px; color: var(--ink-2); font-size: 13px; line-height: 1.6; }
.wizard-tip { color: #b8560a; font-size: 12px; margin: 2px 0; }
.wizard-link { font-size: 12px; color: #2f6fe0; text-decoration: none; word-break: break-all; }
.wizard-link-plain { font-size: 12px; color: var(--ink-3); }
.wizard-empty { color: var(--ink-3); font-size: 13px; padding: 10px 0; }

/* 升学日历 */
.cal-block { margin-bottom: 18px; }
.cal-block .pane-sub { margin: 0 0 10px; }

/* 院校追踪 */
.sub-add { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.sub-input { width: 180px; }
.sub-list { border: 1px solid var(--line, #eef1f6); border-radius: 10px; overflow: hidden; }
.sub-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px dashed var(--line, #eef1f6); flex-wrap: wrap; }
.sub-row:last-child { border-bottom: none; }
.sub-row.overdue { background: rgba(229, 72, 77, .08); }
.sub-school { font-weight: 600; font-size: 14px; }
.sub-tier { background: #2f6fe0; color: #fff; border-radius: 10px; padding: 1px 10px; font-size: 12px; font-weight: 600; }
.sub-stage { color: var(--ink-2); font-size: 13px; }
.sub-deadline { color: var(--ink-3); font-size: 12px; }
.sub-overdue { background: #e5484d; color: #fff; border-radius: 10px; padding: 1px 10px; font-size: 12px; font-weight: 600; }
.sub-ok { background: #16a34a; color: #fff; border-radius: 10px; padding: 1px 10px; font-size: 12px; font-weight: 600; }
.sub-note { color: var(--ink-3); font-size: 12px; }
.sub-actions { margin-left: auto; display: flex; gap: 6px; }

.pane-actions { margin-top: 22px; }
.academic-note { margin-top: 14px; }

/* 留学 */
.abroad-cta { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; background: linear-gradient(90deg, color-mix(in srgb, var(--brand, #2f6fe0) 10%, transparent), color-mix(in srgb, var(--accent, #5a8fe8) 6%, transparent)); border: 1px solid color-mix(in srgb, var(--brand, #2f6fe0) 22%, transparent); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
.cta-title { font-size: 15px; font-weight: 700; }
.cta-sub { color: var(--ink-2); font-size: 12.5px; margin-top: 3px; }
.cta-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.abroad-region { margin-top: 8px; }
.region-title { display: flex; align-items: center; gap: 10px; }
.region-sub { color: var(--ink-3); font-size: 13px; font-weight: 400; }
.abroad-card { border: 1px solid var(--line, #eef1f6); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.ab-name { font-size: 15px; }
.ab-line { display: flex; gap: 8px; margin-top: 6px; font-size: 13px; color: var(--ink-2); }
.ab-label { flex: 0 0 46px; color: var(--ink-3); font-weight: 600; }
.ab-sec { margin-top: 8px; font-size: 13px; color: var(--ink-2); }
.ab-sec ul { margin: 4px 0 0; padding-left: 18px; line-height: 1.7; }
.ab-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ab-tag { --el-tag-border-color: color-mix(in srgb, var(--brand, #2f6fe0) 30%, transparent); }
.ab-note { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--brand, #2f6fe0) 5%, white); font-size: 12.5px; color: var(--ink-2); }
.ab-src { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12px; color: var(--ink-3); }
.ab-on-btn { margin-top: 10px; }
.ab-link { color: var(--brand, #2f6fe0); font-weight: 600; text-decoration: none; }
.ab-link:hover { text-decoration: underline; }

/* 本校国际联合培养项目（置顶） */
.campus-box { margin-bottom: 8px; }
.campus-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.campus-card { border: 1px solid color-mix(in srgb, var(--danger, #e5484d) 28%, var(--line, #eef1f6)); border-radius: 12px; padding: 13px 15px; margin-bottom: 12px; background: color-mix(in srgb, var(--brand, #2f6fe0) 2%, white); }
.cp-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cp-name { font-size: 15px; }
.cp-mode { color: #fff; background: var(--danger, #e5484d); border-radius: 6px; padding: 2px 8px; font-size: 12px; }

/* ===== 移动端适配 ===== */
@media (max-width: 768px) {
  /* 头部：说明与操作竖排 */
  .head-wrap { flex-direction: column; gap: 4px; }
  .head-row { flex-direction: column; }
  .head-actions { width: 100%; flex-wrap: wrap; }

  /* 下拉：专业 & 学院选择占满可用宽度 */
  .major-select,
  .college-picker .el-select { width: 100% !important; }

  /* 考试科目：两列 */
  .subj-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }

  /* 推免加分细则行：取消固定缩进/最小宽度，避免横向溢出 */
  .rule-row { align-items: flex-start; }
  .rule-module { min-width: 0; }
  .rule-name { min-width: 0; }
  .rule-cond { padding-left: 0; }

  /* 院校分档：一列堆叠 */
  .col-tiers .tier-col { flex-basis: 100%; min-width: 0; }

  /* 目标院校输入：整行 */
  .target-row { flex-direction: column; }
  .target-input { width: 100%; max-width: 100%; }

  /* AI 报告：优缺并排改上下；推荐院校原因换行 */
  .ai-grid { grid-template-columns: 1fr; }
  .ai-rec-row .rec-reason { min-width: 0; flex-basis: 100%; }

  /* 材料包：单列，按钮占满 */
  .mat-grid { grid-template-columns: 1fr; }
  .mat-card .el-button { width: 100%; }

  /* 留学操作区按钮整行 */
  .abroad-cta { padding: 12px; }
  .cta-actions .el-button { flex: 1 1 100%; }

  /* 院校追踪表单：竖排占满，避免输入框挤成一排 */
  .sub-add { flex-direction: column; }
  .sub-input { width: 100%; }
  .sub-actions { width: 100%; justify-content: flex-end; flex-wrap: wrap; }
}
</style>