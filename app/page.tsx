"use client";

import React, { useMemo, useState } from "react";

type Stats = {
  atk: number;        // 공격력
  critChance: number; // 치명타확률 (0~1)
  critDmg: number;    // 치명타피해 (예: 2.0 = 200%)
  atkSpeed: number;   // 초당 공격 횟수 (예: 1.2)
};

type Effect = {
  name: string;
  enabled: boolean;

  // 예시: "짧은 지속시간 버프" 형태
  durationSec: number;
  cooldownSec: number;

  // 버프가 켜져 있을 때 스탯에 곱해지는 배수(또는 가산)
  atkMult: number;        // 공격력 배수
  critChanceAdd: number;  // 치확 가산(0~1)
  critDmgAdd: number;     // 치피 가산(예: 0.5 = +50%p → 2.0이면 2.5가 됨)
  atkSpeedMult: number;   // 공속 배수
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// 기대값 기반 "간이 DPS" 계산
function calcExpectedDps(stats: Stats) {
  const cc = clamp(stats.critChance, 0, 1);
  const cd = Math.max(1, stats.critDmg);
  // 1타 기대 데미지 계수: (1-cc)*1 + cc*cd
  const expectedHit = (1 - cc) * 1 + cc * cd;
  // DPS = 공격력 * 기대계수 * 공속
  return stats.atk * expectedHit * stats.atkSpeed;
}

function applyEffect(stats: Stats, eff: Effect) {
  return {
    atk: stats.atk * eff.atkMult,
    critChance: clamp(stats.critChance + eff.critChanceAdd, 0, 1),
    critDmg: Math.max(1, stats.critDmg + eff.critDmgAdd),
    atkSpeed: stats.atkSpeed * eff.atkSpeedMult,
  };
}

// 가동률(업타임) = duration / cooldown (간이)
function calcUptime(eff: Effect) {
  if (!eff.enabled) return 0;
  if (eff.cooldownSec <= 0) return 1;
  return clamp(eff.durationSec / eff.cooldownSec, 0, 1);
}

export default function Home() {
  const [base, setBase] = useState<Stats>({
    atk: 100,
    critChance: 0.2,
    critDmg: 2.0,
    atkSpeed: 1.0,
  });

  const [eff, setEff] = useState<Effect>({
    name: "테스트 방어구 액티브",
    enabled: true,
    durationSec: 4,
    cooldownSec: 20,
    atkMult: 1.15,
    critChanceAdd: 0.1,
    critDmgAdd: 0.25,
    atkSpeedMult: 1.0,
  });

  const result = useMemo(() => {
    const baseDps = calcExpectedDps(base);

    if (!eff.enabled) {
      return {
        baseDps,
        buffDps: baseDps,
        avgDps: baseDps,
        uptime: 0,
        increasePct: 0,
      };
    }

    const uptime = calcUptime(eff);
    const buffedStats = applyEffect(base, eff);
    const buffDps = calcExpectedDps(buffedStats);

    // 평균 DPS = (업타임 * 버프DPS) + ((1-업타임) * 기본DPS)
    const avgDps = uptime * buffDps + (1 - uptime) * baseDps;
    const increasePct = ((avgDps / baseDps) - 1) * 100;

    return { baseDps, buffDps, avgDps, uptime, increasePct };
  }, [base, eff]);

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>방어구 효과 시뮬레이터 (MVP)</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        입력 스탯 + 방어구 액티브(지속/쿨/스탯변화)로 <b>기대 DPS</b>와 <b>평균 DPS(업타임 반영)</b>를 계산해.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        {/* Base Stats */}
        <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>기본 스탯</h2>

          <Row label="공격력" value={base.atk} onChange={(v) => setBase({ ...base, atk: v })} step={1} />
          <Row label="치확(0~1)" value={base.critChance} onChange={(v) => setBase({ ...base, critChance: v })} step={0.01} />
          <Row label="치피(예: 2.0=200%)" value={base.critDmg} onChange={(v) => setBase({ ...base, critDmg: v })} step={0.05} />
          <Row label="공속(초당타수)" value={base.atkSpeed} onChange={(v) => setBase({ ...base, atkSpeed: v })} step={0.05} />

          <small style={{ opacity: 0.7 }}>
            참고: 치확은 0~1, 치피는 1 이상(1=100%)로 계산.
          </small>
        </section>

        {/* Effect */}
        <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>방어구 액티브 효과</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={eff.enabled}
                onChange={(e) => setEff({ ...eff, enabled: e.target.checked })}
              />
              적용
            </label>
          </div>

          <Row label="지속시간(초)" value={eff.durationSec} onChange={(v) => setEff({ ...eff, durationSec: v })} step={0.5} />
          <Row label="쿨타임(초)" value={eff.cooldownSec} onChange={(v) => setEff({ ...eff, cooldownSec: v })} step={1} />

          <hr style={{ margin: "12px 0", border: 0, borderTop: "1px solid #f0f0f0" }} />

          <Row label="공격력 배수" value={eff.atkMult} onChange={(v) => setEff({ ...eff, atkMult: v })} step={0.01} />
          <Row label="치확 + (가산)" value={eff.critChanceAdd} onChange={(v) => setEff({ ...eff, critChanceAdd: v })} step={0.01} />
          <Row label="치피 + (가산)" value={eff.critDmgAdd} onChange={(v) => setEff({ ...eff, critDmgAdd: v })} step={0.05} />
          <Row label="공속 배수" value={eff.atkSpeedMult} onChange={(v) => setEff({ ...eff, atkSpeedMult: v })} step={0.01} />

          <small style={{ opacity: 0.7 }}>
            업타임 = 지속/쿨 (간이). “짧은 지속 + 명확한 타이밍” 컨셉을 빠르게 비교하기 위한 모델이야.
          </small>
        </section>
      </div>

      {/* Results */}
      <section style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>결과</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 10 }}>
          <Metric title="기본 DPS" value={result.baseDps} />
          <Metric title="버프 DPS(켜짐)" value={result.buffDps} />
          <Metric title="업타임" value={`${Math.round(result.uptime * 100)}%`} />
          <Metric title="평균 DPS(업타임 반영)" value={result.avgDps} />
          <Metric title="증가율" value={`${result.increasePct.toFixed(2)}%`} />
        </div>

        <p style={{ marginTop: 12, opacity: 0.8 }}>
          다음 단계로는 <b>효과 프리셋 저장</b>, <b>여러 효과 비교(표/그래프)</b>, <b>세트(4파츠) 조합</b>,
          <b>스킬/쿨타임 기반 시뮬</b> 같은 걸 붙이면 “기획툴” 느낌이 확 살아난다링.
        </p>
      </section>
    </main>
  );
}

function Row(props: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  const { label, value, onChange, step } = props;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10, alignItems: "center", marginTop: 10 }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
          width: "100%",
        }}
      />
    </div>
  );
}

function Metric(props: { title: string; value: number | string }) {
  const { title, value } = props;
  const pretty =
    typeof value === "number"
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : value;

  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{pretty}</div>
    </div>
  );
}