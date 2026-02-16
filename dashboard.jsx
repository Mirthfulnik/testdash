import { useState, useEffect, useRef, useCallback } from "react";

// ── Colour tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#0d0f14",
  surface: "#141720",
  card: "#1a1e2e",
  border: "#252a3a",
  accent: "#f5c842",
  accentDim: "#f5c84233",
  green: "#3de8a0",
  greenDim: "#3de8a022",
  red: "#f05f5f",
  redDim: "#f05f5f22",
  blue: "#5b8def",
  blueDim: "#5b8def22",
  orange: "#f5914a",
  text: "#e8eaf0",
  textMid: "#8a90a8",
  textDim: "#505570",
};

// ── Tiny helpers ───────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(0) + "K"
    : String(n);

const pct = (v, sign = true) =>
  (sign && v > 0 ? "+" : "") + v.toFixed(1) + "%";

// ── Tooltip ────────────────────────────────────────────────────────────────
function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `1px solid ${C.textDim}`,
          color: C.textDim,
          fontSize: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "help",
          flexShrink: 0,
        }}
      >
        ?
      </span>
      {show && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2a2f45",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            color: C.textMid,
            whiteSpace: "pre-wrap",
            maxWidth: 260,
            zIndex: 999,
            lineHeight: 1.5,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

// ── Animated number ────────────────────────────────────────────────────────
function AnimNum({ value, formatter = fmt, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const start = useRef(0);
  const raf = useRef(null);
  useEffect(() => {
    const from = start.current;
    const to = value;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else start.current = to;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <>{formatter(display)}</>;
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────
function LineChart({ data, color, height = 60, width = "100%", anim = true }) {
  const svgRef = useRef(null);
  const [progress, setProgress] = useState(anim ? 0 : 1);
  useEffect(() => {
    if (!anim) { setProgress(1); return; }
    setProgress(0);
    const t0 = performance.now();
    const dur = 1000;
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [data, anim]);

  const W = 400, H = height;
  const vals = data.map((d) => d.y);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.y - minV) / range) * (H - 8) - 4,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${H} L0,${H} Z`;
  const totalLen = pts.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const dx = p.x - pts[i - 1].x, dy = p.y - pts[i - 1].y;
    return acc + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width, height, display: "block" }}
    >
      <defs>
        <linearGradient id={`grad_${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad_${color.replace("#", "")})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={totalLen}
        strokeDashoffset={totalLen * (1 - progress)}
        style={{ transition: "none" }}
      />
    </svg>
  );
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────
function BarChart({ data, colorA, colorB, height = 180 }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const t0 = performance.now();
    const dur = 900;
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [data]);

  const W = 500, H = height, pad = 20;
  const maxV = Math.max(...data.map((d) => (d.a || 0) + (d.b || 0)));
  const bw = (W - pad * 2) / data.length - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      {data.map((d, i) => {
        const x = pad + i * ((W - pad * 2) / data.length) + 1;
        const aH = ((d.a || 0) / maxV) * (H - 20) * progress;
        const bH = ((d.b || 0) / maxV) * (H - 20) * progress;
        return (
          <g key={i}>
            <rect x={x} y={H - 10 - aH} width={bw} height={aH} fill={colorA} rx={2} />
            <rect x={x} y={H - 10 - aH - bH} width={bw} height={bH} fill={colorB} rx={2} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Mini sparkline ─────────────────────────────────────────────────────────
function Spark({ data, color }) {
  return <LineChart data={data.map((y) => ({ y }))} color={color} height={36} anim />;
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, deltaUnit = "%", spark, color, tip, formatter }) {
  const pos = delta > 0;
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        {tip && <Tooltip text={tip} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || C.text, fontFamily: "'DM Mono', monospace" }}>
        <AnimNum value={value} formatter={formatter || fmt} />
      </div>
      {delta !== undefined && (
        <div style={{ fontSize: 12, color: pos ? C.green : C.red, display: "flex", alignItems: "center", gap: 4 }}>
          <span>{pos ? "▲" : "▼"}</span>
          <span>{Math.abs(delta).toFixed(1)}{deltaUnit} к пред. периоду</span>
        </div>
      )}
      {spark && (
        <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, opacity: 0.7 }}>
          <Spark data={spark} color={color || C.accent} />
        </div>
      )}
    </div>
  );
}

// ── Period Switcher ────────────────────────────────────────────────────────
function PeriodSwitcher({ value, onChange }) {
  const opts = ["7д", "30д", "90д", "365д", "Всё"];
  return (
    <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: "5px 12px",
            borderRadius: 7,
            border: "none",
            background: value === o ? C.accent : "transparent",
            color: value === o ? "#000" : C.textMid,
            fontSize: 12,
            fontWeight: value === o ? 700 : 400,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ── Tab Bar ────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: `1px solid ${active === t ? C.accent : C.border}`,
            background: active === t ? C.accentDim : "transparent",
            color: active === t ? C.accent : C.textMid,
            fontSize: 13,
            fontWeight: active === t ? 600 : 400,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionTitle({ children, tip }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "0.02em" }}>{children}</span>
      {tip && <Tooltip text={tip} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DATA (mock, consistent with screenshots)
// ══════════════════════════════════════════════════════════════════════════
const weeks = ["12.10","19.10","26.10","02.11","09.11","16.11","23.11","30.11","07.12","14.12","21.12","28.12","04.01","11.01","18.01","25.01","01.02","08.02"];

const weeklyGe30 = [50,160,520,580,473,340,300,360,320,280,260,270,260,270,280,300,760,120];
const weeklyLt30 = [10,60,260,220,202,160,155,140,135,120,110,115,108,112,108,115,100,40];
const weeklySkipPct = [20,28,33,27.5,29.9,32,34,35.4,31,30,29.5,29,28.5,28,27.5,28,25,27];

const newListeners  = [12,45,220,180,90,55,30,20,18,16,15,14,12,14,16,22,85,28];
const retListeners  = [0,10,120,210,180,160,165,175,175,168,160,162,158,162,160,165,160,55];
const retentionPct  = [0,18,35,54,68,76,81,88,90,88,87,86,85,83,82,82,78,60];

const splData = [1.78,2.03,1.88,1.82,1.76,1.78,1.75,1.80,1.72,1.68,1.65,1.62,1.60,1.58,1.57,1.59,2.30,1.80];

const skipBySource = {
  radio:      [38,39,39,40,38,37,36,35.4,34,32,31,31,32,33,35,37.5,40,41.8],
  collection: [25,22,22,23,22,22,21,22.3,21,20,20,20,20,20,20,21,22,22],
  search:     [28,26,25,24,23,22,21,20.4,20,21,21,20,20,20,20,21,21,21],
  album:      [24,24,25,26,26,26,26,26.1,25,24,24,24,24,24,24,24,25,25],
};

const sourceShareAll   = { radio:57, collection:39, search:3, album:1 };
const sourceShareRoyal = { radio:52, collection:44, search:3, album:1 };

const genderByWeek = {
  male:   [76,74,72,70,68,67,66,66,67,67,67,68,68,67,66,65,63,60],
  female: [11,13,14,16,18,19,20,20.5,20.9,21,21,21,21,22,23,26,28,30],
  nd:     [13,13,14,14,14,14,14,13.5,12.1,12,12,11,11,11,11,9,9,10],
};

const ageData = [
  { seg: "00–12", pct: 0.1 }, { seg: "13–17", pct: 0.8 },
  { seg: "18–24", pct: 37.1 }, { seg: "25–34", pct: 54.2 },
  { seg: "35–44", pct: 6.4 }, { seg: "45–54", pct: 0.9 },
  { seg: "55–64", pct: 0.3 }, { seg: "65+", pct: 0.3 },
];

const ageGenderData = [
  { seg: "00–12", m: 0.08, f: 0.02 }, { seg: "13–17", m: 0.55, f: 0.25 },
  { seg: "18–24", m: 26, f: 11.1 }, { seg: "25–34", m: 38, f: 16.2 },
  { seg: "35–44", m: 4.2, f: 2.2 }, { seg: "45–54", m: 0.7, f: 0.2 },
  { seg: "55+", m: 0.4, f: 0.1 },
];

const countryData = [
  { country: "RU", value: 5468000, delta: 12 },
  { country: "KZ", value: 301200, delta: -3 },
  { country: "BY", value: 162500, delta: -5 },
  { country: "UZ", value: 42200, delta: 8 },
  { country: "KG", value: 18100, delta: 2 },
];

// ══════════════════════════════════════════════════════════════════════════
// SCREENS
// ══════════════════════════════════════════════════════════════════════════

// ── OVERVIEW ──────────────────────────────────────────────────────────────
function ScreenOverview({ period }) {
  const [hover, setHover] = useState(null);

  // aggregate totals based on period
  const totalStreams = 8_646_712;
  const royaltyStreams = 6_024_601;
  const lostStreams = 2_622_111;
  const convPct = 69.7;
  const newList = 42_800;
  const retList = 328_000;

  const streamSpark = weeklyGe30.map((v, i) => v + weeklyLt30[i]);
  const royaltySpark = weeklyGe30;
  const newSpark = newListeners;
  const retSpark = retListeners;

  const barData = weeks.map((w, i) => ({ a: weeklyGe30[i] * 1000, b: weeklyLt30[i] * 1000, label: w }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        <KpiCard
          label="Всего стримов"
          value={totalStreams}
          delta={12.4}
          spark={streamSpark}
          color={C.accent}
          tip="Общее количество стартов воспроизведения за выбранный период"
        />
        <KpiCard
          label="Стримы ≥30с (роялти)"
          value={royaltyStreams}
          delta={8.1}
          spark={royaltySpark}
          color={C.green}
          tip="Стримы, учитываемые в роялти: трек прослушан 30 и более секунд"
        />
        <KpiCard
          label="Конверсия в роялти"
          value={convPct}
          delta={0.6}
          deltaUnit=" п.п."
          formatter={(v) => v.toFixed(1) + "%"}
          color={C.green}
          tip="Доля стримов ≥30с от всех стримов. Норма по жанру хип-хоп: ~70%"
        />
        <KpiCard
          label="Новые слушатели"
          value={newList}
          delta={26.2}
          spark={newSpark}
          color={C.blue}
          tip="Уникальные слушатели, впервые прослушавшие трек в выбранном периоде"
        />
        <KpiCard
          label="Вернувшиеся слушатели"
          value={retList}
          delta={-5.8}
          spark={retSpark}
          color={C.orange}
          tip="Слушатели, которые уже слушали трек ранее и вернулись в выбранном периоде"
        />
      </div>

      {/* Динамика стримов */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle tip="Жёлтые столбцы — стримы ≥30с (роялти), красные — <30с (не в роялти)">
          Динамика стримов
        </SectionTitle>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          {[
            { label: "≥30с", color: C.accent },
            { label: "<30с", color: C.red },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMid }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
              {l.label}
            </div>
          ))}
        </div>
        {/* bar chart */}
        <div style={{ position: "relative" }}>
          <BarChart data={barData.map((d) => ({ a: d.a / 1000, b: d.b / 1000 }))} colorA={C.accent} colorB={C.red} height={160} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {weeks.filter((_, i) => i % 3 === 0).map((w) => (
              <span key={w} style={{ fontSize: 10, color: C.textDim }}>{w}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Новые vs Вернувшиеся + SPL */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Новые vs Вернувшиеся */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip="Новые — первый стрим трека за период; Вернувшиеся — повторный стрим. Зелёная линия — процент вернувшихся.">
            Новые vs Вернувшиеся слушатели
          </SectionTitle>
          <div style={{ position: "relative", height: 130 }}>
            <svg viewBox="0 0 500 120" preserveAspectRatio="none" style={{ width: "100%", height: 120 }}>
              {/* bars new */}
              {newListeners.map((v, i) => {
                const maxV = 220;
                const x = 10 + i * 27;
                const h = (v / maxV) * 100;
                return <rect key={i} x={x} y={120 - h} width={12} height={h} fill={C.accent} rx={2} />;
              })}
              {/* bars returning */}
              {retListeners.map((v, i) => {
                const maxV = 220;
                const x = 10 + i * 27 + 13;
                const h = (v / maxV) * 100;
                return <rect key={i} x={x} y={120 - h} width={12} height={h} fill={C.blue} rx={2} />;
              })}
            </svg>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {[{label:"Новые",color:C.accent},{label:"Вернувшиеся",color:C.blue}].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMid }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* SPL */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip={'Среднее число стримов ≥30с на одного слушателя за неделю.\n>2.0 — трек ставят на повтор (ядро фанатов)\n1.5–2.0 — норма\n<1.5 — разовые случайные стримы'}>
            Стримов на слушателя
          </SectionTitle>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: C.green, fontFamily: "'DM Mono', monospace" }}>1.8</span>
            <span style={{ fontSize: 12, color: C.textMid, marginLeft: 8 }}>среднее за период</span>
          </div>
          <LineChart data={splData.map((y) => ({ y }))} color={C.green} height={80} anim />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {["19.10","","","02.11","","","14.11","","","14.12","","","25.01","","","08.02"].map((w,i) => (
              <span key={i} style={{ fontSize: 9, color: C.textDim }}>{w}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {[{v:">2.0",label:"Повторы",c:C.green},{v:"1.5–2.0",label:"Норма",c:C.accent},{v:"<1.5",label:"Случайные",c:C.textDim}].map((b) => (
              <div key={b.v} style={{ fontSize: 11, color: C.textMid }}>
                <span style={{ color: b.c, fontWeight: 600 }}>{b.v}</span> {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROYALTY STUB ──────────────────────────────────────────────────────────
function ScreenRoyalty() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: 16,
        opacity: 0.5,
      }}
    >
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontSize: 20, color: C.text, fontWeight: 600 }}>Роялти-прогноз</div>
      <div style={{ fontSize: 14, color: C.textMid }}>Раздел находится в разработке. Скоро появится прогноз выплат.</div>
    </div>
  );
}

// ── AUDIENCE ──────────────────────────────────────────────────────────────
function ScreenAudience({ period }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Gender row: средний сплит слева, график справа */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12 }}>
        {/* Сплит */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip="Распределение по полу (только стримы ≥30с)">Средний сплит</SectionTitle>
          {[
            { label: "Мужчины", value: 67.8, color: C.blue, norm: "70–80%", normOk: true },
            { label: "Женщины", value: 20, color: C.orange, norm: null },
            { label: "Не указано", value: 12.2, color: C.textDim, norm: null },
          ].map((g) => (
            <div key={g.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textMid }}>{g.label}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: g.color }}>{g.value}%</span>
                  {g.norm && (
                    <span style={{ fontSize: 10, color: g.normOk ? C.green : C.textDim, border: `1px solid ${g.normOk ? C.green : C.border}`, borderRadius: 4, padding: "1px 5px" }}>
                      норма: {g.norm}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
                <div style={{ background: g.color, width: `${g.value}%`, height: "100%", borderRadius: 4, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "8px 12px", background: C.greenDim, borderRadius: 8, border: `1px solid ${C.green}33` }}>
            <div style={{ fontSize: 11, color: C.green }}>▲ +19.1 п.п. женской аудитории за 4 месяца</div>
          </div>
        </div>

        {/* Гендер динамика */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip="Еженедельная доля слушателей по полу (стримы ≥30с)">Гендер аудитории по неделям</SectionTitle>
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            {[{label:"Мужчины",c:C.blue},{label:"Женщины",c:C.orange},{label:"Н/Д",c:C.textDim}].map((l)=>(
              <div key={l.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textMid}}>
                <span style={{width:10,height:2,background:l.c,display:"inline-block"}}/>
                {l.label}
              </div>
            ))}
          </div>
          {[
            { data: genderByWeek.male, color: C.blue },
            { data: genderByWeek.female, color: C.orange },
            { data: genderByWeek.nd, color: C.textDim },
          ].map((l, i) => (
            <div key={i} style={{ marginBottom: i < 2 ? -44 : 0, position: "relative" }}>
              <LineChart data={l.data.map((y) => ({ y }))} color={l.color} height={80} anim />
            </div>
          ))}
        </div>
      </div>

      {/* Age + Geography */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Возраст и пол */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip="Распределение по полу и возрасту (≥30с). Выделены ТОП-3 сегмента.">
            Распределение по полу и возрасту
          </SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {ageGenderData.map((d, i) => {
              const mW = (d.m / 40) * 100;
              const fW = (d.f / 40) * 100;
              const isTop = [2, 3, 4].includes(i);
              return (
                <div key={d.seg} style={{ display: "flex", alignItems: "center", gap: 8, opacity: isTop ? 1 : 0.5 }}>
                  <span style={{ fontSize: 11, color: isTop ? C.text : C.textDim, width: 40, textAlign: "right" }}>{d.seg}</span>
                  <div style={{ flex: 1, display: "flex", gap: 2 }}>
                    <div style={{ height: 14, borderRadius: 3, background: C.blue, width: `${mW}%`, transition: "width 0.8s" }} />
                    <div style={{ height: 14, borderRadius: 3, background: C.orange, width: `${fW}%`, transition: "width 0.8s" }} />
                  </div>
                  {isTop && (
                    <span style={{ fontSize: 10, color: C.textMid, width: 60, textAlign: "right" }}>
                      {(d.m + d.f).toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[{label:"Муж.",c:C.blue},{label:"Жен.",c:C.orange}].map((l)=>(
                <div key={l.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.textMid}}>
                  <span style={{width:10,height:10,borderRadius:2,background:l.c,display:"inline-block"}}/>
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Geography */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip="ТОП-5 стран по количеству стримов ≥30с. Динамика — изменение к аналогичному предыдущему периоду.">
            Топ-5 стран (стримы ≥30с)
          </SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {countryData.map((d, i) => {
              const maxV = countryData[0].value;
              const w = (d.value / maxV) * 100;
              const pos = d.delta > 0;
              return (
                <div key={d.country}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{d.country}</span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 13, color: C.textMid, fontFamily: "monospace" }}>{fmt(d.value)}</span>
                      <span style={{ fontSize: 11, color: pos ? C.green : C.red }}>
                        {pos ? "▲" : "▼"} {Math.abs(d.delta)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
                    <div
                      style={{
                        background: i === 0 ? C.accent : C.blue,
                        width: `${w}%`,
                        height: "100%",
                        borderRadius: 4,
                        transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Retention */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle tip="Пик retention 89.7% (норма отрасли 60–75%). Вторая волна новых слушателей в фев 2026.">
          Новые vs Вернувшиеся слушатели (≥30с)
        </SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <BarChart
              data={weeks.map((w, i) => ({ a: newListeners[i], b: retListeners[i] }))}
              colorA={C.accent}
              colorB={C.blue}
              height={140}
            />
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[{label:"Новые",c:C.accent},{label:"Вернувшиеся",c:C.blue}].map((l)=>(
                <div key={l.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textMid}}>
                  <span style={{width:10,height:10,borderRadius:2,background:l.c,display:"inline-block"}}/>
                  {l.label}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 8 }}>% вернувшихся по неделям</div>
            <LineChart data={retentionPct.map((y) => ({ y }))} color={C.green} height={100} anim />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: C.textDim }}>12.10</span>
              <span style={{ fontSize: 10, color: C.textDim }}>08.02</span>
            </div>
            <div style={{ marginTop: 10, padding: "8px 12px", background: C.greenDim, borderRadius: 8, border: `1px solid ${C.green}33`, fontSize: 12, color: C.green }}>
              Пик: 89.7% — выше нормы отрасли (60–75%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SOURCES ───────────────────────────────────────────────────────────────
function ScreenSources({ period }) {
  const sources = ["Радио", "Коллекция", "Поиск", "Альбом"];
  const srcColors = [C.accent, C.blue, C.green, C.orange];
  const srcKeys = ["radio", "collection", "search", "album"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Доля источников */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip="Доля каждого источника в общем числе стримов (≥30с). Сумма = 100%.">
            Источники трафика (доля, %)
          </SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sources.map((s, i) => {
              const v = sourceShareRoyal[srcKeys[i]];
              return (
                <div key={s}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.textMid }}>{s}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: srcColors[i] }}>{v}%</span>
                  </div>
                  <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
                    <div style={{ background: srcColors[i], width: `${v}%`, height: "100%", borderRadius: 4, transition: "width 0.8s" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, padding: "8px 12px", background: C.accentDim, borderRadius: 8, border: `1px solid ${C.accent}44`, fontSize: 12, color: C.accent }}>
            🏆 На последней неделе Коллекция обогнала Радио по роялти-стримам (62K vs 31K)
          </div>
        </div>

        {/* Динамика источников */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <SectionTitle tip="Абсолютное количество стримов ≥30с по каждому источнику.">
            Источники трафика (количество стримов)
          </SectionTitle>
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            {sources.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textMid }}>
                <span style={{ width: 10, height: 2, background: srcColors[i], display: "inline-block" }} />{s}
              </div>
            ))}
          </div>
          <svg viewBox="0 0 500 100" preserveAspectRatio="none" style={{ width: "100%", height: 100 }}>
            {srcKeys.map((key, ki) => {
              const vals = key === "radio"
                ? weeklyGe30.map((v) => v * 0.52)
                : key === "collection"
                ? weeklyGe30.map((v) => v * 0.44)
                : key === "search"
                ? weeklyGe30.map((v, i) => 5 + i * 0.7)
                : weeklyGe30.map((v) => v * 0.01);
              const maxV = Math.max(...vals);
              const pts = vals.map((v, i) => ({
                x: (i / (vals.length - 1)) * 500,
                y: 95 - (v / maxV) * 90,
              }));
              const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
              return <path key={key} d={path} fill="none" stroke={srcColors[ki]} strokeWidth="2" strokeLinecap="round" />;
            })}
          </svg>
        </div>
      </div>

      {/* Skip Rate */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle tip={'Skip Rate — доля стримов <30с от всех стримов по источнику.\nНорма: алгоритмические каналы (Радио) 25–35%, Коллекция <20%, Поиск <25%.'}>
          Skip Rate по источникам, %
        </SectionTitle>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          {sources.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textMid }}>
              <span style={{ width: 10, height: 2, background: srcColors[i], display: "inline-block" }} />{s}
            </div>
          ))}
        </div>
        <svg viewBox="0 0 500 120" preserveAspectRatio="none" style={{ width: "100%", height: 120 }}>
          <line x1="0" y1="30" x2="500" y2="30" stroke={C.border} strokeDasharray="4,4" strokeWidth="1" />
          <text x="2" y="28" fill={C.textDim} fontSize="9">35%</text>
          <line x1="0" y1="60" x2="500" y2="60" stroke={C.border} strokeDasharray="4,4" strokeWidth="1" />
          <text x="2" y="58" fill={C.textDim} fontSize="9">25%</text>
          {srcKeys.map((key, ki) => {
            const vals = skipBySource[key];
            const pts = vals.map((v, i) => ({
              x: (i / (vals.length - 1)) * 500,
              y: 120 - (v / 50) * 115,
            }));
            const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
            return <path key={key} d={path} fill="none" stroke={srcColors[ki]} strokeWidth="2" strokeLinecap="round" />;
          })}
        </svg>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, padding: "10px 14px", background: "#f05f5f11", border: `1px solid ${C.red}33`, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>⚠ Радио: Skip Rate растёт (37.7% → 41.8%)</div>
            <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>Алгоритм тестирует новые сегменты аудитории — в первую очередь женскую, менее привычную к хип-хопу</div>
          </div>
          <div style={{ flex: 1, padding: "10px 14px", background: C.greenDim, border: `1px solid ${C.green}33`, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Поиск — лучшая конверсия: 78.6%</div>
            <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>Рост поиска в 3.5× (5K → 17K стримов/нед.) — сигнал растущего brand awareness</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── INSIGHTS ──────────────────────────────────────────────────────────────
function ScreenInsights() {
  const kpis = [
    { icon: "📊", val: "+85%", label: "стримов на последней неделе", color: C.green },
    { icon: "🔄", val: "89.7%", label: "retention (норма 60–75%)", color: C.green },
    { icon: "⚡", val: "+19.1 п.п.", label: "женской аудитории за 4 мес.", color: C.blue },
    { icon: "🔍", val: "×3.5", label: "рост поискового трафика", color: C.accent },
  ];

  const story = [
    {
      phase: "Октябрь–Ноябрь 2025",
      title: "Алгоритмический буст",
      text: "Трек попал в ротацию Радио и быстро набрал 800К+ стримов в пике. Высокий Skip Rate (~30%) в первые недели — норма для алгоритмических каналов. Аудитория — преимущественно мужская (75%+), 18–34.",
      color: C.accent,
    },
    {
      phase: "Декабрь 2025 – Январь 2026",
      title: "Стабилизация и каталогизация",
      text: "Стримы выровнялись (~270К/нед.). Коллекция начала обгонять Радио по роялти-стримам — трек переходит из алгоритмического буста в органический каталог. Retention достиг пика 89.7%.",
      color: C.blue,
    },
    {
      phase: "Февраль 2026",
      title: "Вторая волна",
      text: "Стримы резко выросли до 760К за последнюю полную неделю (+85%). Поиск вырос в 3.5×. Рост женской аудитории (+19.1 п.п.) указывает на вирусный эффект в TikTok/Shorts. Алгоритм активировал новые сегменты.",
      color: C.green,
    },
  ];

  const recs = [
    {
      icon: "🎵",
      title: "Оптимизировать первые 30 секунд",
      text: "Skip Rate 30.3% при норме 25%. Проверьте интро через призму нового слушателя с Радио. Хук до 15-й секунды — ключ к снижению потерь.",
      priority: "высокий",
    },
    {
      icon: "💾",
      title: "Стимулировать добавление в коллекцию",
      text: "Каждое добавление в коллекцию снижает Skip Rate на ~14 п.п. CTA в описании трека, промо в stories, питчинг в плейлисты.",
      priority: "высокий",
    },
    {
      icon: "🔍",
      title: "Масштабировать поисковой рост",
      text: "Поиск вырос в 3.5× и имеет лучшую конверсию (78.6%). Определите источник роста (TikTok / упоминания в медиа) и усильте этот канал.",
      priority: "средний",
    },
    {
      icon: "👩",
      title: "Усилить женскую аудиторию",
      text: "+19.1 п.п. за 4 мес. — органический тренд. Коллаборации с женскими блогерами, UGC-кампании в Reels/Shorts, визуал клипа для женской аудитории.",
      priority: "средний",
    },
    {
      icon: "🌍",
      title: "Расширить географию",
      text: "КЗ (−3%) и БР (−5%) теряют долю. Локальные плейлист-питчинги, коллабы с артистами из KZ/BY, таргетированная реклама в этих регионах.",
      priority: "низкий",
    },
    {
      icon: "📡",
      title: "Поддержать вторую волну",
      text: "Январь–февраль показывает рост новых слушателей (22–26%). Важно поддержать промо-активностью в ближайшие 2–4 недели, пока волна не спала.",
      priority: "высокий",
    },
  ];

  const priorityColor = { высокий: C.red, средний: C.accent, низкий: C.textMid };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 18px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 22 }}>{k.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "monospace" }}>{k.val}</div>
              <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Сторителлинг */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle>История трека: что стоит за данными</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {story.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>
              {/* timeline */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: s.color, marginTop: 4, flexShrink: 0 }} />
                {i < story.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: C.border, minHeight: 30 }} />
                )}
              </div>
              <div style={{ paddingBottom: 20 }}>
                <div style={{ fontSize: 10, color: s.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.phase}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Рекомендации */}
      <div>
        <SectionTitle>Рекомендации</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10 }}>
          {recs.map((r) => (
            <div
              key={r.title}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{r.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.title}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: priorityColor[r.priority],
                    border: `1px solid ${priorityColor[r.priority]}55`,
                    borderRadius: 4,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.priority}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6 }}>{r.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const tabs = ["Обзор", "Роялти-прогноз", "Аудитория", "Источники", "Инсайты"];
  const [activeTab, setActiveTab] = useState("Обзор");
  const [period, setPeriod] = useState("Всё");
  const [animKey, setAnimKey] = useState(0);

  const handleTab = (t) => {
    setActiveTab(t);
    setAnimKey((k) => k + 1);
  };

  const handlePeriod = (p) => {
    setPeriod(p);
    setAnimKey((k) => k + 1);
  };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: 0,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .screen-enter { animation: fadeIn 0.35s ease forwards; }
        @media (max-width: 700px) {
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .two-col { grid-template-columns: 1fr !important; }
          .geo-grid { grid-template-columns: 260px 1fr; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
          .geo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.accent}, #e0a020)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            🎵
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Tom Ford</div>
            <div style={{ fontSize: 12, color: C.textMid }}>Moreart · ISRC: AEA3P2500395 · Яндекс.Музыка</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: C.textDim }}>Период:</div>
            <PeriodSwitcher value={period} onChange={handlePeriod} />
          </div>
        </div>
        <TabBar tabs={tabs} active={activeTab} onChange={handleTab} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <div key={animKey} className="screen-enter">
          {activeTab === "Обзор" && <ScreenOverview period={period} />}
          {activeTab === "Роялти-прогноз" && <ScreenRoyalty />}
          {activeTab === "Аудитория" && <ScreenAudience period={period} />}
          {activeTab === "Источники" && <ScreenSources period={period} />}
          {activeTab === "Инсайты" && <ScreenInsights />}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textDim, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>Методология <Tooltip text={"Ежедневная статистика Яндекс.Музыки.\nРоялти-стримы = ≥30с.\n≥30с + <30с = все стримы.\nДля gender/age применён weighted-bridge из ISO-week.\nБенчмарки: skip-rate 25% (алгоритм), 15% (коллекция); SPL >1.5; retention >80%."} /></span>
        <span>окт 2025 — фев 2026 · 8.6M стримов</span>
      </div>
    </div>
  );
}
