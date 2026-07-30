export const OPPONENTS = Object.freeze([
  {
    id: "kim",
    name: "Kim",
    roman: "KIM",
    title: "霓光棋社 · 新锐棋手",
    rank: "AI · 新锐",
    skill: 0.42,
    intro: "我是 Kim。第一关，就从轻松的一手开始吧！",
    thinking: "这一步很亮眼……让我换个角度。",
    turn: "轮到你了。别被我的霓光发夹分心哦。",
    surprised: "漂亮！第一枚通关徽章属于你。",
    smug: "差一点就抓住节奏了，再试一次吧。",
  },
  {
    id: "daolong",
    name: "刀龙",
    roman: "DAO LONG",
    title: "赤刃棋馆 · 攻势棋手",
    rank: "AI · 进阶",
    skill: 0.58,
    intro: "刀锋要快，棋心要稳。第二关，请指教。",
    thinking: "你的棋路很大胆，我得认真一些了。",
    turn: "下一手，让我看看你能否穿过赤刃阵。",
    surprised: "好锋利的连线……这一关是你赢了。",
    smug: "攻势一旦成形，就很难停下。再来吧。",
  },
  {
    id: "tuch",
    name: "tuch",
    roman: "TUCH",
    title: "薄荷工坊 · 机关棋手",
    rank: "AI · 灵动",
    skill: 0.7,
    intro: "第三关已载入。tuch 的棋盘实验，开始！",
    thinking: "正在重组路线……嗯，这个交叉点不错。",
    turn: "轮到你提交新的棋盘方案。",
    surprised: "实验结果确认：你的五连完全成立！",
    smug: "这次模型预测成功。调整方案后再挑战吧。",
  },
  {
    id: "peach",
    name: "peach",
    roman: "PEACH",
    title: "桃花庭院 · 幻阵棋手",
    rank: "AI · 高阶",
    skill: 0.84,
    intro: "花影会遮住棋路。第四关，要看仔细哦。",
    thinking: "花瓣落在哪里，下一手就藏在哪里。",
    turn: "该你了。桃花阵可不会一直等待。",
    surprised: "连花影都没能挡住你，真是漂亮。",
    smug: "只差一朵花的距离。再试一次好吗？",
  },
  {
    id: "afu",
    name: "阿福",
    roman: "A FU",
    title: "福星棋楼 · 最终守关人",
    rank: "AI · 守关",
    skill: 1,
    intro: "能来到第五关很了不起。最后一局，放马过来！",
    thinking: "福气与计算都要兼顾……这一手如何？",
    turn: "最终关还没有结束，继续落子吧。",
    surprised: "五关全破！这份好运与实力都属于你。",
    smug: "守关人的好运暂时领先，再挑战一次吧！",
  },
]);

export function normalizeLevel(value) {
  const level = Number.parseInt(value, 10);
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(OPPONENTS.length - 1, level));
}

export function getWinProgress(level) {
  const current = normalizeLevel(level);
  const isFinal = current === OPPONENTS.length - 1;
  return {
    isFinal,
    nextLevel: isFinal ? current : current + 1,
  };
}
