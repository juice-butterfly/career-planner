<template>
  <div class="item" :class="{ done: it.done }">
    <!-- 勾选打卡 -->
    <el-checkbox :model-value="it.done" :class="['item-check', { overdue: !it.done && overdue }]" @change="(v) => $emit('toggle', it, v)" />

    <div class="item-body">
      <!-- 编辑态 -->
      <template v-if="it._editing">
        <el-input v-model="it._editText" size="small" class="item-edit" @keyup.enter="save" @blur="save" />
      </template>
      <template v-else>
        <span class="item-title" :class="{ strike: it.done }" @click="startEdit">{{ it.title }}</span>
        <!-- 绩点/专业课等达标型事项：成绩/得分录入 -->
        <span v-if="it.target || isCourse" class="score-block">
          <span v-if="it.target" class="target-chip">目标 {{ it.target }}</span>
          <span class="score-val" :class="{ filled: it.score }">{{ it.score || '—' }}</span>
          <el-input v-model="it._score" size="small" class="score-input" :placeholder="isCourse ? '录成绩' : '填实际'" @blur="saveScore" @keyup.enter="saveScore" />
        </span>
        <span v-if="stageNote" class="item-note">{{ stageNote }}</span>
        <span v-if="it.done && it.doneAt" class="item-doneat">· {{ it.doneAt.slice(0, 10) }} 完成</span>
      </template>
    </div>

    <div class="item-ops">
      <!-- 截止日期 -->
      <el-date-picker
        v-model="it.due"
        type="date"
        value-format="YYYY-MM-DD"
        size="small"
        placeholder="截止"
        class="due-picker"
        @change="(v) => $emit('set-due', it, v)"
      />
      <span v-if="it.due" class="due-chip" :class="{ overdue, today: isToday }">{{ dueLabel }}</span>
      <el-tooltip content="AI 复盘该事项" placement="top">
        <el-button link type="primary" size="small" @click="$emit('review', it)">AI</el-button>
      </el-tooltip>
      <el-popconfirm title="删除该事项？" @confirm="$emit('delete', it)">
        <template #reference>
          <el-button link type="danger" size="small">删</el-button>
        </template>
      </el-popconfirm>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { dueState } from '../utils/plan.js';

const props = defineProps({
  it: { type: Object, required: true },
  // 非职业路线事项（综合评价）时，把 stage 作为说明文字显示
  showStage: { type: Boolean, default: false },
});
const emit = defineEmits(['toggle', 'save', 'set-due', 'delete', 'score', 'review']);

const isCourse = computed(() => props.it.dimension === 'course');
const overdue = computed(() => dueState(props.it.due) === 'overdue');
const isToday = computed(() => dueState(props.it.due) === 'today');
const stageNote = computed(() => {
  if (props.it.note) return props.it.note;
  if (props.showStage && props.it.stage && props.it.stage !== '通用') return props.it.stage;
  return '';
});
const dueLabel = computed(() => {
  const s = dueState(props.it.due);
  if (s === 'overdue') return `已逾期 ${props.it.due}`;
  if (s === 'today') return '今天截止';
  return props.it.due;
});

function startEdit() {
  props.it._editing = true;
  props.it._editText = props.it.title;
}
function save() {
  if (!props.it._editing) return;
  if (!(props.it._editText || '').trim()) { props.it._editing = false; return; }
  props.it._editing = false;
  props.it.title = props.it._editText.trim();
  emit('save', props.it);
}
function saveScore() {
  if (props.it._score === props.it.score) return;
  props.it.score = props.it._score || null;
  emit('score', props.it);
}
</script>

<style scoped>
.item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: var(--surface, #fff); border: 1px solid var(--line, #eef1f6); transition: background .2s ease; }
.item.done { background: var(--bg-soft, #f6f8fb); opacity: .7; }
.item-check :deep(.el-checkbox__inner) { border-radius: 4px; }
.item-body { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.item-title { cursor: pointer; font-size: 14px; }
.item-title.strike { text-decoration: line-through; color: var(--ink-3); }
.item-note { color: var(--ink-3); font-size: 12px; }
.item-doneat { color: var(--ink-3); font-size: 12px; }
.item-edit { max-width: 320px; }
.score-block { display: inline-flex; align-items: center; gap: 4px; }
.target-chip { font-size: 11px; color: #fff; background: #2f6fe0; padding: 1px 6px; border-radius: 8px; }
.score-val { font-size: 12px; font-weight: 700; color: var(--ink-2); }
.score-val.filled { color: var(--soft-green-fg, #2f9e6e); }
.score-input { width: 70px; }
.item-ops { display: flex; align-items: center; gap: 4px; }
.due-picker { width: 120px; }
.due-chip { font-size: 12px; padding: 1px 7px; border-radius: 9px; background: var(--bg-soft); color: var(--ink-2); }
.due-chip.overdue { background: #d64545; color: #fff; }
.due-chip.today { background: #e07b00; color: #fff; }
</style>