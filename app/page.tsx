"use client";

import React, { useMemo, useRef, useState } from "react";

/** ===== Domain ===== */
type Tier = 1 | 2 | 3;
type Acquire = "BASIC_CRAFT" | "LOOT_CRAFT" | "DUNGEON_CORE" | "BOSS_DROP";
type Material = "Plate" | "Leather" | "Cloth";
type Part = "Armor" | "Helm" | "Gloves" | "Shoes";

type SpecialType = "NONE" | "PROC_PASSIVE" | "ACTIVE";

type StatMod =
  | "DefenseVary"
  | "MaxHpVary"
  | "DamageDownVaryper"
  | "AttackVary"
  | "AtkSpeedVaryper"
  | "SCNegativeRecoveryVary"
  | "MaxMpVary"
  | "SkillCooldownAccVary"
  | "RegenHpVary"
  | "CriDamageVaryper"
  | "CriVaryper"
  | "RegenMpVary"
  | "CostMpDownVaryper"
  | "HealAcceptVary"
  | "DamageUpVaryper"
  | "HealAmpVaryper"
  | "PVEDamageDownVaryper"
  | "PVPDamageDownVaryper"
  | "PVEDamageUpVaryper"
  | "PVPDamageUpVaryper"
  | "RecoveryRegainVary"
  | "RecoveryRegainVaryper";

type PassiveSlot = StatMod[]; // min 1 max 2

type ArmorKey = { tier: Tier; acquire: Acquire; material: Material; part: Part };

type ArmorConfig = ArmorKey & {
  id: string; // uniqueId = baseId + hash(효과 시그니처)
  passive1: PassiveSlot;
  passive2: PassiveSlot;
  specialType: SpecialType;
  specialEffect: string;
};

const STORAGE_KEY = "armor_effect_distribution_store_v5";

/** ===== Labels ===== */
const ACQUIRE_LABEL: Record<Acquire, string> = {
  BASIC_CRAFT: "기본제작",
  LOOT_CRAFT: "전리품제작",
  DUNGEON_CORE: "던전코어",
  BOSS_DROP: "드랍(Boss)",
};

const MATERIALS: Material[] = ["Plate", "Leather", "Cloth"];
const PARTS: Part[] = ["Armor", "Helm", "Gloves", "Shoes"];
const SPECIAL_TYPES: SpecialType[] = ["NONE", "PROC_PASSIVE", "ACTIVE"];

const PART_LABEL: Record<Part, string> = {
  Armor: "아머",
  Helm: "헬멧",
  Gloves: "장갑",
  Shoes: "신발",
};

const MATERIAL_LABEL: Record<Material, string> = {
  Plate: "판금",
  Leather: "가죽",
  Cloth: "천",
};

const SPECIAL_LABEL: Record<SpecialType, string> = {
  NONE: "없음",
  PROC_PASSIVE: "Proc Passive",
  ACTIVE: "Active",
};

const STATMOD_LABEL: Record<StatMod, string> = {
  DefenseVary: "DefenseVary (방어력)",
  MaxHpVary: "MaxHpVary (최대 생명력)",
  DamageDownVaryper: "DamageDownVaryper (받는 피해 감소)",
  AttackVary: "AttackVary (공격력)",
  AtkSpeedVaryper: "AtkSpeedVaryper (공격 속도)",
  SCNegativeRecoveryVary: "SCNegativeRecoveryVary (상태이상 저항력)",
  MaxMpVary: "MaxMpVary (최대 마력)",
  SkillCooldownAccVary: "SkillCooldownAccVary (스킬 가속)",
  RegenHpVary: "RegenHpVary (생명력 자연 회복)",
  CriDamageVaryper: "CriDamageVaryper (치명타 피해)",
  CriVaryper: "CriVaryper (치명타 확률)",
  RegenMpVary: "RegenMpVary (마력 자연 회복)",
  CostMpDownVaryper: "CostMpDownVaryper (마나 소모량 감소)",
  HealAcceptVary: "HealAcceptVary (받는 치유량)",
  DamageUpVaryper: "DamageUpVaryper (피해 증가)",
  HealAmpVaryper: "HealAmpVaryper (치유력)",
  PVEDamageDownVaryper: "PVEDamageDownVaryper (PVE 피해 감소)",
  PVPDamageDownVaryper: "PVPDamageDownVaryper (PVP 피해 감소)",
  PVEDamageUpVaryper: "PVEDamageUpVaryper (PVE 피해 증가)",
  PVPDamageUpVaryper: "PVPDamageUpVaryper (PVP 피해 증가)",
  RecoveryRegainVary: "RecoveryRegainVary (물약 회복량)",
  RecoveryRegainVaryper: "RecoveryRegainVaryper (물약 회복률)",
};

const STATMODS: StatMod[] = Object.keys(STATMOD_LABEL) as StatMod[];

/** 특수효과 풀 */
const SPECIAL_EFFECT_POOL: string[] = [
  "피격 시 체력 회복 (Proc Passive)",
  "피격 시 방어력 증가 (Proc Passive)",
  "피격 시 이동속도 증가 (Proc Passive)",
  "적 처치 시 체력 회복 (Proc Passive)",
  "적 처치 시 공격속도 증가 (Proc Passive)",
  "공격 시 공격속도 증가 (Proc Passive)",
  "내 체력이 90% 이상일 경우 마나 자연회복량 증가 (Proc Passive)",
  "일반 공격 시 스킬 가속 증가(Proc Passive)",
  "공격 시 공격력 증가 (Proc Passive)",
  "공격 시 스킬 가속 증가 (Proc Passive)",
  "스킬 공격 시 마나 회복 (Proc Passive)",
  "기절 시 방어막 생성 (Proc Passive)",
  "내 체력이 50% 미만이면 체력 자연회복량 증가 (Proc Passive)",
  "내 체력이 30% 미만이면 공격력 증가 (Proc Passive)",
  "피격 시 치명타 확률 증가 (Proc Passive)",
  "적 처치 시 치명타피해 증가 (Proc Passive)",
  "즉시 실드 생성 (Active)",
  "즉시 체력 회복 (Active)",
  "짧은 시간 공격속도 증가 (Active)",
];

const AVAILABILITY: Record<Tier, Record<Acquire, boolean>> = {
  1: { BASIC_CRAFT: true, LOOT_CRAFT: false, DUNGEON_CORE: false, BOSS_DROP: false },
  2: { BASIC_CRAFT: true, LOOT_CRAFT: true, DUNGEON_CORE: true, BOSS_DROP: true },
  3: { BASIC_CRAFT: true, LOOT_CRAFT: true, DUNGEON_CORE: true, BOSS_DROP: true },
};

const ACQUIRE_ORDER: Acquire[] = ["BASIC_CRAFT", "LOOT_CRAFT", "DUNGEON_CORE", "BOSS_DROP"];
const MATERIAL_ORDER: Material[] = ["Plate", "Leather", "Cloth"];
const PART_ORDER: Part[] = ["Armor", "Helm", "Gloves", "Shoes"];

function keyToBaseId(k: ArmorKey) {
  return `T${k.tier}|${k.acquire}|${k.material}|${k.part}`;
}

function clampSlot(slot: PassiveSlot) {
  const uniq = Array.from(new Set(slot));
  return uniq.slice(0, 2);
}

function isValidConfig(cfg: ArmorConfig) {
  const p1 = cfg.passive1.length >= 1 && cfg.passive1.length <= 2;
  const p2 = cfg.passive2.length <= 2; // ✅ 0~2 허용

  const specialOk =
    cfg.specialType === "NONE"
      ? true
      : cfg.specialEffect.trim().length > 0;

  return p1 && p2 && specialOk;
}

/** ===== Unique ID ===== */
function normalizeSlot(slot: PassiveSlot) {
  return [...slot].sort().join(",");
}
function configSignature(cfg: Pick<ArmorConfig, "passive1" | "passive2" | "specialType" | "specialEffect">) {
  return [
    `p1:${normalizeSlot(cfg.passive1)}`,
    `p2:${normalizeSlot(cfg.passive2)}`,
    `st:${cfg.specialType}`,
    `se:${cfg.specialEffect.trim()}`,
  ].join("|");
}
function hashStr(input: string) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16).toUpperCase();
}
function makeUniqueId(baseId: string, cfg: Pick<ArmorConfig, "passive1" | "passive2" | "specialType" | "specialEffect">) {
  const sig = configSignature(cfg);
  const hx = hashStr(sig).slice(0, 8);
  return `${baseId}|h${hx}`;
}
function getBaseIdFromUniqueId(uniqueId: string) {
  const seg = uniqueId.split("|");
  return seg.slice(0, 4).join("|");
}

/** ===== Export/Import helpers ===== */
function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isTier(x: any): x is Tier {
  return x === 1 || x === 2 || x === 3;
}
function isAcquire(x: any): x is Acquire {
  return x === "BASIC_CRAFT" || x === "LOOT_CRAFT" || x === "DUNGEON_CORE" || x === "BOSS_DROP";
}
function isMaterial(x: any): x is Material {
  return x === "Plate" || x === "Leather" || x === "Cloth";
}
function isPart(x: any): x is Part {
  return x === "Armor" || x === "Helm" || x === "Gloves" || x === "Shoes";
}
function isSpecialType(x: any): x is SpecialType {
  return x === "NONE" || x === "PROC_PASSIVE" || x === "ACTIVE";
}
function isStatMod(x: any): x is StatMod {
  return typeof x === "string" && (STATMODS as string[]).includes(x);
}
function sanitizeSlot(arr: any): PassiveSlot {
  if (!Array.isArray(arr)) return [];
  const cleaned = arr.filter(isStatMod);
  return clampSlot(cleaned);
}

function sanitizeConfig(raw: any): ArmorConfig | null {
  if (!raw || typeof raw !== "object") return null;

  // allow both: raw.id (uniqueId) or compute from keys+effects
  const tier = Number(raw.tier) as Tier;
  const acquire = raw.acquire as Acquire;
  const material = raw.material as Material;
  const part = raw.part as Part;

  if (!isTier(tier) || !isAcquire(acquire) || !isMaterial(material) || !isPart(part)) return null;

  const passive1 = sanitizeSlot(raw.passive1);
  const passive2 = sanitizeSlot(raw.passive2);

  const specialType: SpecialType = isSpecialType(raw.specialType) ? raw.specialType : "NONE";
  const specialEffect: string = typeof raw.specialEffect === "string" ? raw.specialEffect : "";

  const baseId = keyToBaseId({ tier, acquire, material, part });
  const id = typeof raw.id === "string" && raw.id.includes("|h")
    ? raw.id
    : makeUniqueId(baseId, { passive1, passive2, specialType, specialEffect } as any);

  const cfg: ArmorConfig = {
    id,
    tier,
    acquire,
    material,
    part,
    passive1,
    passive2,
    specialType,
    specialEffect: specialType === "NONE" ? "" : specialEffect, // NONE면 비움
  };

  if (!isValidConfig(cfg)) {
    // invalid = skip (형아가 원하면 여기서 "불완전 데이터도 살리기" 옵션 가능)
    return null;
  }

  return cfg;
}

/** ===== Color Tags ===== */
const MATERIAL_COLOR: Record<Material, { bg: string; fg: string; border: string }> = {
  Plate: { bg: "rgba(59,130,246,0.18)", fg: "#93c5fd", border: "rgba(59,130,246,0.35)" },
  Leather: { bg: "rgba(245,158,11,0.18)", fg: "#fcd34d", border: "rgba(245,158,11,0.35)" },
  Cloth: { bg: "rgba(168,85,247,0.18)", fg: "#d8b4fe", border: "rgba(168,85,247,0.35)" },
};

const PART_COLOR: Record<Part, { bg: string; fg: string; border: string }> = {
  Armor: { bg: "rgba(16,185,129,0.18)", fg: "#6ee7b7", border: "rgba(16,185,129,0.35)" },
  Helm: { bg: "rgba(236,72,153,0.18)", fg: "#f9a8d4", border: "rgba(236,72,153,0.35)" },
  Gloves: { bg: "rgba(239,68,68,0.18)", fg: "#fca5a5", border: "rgba(239,68,68,0.35)" },
  Shoes: { bg: "rgba(14,165,233,0.18)", fg: "#7dd3fc", border: "rgba(14,165,233,0.35)" },
};

type ViewMode = "TABLE" | "BOARD";

export default function Page() {
  /** ===== Selection ===== */
  const [tier, setTier] = useState<Tier>(1);
  const acquireOptions = useMemo(
    () => (Object.keys(ACQUIRE_LABEL) as Acquire[]).filter((a) => AVAILABILITY[tier][a]),
    [tier]
  );
  const [acquire, setAcquire] = useState<Acquire>("BASIC_CRAFT");
  const [material, setMaterial] = useState<Material>("Plate");
  const [part, setPart] = useState<Part>("Armor");

  React.useEffect(() => {
    if (!AVAILABILITY[tier][acquire]) setAcquire(acquireOptions[0] ?? "BASIC_CRAFT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  /** ===== Store + Draft ===== */
  const [store, setStore] = useState<Record<string, ArmorConfig>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("TABLE");
  const [compareMode, setCompareMode] = useState(false);

  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenView, setFullscreenView] = useState<ViewMode>("BOARD");

  // Import UX
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importConfirm, setImportConfirm] = useState<null | { incoming: ArmorConfig[]; rawName: string }>(null);
  const [importMode, setImportMode] = useState<"MERGE" | "REPLACE">("MERGE"); // ✅ 병합/덮어쓰기

  // ✅ localStorage load
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { store: Record<string, ArmorConfig>; savedIds: string[] };
      if (parsed?.store && Array.isArray(parsed?.savedIds)) {
        setStore(parsed.store);
        setSavedIds(new Set(parsed.savedIds));
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ localStorage save
  React.useEffect(() => {
    try {
      const payload = { store, savedIds: Array.from(savedIds) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [store, savedIds]);

  const currentKey: ArmorKey = { tier, acquire, material, part };
  const baseId = keyToBaseId(currentKey);

  const [draft, setDraft] = useState<ArmorConfig>(() => ({
    ...currentKey,
    id: "",
    passive1: [],
    passive2: [],
    specialType: "NONE",
    specialEffect: "",
  }));

  // ✅ baseId 변경 시: 해당 baseId의 마지막 저장본 로딩
  React.useEffect(() => {
    const candidates = Array.from(savedIds)
      .filter((id) => id.startsWith(baseId + "|h"))
      .map((id) => store[id])
      .filter(Boolean);

    if (candidates.length > 0) {
      const latest = candidates[candidates.length - 1];
      setDraft({ ...latest });
    } else {
      setDraft({
        ...currentKey,
        id: "",
        passive1: [],
        passive2: [],
        specialType: "NONE",
        specialEffect: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  }

  /** ===== Drag & Drop ===== */
  function onDragStartStat(e: React.DragEvent, stat: StatMod) {
    e.dataTransfer.setData("text/statmod", stat);
    e.dataTransfer.effectAllowed = "copy";
  }
  function onDragStartSpecial(e: React.DragEvent, eff: string) {
    e.dataTransfer.setData("text/special", eff);
    e.dataTransfer.effectAllowed = "copy";
  }
  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function dropTo(slotName: "passive1" | "passive2", e: React.DragEvent) {
    e.preventDefault();
    const stat = e.dataTransfer.getData("text/statmod") as StatMod;
    if (!stat) return;
    setDraft((prev) => {
      const slot = prev[slotName] ?? [];
      if (slot.includes(stat)) return prev;
      if (slot.length >= 2) return prev;
      return { ...prev, [slotName]: clampSlot([...slot, stat]) } as ArmorConfig;
    });
  }

  function dropSpecial(e: React.DragEvent) {
    e.preventDefault();
    const eff = e.dataTransfer.getData("text/special");
    if (!eff) return;
    setDraft((prev) => {
      if (prev.specialType === "NONE") {
        return { ...prev, specialType: "PROC_PASSIVE", specialEffect: eff };
      }
      return { ...prev, specialEffect: eff };
    });
  }

  function removeFrom(slotName: "passive1" | "passive2", stat: StatMod) {
    setDraft((prev) => {
      const next = (prev[slotName] ?? []).filter((s) => s !== stat);
      return { ...prev, [slotName]: next } as ArmorConfig;
    });
  }

  function clearSpecial() {
    setDraft((prev) => ({ ...prev, specialEffect: "" }));
  }

  /** ===== Save / Reset / Delete ===== */
  const canSave = isValidConfig(draft);

  function saveCurrent() {
    if (!canSave) {
      showToast("저장 실패: 패시브1/2 최소 1개 + (특수 타입 있으면 특수효과 1개 필요)");
      return;
    }

    const uniqueId = makeUniqueId(baseId, draft);
    const existed = savedIds.has(uniqueId);

    const cfg: ArmorConfig = {
      ...draft,
      ...currentKey,
      id: uniqueId,
    };

    setStore((prev) => ({ ...prev, [uniqueId]: cfg }));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(uniqueId);
      return next;
    });

    showToast(existed ? "동일 효과가 이미 있어 (업데이트됨)" : "새 효과 버전 저장 완료!");
  }

  function resetAllSaved() {
    setStore({});
    setSavedIds(new Set());
    setConfirmReset(false);
    showToast("저장된 방어구 정보를 모두 초기화했어!");
  }

  function deleteRow(uniqueId: string) {
    const cfg = store[uniqueId];
    if (!cfg) return;

    const ok = window.confirm(
      `이 항목을 삭제할까?\n${cfg.tier}T / ${ACQUIRE_LABEL[cfg.acquire]} / ${MATERIAL_LABEL[cfg.material]} / ${PART_LABEL[cfg.part]}`
    );
    if (!ok) return;

    setStore((prev) => {
      const next = { ...prev };
      delete next[uniqueId];
      return next;
    });
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(uniqueId);
      return next;
    });

    if (getBaseIdFromUniqueId(uniqueId) === baseId) {
      setDraft({
        ...currentKey,
        id: "",
        passive1: [],
        passive2: [],
        specialType: "NONE",
        specialEffect: "",
      });
    }

    showToast("삭제 완료");
  }

  function exportSaved() {
    const list = Array.from(savedIds)
      .map((id) => store[id])
      .filter(Boolean);

    downloadJson("armor_effect_distribution_saved.json", {
      exportedAt: new Date().toISOString(),
      version: 1,
      configs: list,
    });
  }

  /** ===== Import ===== */
  function openImport() {
    fileRef.current?.click();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // 지원 포맷:
      // 1) { configs: [...] }
      // 2) [...] (배열만)
      const rawList = Array.isArray(parsed) ? parsed : parsed?.configs;
      if (!Array.isArray(rawList)) {
        showToast("임포트 실패: JSON 형식이 올바르지 않아 (configs 배열 필요)");
        return;
      }

      const incoming: ArmorConfig[] = rawList.map(sanitizeConfig).filter(Boolean) as ArmorConfig[];
      if (incoming.length === 0) {
        showToast("임포트 실패: 유효한 항목이 하나도 없어");
        return;
      }

      setImportConfirm({ incoming, rawName: file.name });
    } catch {
      showToast("임포트 실패: JSON 파싱 오류");
    }
  }

  function applyImport() {
    if (!importConfirm) return;
    const incoming = importConfirm.incoming;

    if (importMode === "REPLACE") {
      const nextStore: Record<string, ArmorConfig> = {};
      const nextIds = new Set<string>();
      for (const cfg of incoming) {
        nextStore[cfg.id] = cfg;
        nextIds.add(cfg.id);
      }
      setStore(nextStore);
      setSavedIds(nextIds);
      setImportConfirm(null);
      showToast(`임포트 완료(덮어쓰기): ${incoming.length}개`);
      return;
    }

    // MERGE
    setStore((prev) => {
      const next = { ...prev };
      for (const cfg of incoming) next[cfg.id] = cfg; // 같은 id면 update
      return next;
    });
    setSavedIds((prev) => {
      const next = new Set(prev);
      for (const cfg of incoming) next.add(cfg.id);
      return next;
    });

    setImportConfirm(null);
    showToast(`임포트 완료(병합): ${incoming.length}개`);
  }

  /** ===== Saved List ===== */
  const savedList: ArmorConfig[] = useMemo(() => {
    const list = Array.from(savedIds)
      .map((id) => store[id])
      .filter(Boolean);

    list.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      const ai = ACQUIRE_ORDER.indexOf(a.acquire);
      const bi = ACQUIRE_ORDER.indexOf(b.acquire);
      if (ai !== bi) return ai - bi;
      const mi = MATERIAL_ORDER.indexOf(a.material);
      const mbi = MATERIAL_ORDER.indexOf(b.material);
      if (mi !== mbi) return mi - mbi;
      const pi = PART_ORDER.indexOf(a.part);
      const pbi = PART_ORDER.indexOf(b.part);
      if (pi !== pbi) return pi - pbi;
      return a.id.localeCompare(b.id);
    });

    return list;
  }, [savedIds, store]);

  /** ===== Filters ===== */
  const [fTier, setFTier] = useState<Tier | "ALL">("ALL");
  const [fAcquire, setFAcquire] = useState<Acquire | "ALL">("ALL");
  const [fMaterial, setFMaterial] = useState<Material | "ALL">("ALL");
  const [fPart, setFPart] = useState<Part | "ALL">("ALL");
  const [fSpecialType, setFSpecialType] = useState<SpecialType | "ALL">("ALL");
  const [q, setQ] = useState("");

  const filteredList = useMemo(() => {
    const query = q.trim().toLowerCase();
    return savedList.filter((cfg) => {
      if (fTier !== "ALL" && cfg.tier !== fTier) return false;
      if (fAcquire !== "ALL" && cfg.acquire !== fAcquire) return false;
      if (fMaterial !== "ALL" && cfg.material !== fMaterial) return false;
      if (fPart !== "ALL" && cfg.part !== fPart) return false;
      if (fSpecialType !== "ALL" && cfg.specialType !== fSpecialType) return false;

      if (!query) return true;
      const hay = [
        `${cfg.tier}T`,
        ACQUIRE_LABEL[cfg.acquire],
        MATERIAL_LABEL[cfg.material],
        PART_LABEL[cfg.part],
        SPECIAL_LABEL[cfg.specialType],
        cfg.specialEffect,
        ...cfg.passive1.map((s) => STATMOD_LABEL[s]),
        ...cfg.passive2.map((s) => STATMOD_LABEL[s]),
        cfg.id,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [savedList, fTier, fAcquire, fMaterial, fPart, fSpecialType, q]);

  function jumpTo(cfg: ArmorConfig) {
    setTier(cfg.tier);
    setAcquire(cfg.acquire);
    setMaterial(cfg.material);
    setPart(cfg.part);
    setDraft({ ...cfg });
    showToast("선택 항목으로 이동");
  }

  /** ===== Board Model ===== */
  const boardModel = useMemo(() => {
    const map: Record<string, any> = {};
    for (const cfg of filteredList) {
      const t = String(cfg.tier);
      map[t] ??= {};
      map[t][cfg.acquire] ??= {};
      map[t][cfg.acquire][cfg.material] ??= {};
      map[t][cfg.acquire][cfg.material][cfg.part] ??= [];
      map[t][cfg.acquire][cfg.material][cfg.part].push(cfg);
    }

    for (const t of Object.keys(map)) {
      for (const a of Object.keys(map[t]) as Acquire[]) {
        for (const m of Object.keys(map[t][a]) as Material[]) {
          for (const p of Object.keys(map[t][a][m]) as Part[]) {
            map[t][a][m][p].sort((x: ArmorConfig, y: ArmorConfig) => x.id.localeCompare(y.id));
          }
        }
      }
    }

    return map as Record<string, Record<Acquire, Record<Material, Partial<Record<Part, ArmorConfig[]>>>>>;
  }, [filteredList]);

  const mTag = MATERIAL_COLOR[material];
  const pTag = PART_COLOR[part];

  const contentHeight = "calc(100vh - 320px)";

  /** ===== Right Content Renderer ===== */
  const RightContent = (props: { inFullscreen?: boolean; modeOverride?: ViewMode }) => {
    const mode = props.modeOverride ?? viewMode;

    if (savedList.length === 0) {
      return (
        <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.6 }}>
          아직 저장된 항목이 없어. 가운데에서 세팅 후 <b>저장</b>을 눌러줘.
        </div>
      );
    }

    if (mode === "TABLE") {
      return (
        <div style={{ ...styles.tableWrap, height: props.inFullscreen ? "calc(100vh - 220px)" : contentHeight }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <Th>티어</Th>
                <Th>획득</Th>
                <Th>재질</Th>
                <Th>파츠</Th>
                <Th>패시브1</Th>
                <Th>패시브2</Th>
                <Th>특수타입</Th>
                <Th>특수효과</Th>
                <Th>버전</Th>
                <Th style={{ width: 92 }}>삭제</Th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((cfg) => {
                const rowBaseId = keyToBaseId(cfg);
                const isSameCell = rowBaseId === baseId;
                const isExact = cfg.id === draft.id && draft.id !== "";
                const ver = cfg.id.split("|h")[1] ?? "";
                return (
                  <tr key={cfg.id} style={isExact ? styles.trActive : isSameCell ? styles.trSameCell : undefined}>
                    <Td>
                      <button style={styles.link} onClick={() => jumpTo(cfg)} title="클릭해서 편집으로 이동">
                        {cfg.tier}T
                      </button>
                    </Td>
                    <Td>{ACQUIRE_LABEL[cfg.acquire]}</Td>
                    <Td>
                      <Tag
                        label={MATERIAL_LABEL[cfg.material]}
                        bg={MATERIAL_COLOR[cfg.material].bg}
                        fg={MATERIAL_COLOR[cfg.material].fg}
                        border={MATERIAL_COLOR[cfg.material].border}
                      />
                    </Td>
                    <Td>
                      <Tag
                        label={PART_LABEL[cfg.part]}
                        bg={PART_COLOR[cfg.part].bg}
                        fg={PART_COLOR[cfg.part].fg}
                        border={PART_COLOR[cfg.part].border}
                      />
                    </Td>
                    <Td>
                      <InlineList items={cfg.passive1.map((s) => STATMOD_LABEL[s])} />
                    </Td>
                    <Td>
                      <InlineList items={cfg.passive2.map((s) => STATMOD_LABEL[s])} />
                    </Td>
                    <Td>{SPECIAL_LABEL[cfg.specialType]}</Td>
                    <Td style={{ maxWidth: 280 }}>
                      <div style={{ whiteSpace: "normal", wordBreak: "break-word", opacity: 0.95 }}>
                        {cfg.specialType === "NONE" ? <span style={{ opacity: 0.6 }}>-</span> : cfg.specialEffect}
                      </div>
                    </Td>
                    <Td style={{ opacity: 0.8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      {ver ? ver.slice(0, 6) : "-"}
                    </Td>
                    <Td>
                      <button style={styles.rowDel} onClick={() => deleteRow(cfg.id)} title="이 항목 삭제">
                        🗑
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // BOARD
    return (
      <div style={{ ...styles.boardWrap, height: props.inFullscreen ? "calc(100vh - 220px)" : contentHeight }}>
        {compareMode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([1, 2, 3] as Tier[])
              .filter((t) => (fTier === "ALL" ? true : t === fTier))
              .map((t) => {
                const tierMap = boardModel[String(t)];
                if (!tierMap) return null;

                return (
                  <div key={`cmp_t_${t}`} style={styles.cmpTier}>
                    <div style={styles.cmpTierHeader}>
                      <div style={{ fontWeight: 950 }}>{t}T</div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>재질(가로) × 파츠(세로) / 동일 조건 버전은 셀 내부에 여러 장</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {ACQUIRE_ORDER.filter((a) => (fAcquire === "ALL" ? true : a === fAcquire)).map((a) => {
                        const acquireMap = tierMap[a];
                        if (!acquireMap) return null;

                        return (
                          <div key={`cmp_${t}_${a}`} style={styles.cmpAcquire}>
                            <div style={styles.cmpAcquireHeader}>{ACQUIRE_LABEL[a]}</div>

                            <div style={styles.cmpGrid}>
                              <div style={styles.cmpCorner} />
                              {MATERIAL_ORDER.filter((m) => (fMaterial === "ALL" ? true : m === fMaterial)).map((m) => (
                                <div key={`cmp_h_${t}_${a}_${m}`} style={styles.cmpHeaderCell}>
                                  <Tag
                                    label={`${MATERIAL_LABEL[m]} (${m})`}
                                    bg={MATERIAL_COLOR[m].bg}
                                    fg={MATERIAL_COLOR[m].fg}
                                    border={MATERIAL_COLOR[m].border}
                                  />
                                </div>
                              ))}

                              {PART_ORDER.filter((p) => (fPart === "ALL" ? true : p === fPart)).map((p) => (
                                <React.Fragment key={`cmp_row_${t}_${a}_${p}`}>
                                  <div style={styles.cmpRowHeader}>
                                    <Tag
                                      label={`${PART_LABEL[p]} (${p})`}
                                      bg={PART_COLOR[p].bg}
                                      fg={PART_COLOR[p].fg}
                                      border={PART_COLOR[p].border}
                                    />
                                  </div>

                                  {MATERIAL_ORDER.filter((m) => (fMaterial === "ALL" ? true : m === fMaterial)).map((m) => {
                                    const list = acquireMap?.[m]?.[p] ?? [];
                                    const filtered = (list as ArmorConfig[]).filter((cfg) =>
                                      fSpecialType === "ALL" ? true : cfg.specialType === fSpecialType
                                    );

                                    if (!filtered.length) {
                                      return (
                                        <div key={`cmp_empty_${t}_${a}_${p}_${m}`} style={styles.cmpCellEmpty}>
                                          <span style={{ opacity: 0.45, fontSize: 12 }}>-</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={`cmp_cell_${t}_${a}_${p}_${m}`} style={styles.cmpCellStack}>
                                        {filtered.map((cfg) => {
                                          const isExact = cfg.id === draft.id && draft.id !== "";
                                          const ver = cfg.id.split("|h")[1] ?? "";
                                          return (
                                            <div
                                              key={cfg.id}
                                              style={{
                                                ...styles.cmpCell,
                                                ...(isExact ? styles.cmpCellActive : null),
                                              }}
                                            >
                                              <div style={styles.cmpCellTop}>
                                                <span style={styles.verPill}>{ver.slice(0, 6)}</span>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                  <button style={styles.nodeBtn} onClick={() => jumpTo(cfg)}>
                                                    편집
                                                  </button>
                                                  <button style={styles.nodeBtnDanger} onClick={() => deleteRow(cfg.id)}>
                                                    삭제
                                                  </button>
                                                </div>
                                              </div>

                                              <div style={styles.cmpSectionTitle}>P1</div>
                                              <InlineList items={cfg.passive1.map((s) => STATMOD_LABEL[s])} />

                                              <div style={{ height: 6 }} />

                                              <div style={styles.cmpSectionTitle}>P2</div>
                                              <InlineList items={cfg.passive2.map((s) => STATMOD_LABEL[s])} />

                                              <div style={{ height: 8 }} />

                                              <div style={styles.cmpSectionTitle}>
                                                S <span style={{ opacity: 0.7 }}>({SPECIAL_LABEL[cfg.specialType]})</span>
                                              </div>
                                              {cfg.specialType === "NONE" ? (
                                                <div style={{ opacity: 0.55, fontSize: 12 }}>-</div>
                                              ) : (
                                                <div style={styles.specialBox}>{cfg.specialEffect}</div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {([1, 2, 3] as Tier[])
              .filter((t) => (fTier === "ALL" ? true : t === fTier))
              .map((t) => {
                const tierMap = boardModel[String(t)];
                const hasAny = tierMap && Object.keys(tierMap).length > 0;
                if (!hasAny) return null;

                return (
                  <div key={`tier_${t}`} style={styles.boardTier}>
                    <div style={styles.boardTierHeader}>
                      <div style={{ fontWeight: 950, fontSize: 14 }}>{t}T</div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>획득루트 → 재질 → 파츠 (동일 조건 버전은 여러 장)</div>
                    </div>

                    <div style={styles.boardTierBody}>
                      {ACQUIRE_ORDER.filter((a) => (fAcquire === "ALL" ? true : a === fAcquire)).map((a) => {
                        const acquireMap = tierMap?.[a];
                        if (!acquireMap) return null;

                        return (
                          <div key={`acq_${t}_${a}`} style={styles.boardAcquire}>
                            <div style={styles.boardAcquireHeader}>{ACQUIRE_LABEL[a]}</div>

                            <div style={styles.boardMaterials}>
                              {MATERIAL_ORDER.filter((m) => (fMaterial === "ALL" ? true : m === fMaterial)).map((m) => {
                                const matMap = acquireMap?.[m];
                                if (!matMap) return null;

                                return (
                                  <div key={`mat_${t}_${a}_${m}`} style={styles.boardMaterial}>
                                    <div style={styles.boardMaterialHeader}>
                                      <Tag
                                        label={`${MATERIAL_LABEL[m]} (${m})`}
                                        bg={MATERIAL_COLOR[m].bg}
                                        fg={MATERIAL_COLOR[m].fg}
                                        border={MATERIAL_COLOR[m].border}
                                      />
                                    </div>

                                    <div style={styles.boardParts}>
                                      {PART_ORDER.filter((p) => (fPart === "ALL" ? true : p === fPart)).map((p) => {
                                        const list = matMap?.[p] ?? [];
                                        const filtered = (list as ArmorConfig[]).filter((cfg) =>
                                          fSpecialType === "ALL" ? true : cfg.specialType === fSpecialType
                                        );
                                        if (!filtered.length) return null;

                                        return (
                                          <div key={`part_${t}_${a}_${m}_${p}`} style={styles.nodeStack}>
                                            <div style={{ marginBottom: 8 }}>
                                              <Tag
                                                label={`${PART_LABEL[p]} (${p})`}
                                                bg={PART_COLOR[p].bg}
                                                fg={PART_COLOR[p].fg}
                                                border={PART_COLOR[p].border}
                                              />
                                            </div>

                                            {filtered.map((cfg) => {
                                              const isExact = cfg.id === draft.id && draft.id !== "";
                                              const ver = cfg.id.split("|h")[1] ?? "";
                                              return (
                                                <div
                                                  key={cfg.id}
                                                  style={{
                                                    ...styles.nodeCard,
                                                    ...(isExact ? styles.nodeCardActive : null),
                                                  }}
                                                >
                                                  <div style={styles.nodeHeader}>
                                                    <span style={styles.verPill}>{ver.slice(0, 6)}</span>
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                      <button style={styles.nodeBtn} onClick={() => jumpTo(cfg)}>
                                                        편집
                                                      </button>
                                                      <button style={styles.nodeBtnDanger} onClick={() => deleteRow(cfg.id)}>
                                                        삭제
                                                      </button>
                                                    </div>
                                                  </div>

                                                  <div style={styles.nodeBody}>
                                                    <div style={styles.nodeSectionTitle}>Passive 1</div>
                                                    <InlineList items={cfg.passive1.map((s) => STATMOD_LABEL[s])} />

                                                    <div style={{ height: 8 }} />

                                                    <div style={styles.nodeSectionTitle}>Passive 2</div>
                                                    <InlineList items={cfg.passive2.map((s) => STATMOD_LABEL[s])} />

                                                    <div style={{ height: 10 }} />

                                                    <div style={styles.nodeSectionTitle}>
                                                      Special <span style={{ opacity: 0.7 }}>({SPECIAL_LABEL[cfg.specialType]})</span>
                                                    </div>
                                                    {cfg.specialType === "NONE" ? (
                                                      <div style={{ opacity: 0.6, fontSize: 12 }}>-</div>
                                                    ) : (
                                                      <div style={styles.specialBox}>{cfg.specialEffect}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {filteredList.length === 0 ? (
          <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.6 }}>필터 결과가 비었어. 필터를 풀어보라링.</div>
        ) : null}
      </div>
    );
  };

  /** ===== UI ===== */
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.h1}>방어구 획득 루트 · 효과 배분 시뮬레이터</div>
          <div style={styles.sub}>
            선택 → 드래그 배치 → <b>저장</b> → 표/보드에서 비교 (JSON 내보내기/임포트로 다른 PC 공유 가능)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={styles.btnSecondary} onClick={exportSaved} disabled={savedIds.size === 0}>
            저장 JSON
          </button>
          <button style={styles.btnSecondary} onClick={openImport}>
            JSON 임포트
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={onPickFile}
          />

          <button
            style={styles.btnDanger}
            onClick={() => setConfirmReset(true)}
            disabled={savedIds.size === 0}
            title="저장된 모든 방어구 정보를 삭제"
          >
            전체 초기화
          </button>
        </div>
      </header>

      {toast ? <div style={styles.toast}>{toast}</div> : null}

      {/* Import Confirm Modal */}
      {importConfirm ? (
        <div style={styles.modalBackdrop} onMouseDown={() => setImportConfirm(null)}>
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>JSON 임포트</div>
            <div style={{ marginTop: 8, opacity: 0.85, lineHeight: 1.5 }}>
              파일: <b>{importConfirm.rawName}</b>
              <br />
              유효 항목: <b>{importConfirm.incoming.length}개</b>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={importMode === "MERGE"}
                  onChange={() => setImportMode("MERGE")}
                />
                <div>
                  <div style={{ fontWeight: 900 }}>병합(merge)</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>내 데이터는 유지 + 같은 id는 업데이트 + 신규는 추가</div>
                </div>
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={importMode === "REPLACE"}
                  onChange={() => setImportMode("REPLACE")}
                />
                <div>
                  <div style={{ fontWeight: 900, color: "#fecdd3" }}>덮어쓰기(replace)</div>
                  <div style={{ opacity: 0.75, fontSize: 12, color: "#fecdd3" }}>현재 저장 데이터를 전부 지우고, 임포트 데이터로 교체</div>
                </div>
              </label>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={styles.btnSecondary} onClick={() => setImportConfirm(null)}>
                취소
              </button>
              <button style={styles.btn} onClick={applyImport}>
                임포트 실행
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reset Confirm Modal */}
      {confirmReset ? (
        <div style={styles.modalBackdrop} onMouseDown={() => setConfirmReset(false)}>
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>저장된 방어구 정보를 모두 초기화할까?</div>
            <div style={{ marginTop: 8, opacity: 0.8, lineHeight: 1.5 }}>
              이 작업은 되돌릴 수 없다링. (필요하면 JSON 내보내기 먼저!)
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={styles.btnSecondary} onClick={() => setConfirmReset(false)}>
                취소
              </button>
              <button style={styles.btnDanger} onClick={resetAllSaved}>
                초기화 실행
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Fullscreen Modal */}
      {fullscreen ? (
        <div style={styles.fullBackdrop} onMouseDown={() => setFullscreen(false)}>
          <div style={styles.fullModal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.fullHeader}>
              <div style={{ fontWeight: 950, fontSize: 14 }}>
                전체화면 - {fullscreenView === "TABLE" ? "표" : "보드"}{" "}
                {fullscreenView === "BOARD" && compareMode ? "(비교모드)" : ""}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {fullscreenView === "BOARD" ? (
                  <button style={tabBtn(compareMode)} onClick={() => setCompareMode((v) => !v)}>
                    비교모드
                  </button>
                ) : null}
                <button style={styles.btnSecondary} onClick={() => setFullscreen(false)}>
                  닫기
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <RightContent inFullscreen modeOverride={fullscreenView} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Selection */}
      <section style={styles.card}>
        <div style={styles.cardTitle}>선택</div>

        <div style={styles.grid4}>
          <Field label="티어">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3].map((t) => (
                <button key={t} style={pill(tier === t)} onClick={() => setTier(t as Tier)}>
                  {t}T
                </button>
              ))}
            </div>
          </Field>

          <Field label="획득 방식">
            <select value={acquire} onChange={(e) => setAcquire(e.target.value as Acquire)} style={styles.select}>
              {acquireOptions.map((a) => (
                <option key={a} value={a}>
                  {ACQUIRE_LABEL[a]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="재질">
            <select value={material} onChange={(e) => setMaterial(e.target.value as Material)} style={styles.select}>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {MATERIAL_LABEL[m]} ({m})
                </option>
              ))}
            </select>
          </Field>

          <Field label="파츠">
            <select value={part} onChange={(e) => setPart(e.target.value as Part)} style={styles.select}>
              {PARTS.map((p) => (
                <option key={p} value={p}>
                  {PART_LABEL[p]} ({p})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Tag label={`재질: ${MATERIAL_LABEL[material]}`} bg={mTag.bg} fg={mTag.fg} border={mTag.border} />
          <Tag label={`파츠: ${PART_LABEL[part]}`} bg={pTag.bg} fg={pTag.fg} border={pTag.border} />
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Base ID: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{baseId}</span>
            {Array.from(savedIds).some((id) => id.startsWith(baseId + "|h")) ? (
              <span style={{ marginLeft: 8, color: "#34d399", fontWeight: 900 }}>● 저장됨(버전)</span>
            ) : null}
          </div>
        </div>
      </section>

      {/* Layout */}
      <section style={styles.layout3}>
        {/* Stat Pool */}
        <section style={styles.panel}>
          <div style={styles.panelTitle}>StatModified 풀 (드래그)</div>
          <div style={styles.pool}>
            {STATMODS.map((s) => (
              <div key={s} draggable onDragStart={(e) => onDragStartStat(e, s)} title={STATMOD_LABEL[s]} style={styles.poolItem}>
                {STATMOD_LABEL[s]}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, ...styles.panelTitle }}>특수효과 풀 (드래그)</div>
          <div style={styles.pool}>
            {SPECIAL_EFFECT_POOL.map((eff) => (
              <div key={eff} draggable onDragStart={(e) => onDragStartSpecial(e, eff)} title={eff} style={styles.poolItem}>
                {eff}
              </div>
            ))}
          </div>

          <div style={styles.hint}>
            왼쪽에서 드래그 → 가운데 슬롯에 드롭.
            <br />
            패시브 슬롯은 최대 2개, 특수효과는 1개.
          </div>
        </section>

        {/* Editor */}
        <section style={styles.panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={styles.panelTitle}>현재 선택 항목 설정</div>

            <button
              style={{
                ...styles.btn,
                opacity: canSave ? 1 : 0.55,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
              onClick={saveCurrent}
              disabled={!canSave}
              title={canSave ? "현재 선택 항목 저장" : "패시브1 최소 1개 + (특수 타입 있으면 특수효과 1개 필요)"}
            >
              저장
            </button>
          </div>

          <DropZone
            title="패시브 2 (0~2개, 선택)"
            ok={draft.passive2.length <= 2}
            slot={draft.passive1.map((s) => STATMOD_LABEL[s])}
            onDragOver={allowDrop}
            onDrop={(e) => dropTo("passive1", e)}
            onRemoveText={(text) => {
              const stat = (Object.keys(STATMOD_LABEL) as StatMod[]).find((k) => STATMOD_LABEL[k] === text);
              if (stat) removeFrom("passive1", stat);
            }}
          />

          <DropZone
            title="패시브 2 (0~2개, 선택)"
            ok={draft.passive2.length <= 2}
            slot={draft.passive2.map((s) => STATMOD_LABEL[s])}
            onDragOver={allowDrop}
            onDrop={(e) => dropTo("passive2", e)}
            onRemoveText={(text) => {
              const stat = (Object.keys(STATMOD_LABEL) as StatMod[]).find((k) => STATMOD_LABEL[k] === text);
              if (stat) removeFrom("passive2", stat);
            }}
          />

          {/* Special */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 950 }}>특수효과 (항상 존재)</div>
              <select
                value={draft.specialType}
                onChange={(e) => {
                  const v = e.target.value as SpecialType;
                  setDraft((prev) => ({
                    ...prev,
                    specialType: v,
                    specialEffect: v === "NONE" ? "" : prev.specialEffect,
                  }));
                }}
                style={styles.select}
              >
                {SPECIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SPECIAL_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>

            <div
              onDragOver={allowDrop}
              onDrop={dropSpecial}
              style={{
                marginTop: 8,
                borderRadius: 14,
                border: `1px dashed ${
                  draft.specialType === "NONE"
                    ? "rgba(148,163,184,0.35)"
                    : draft.specialEffect
                      ? "rgba(52,211,153,0.45)"
                      : "rgba(251,113,133,0.55)"
                }`,
                background: "rgba(2,6,23,0.35)",
                padding: 12,
                minHeight: 64,
              }}
            >
              {draft.specialType === "NONE" ? (
                <div style={{ opacity: 0.65, fontSize: 13 }}>
                  특수 타입이 “없음”이야. (드롭해도 자동으로 Proc Passive로 바뀜)
                </div>
              ) : draft.specialEffect ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={styles.chip}>
                    {draft.specialEffect}
                    <button style={styles.chipX} onClick={clearSpecial} aria-label="remove">
                      ×
                    </button>
                  </span>
                </div>
              ) : (
                <div style={{ opacity: 0.65, fontSize: 13 }}>여기로 특수효과 1개 드롭</div>
              )}
            </div>

            {draft.specialType !== "NONE" && !draft.specialEffect ? (
              <div style={{ marginTop: 8, color: "#fb7185", fontWeight: 900, fontSize: 12 }}>
                ❗ 특수 타입이 있으면 특수효과 1개가 필요해
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 12, ...styles.hint }}>
            저장 버튼을 눌러야 우측 표/보드에 반영된다링.
            {!canSave ? " (현재는 저장 조건이 완성되지 않았어)" : ""}
          </div>
        </section>

        {/* Right Panel */}
        <section style={styles.panel}>
          <div style={styles.tabsRow}>
            <div style={styles.panelTitle}>저장된 방어구</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button style={tabBtn(viewMode === "TABLE")} onClick={() => setViewMode("TABLE")}>
                표
              </button>
              <button style={tabBtn(viewMode === "BOARD")} onClick={() => setViewMode("BOARD")}>
                보드
              </button>
              {viewMode === "BOARD" ? (
                <button style={tabBtn(compareMode)} onClick={() => setCompareMode((v) => !v)} title="보드를 비교모드로 전환">
                  비교모드
                </button>
              ) : null}
              <button
                style={styles.fullBtn}
                onClick={() => {
                  setFullscreenView(viewMode);
                  setFullscreen(true);
                }}
                title="표/보드 전체화면 보기"
              >
                전체화면
              </button>
            </div>
          </div>

          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
            {filteredList.length} / {savedList.length}개
          </div>

          {/* Filters */}
          <div style={styles.filters}>
            <select
              style={styles.select}
              value={fTier}
              onChange={(e) => setFTier(e.target.value === "ALL" ? "ALL" : (Number(e.target.value) as Tier))}
            >
              <option value="ALL">티어 전체</option>
              <option value="1">1T</option>
              <option value="2">2T</option>
              <option value="3">3T</option>
            </select>

            <select style={styles.select} value={fAcquire} onChange={(e) => setFAcquire(e.target.value as any)}>
              <option value="ALL">획득 전체</option>
              {(Object.keys(ACQUIRE_LABEL) as Acquire[]).map((a) => (
                <option key={a} value={a}>
                  {ACQUIRE_LABEL[a]}
                </option>
              ))}
            </select>

            <select style={styles.select} value={fPart} onChange={(e) => setFPart(e.target.value as any)}>
              <option value="ALL">파츠 전체</option>
              {PARTS.map((p) => (
                <option key={p} value={p}>
                  {PART_LABEL[p]}
                </option>
              ))}
            </select>

            <select style={styles.select} value={fMaterial} onChange={(e) => setFMaterial(e.target.value as any)}>
              <option value="ALL">재질 전체</option>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {MATERIAL_LABEL[m]}
                </option>
              ))}
            </select>

            <select style={styles.select} value={fSpecialType} onChange={(e) => setFSpecialType(e.target.value as any)}>
              <option value="ALL">특수 전체</option>
              {SPECIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SPECIAL_LABEL[t]}
                </option>
              ))}
            </select>

            <input style={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색: 효과명/문구/재질/파츠/버전 등" />
          </div>

          <RightContent />

          <div style={{ marginTop: 10, ...styles.hint }}>
            표: 티어 클릭 → 편집 이동, 🗑 삭제. / 보드: 동일 조건 버전은 여러 장으로 표시. / JSON 임포트로 다른 PC에서도 똑같이 볼 수 있다링.
          </div>
        </section>
      </section>
    </main>
  );
}

/** ===== Components ===== */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Tag({ label, bg, fg, border }: { label: string; bg: string; fg: string; border: string }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function DropZone(props: {
  title: string;
  ok: boolean;
  slot: string[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveText: (text: string) => void;
}) {
  const { title, ok, slot, onDragOver, onDrop, onRemoveText } = props;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {!ok ? <span style={{ color: "#fb7185", fontSize: 12, fontWeight: 800 }}>❗ 최소 1개 필요</span> : null}
      </div>

      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{
          marginTop: 8,
          borderRadius: 14,
          border: `1px dashed ${ok ? "rgba(148,163,184,0.45)" : "rgba(251,113,133,0.55)"}`,
          background: "rgba(2,6,23,0.35)",
          padding: 12,
          minHeight: 64,
        }}
      >
        {slot.length === 0 ? (
          <div style={{ opacity: 0.65, fontSize: 13 }}>여기로 드롭 (최대 2개)</div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {slot.map((t) => (
              <span key={t} style={styles.chip} title={t}>
                <span style={{ whiteSpace: "normal" }}>{t}</span>
                <button style={styles.chipX} onClick={() => onRemoveText(t)} aria-label="remove">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineList({ items }: { items: string[] }) {
  if (items.length === 0) return <span style={{ opacity: 0.6 }}>-</span>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map((it) => (
        <span key={it} style={styles.miniChip} title={it}>
          {it}
        </span>
      ))}
    </div>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ ...styles.th, ...style }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ ...styles.td, ...style }}>{children}</td>;
}

/** ===== Styles ===== */
function pill(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid rgba(226,232,240,0.7)" : "1px solid rgba(148,163,184,0.35)",
    background: active ? "rgba(226,232,240,0.12)" : "rgba(2,6,23,0.2)",
    color: active ? "#e2e8f0" : "#cbd5e1",
    cursor: "pointer",
    fontWeight: 900,
  };
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 999,
    border: active ? "1px solid rgba(226,232,240,0.65)" : "1px solid rgba(148,163,184,0.28)",
    background: active ? "rgba(226,232,240,0.12)" : "rgba(2,6,23,0.22)",
    color: active ? "#e2e8f0" : "#cbd5e1",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    margin: 0,
    padding: 20,
    fontFamily: "system-ui",
    color: "#e5e7eb",
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(59,130,246,0.15), transparent 60%), #0b0f14",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  h1: { fontSize: 24, fontWeight: 950, letterSpacing: -0.2 },
  sub: { marginTop: 6, opacity: 0.8, lineHeight: 1.4 },

  toast: {
    position: "fixed",
    right: 18,
    bottom: 18,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.88)",
    color: "#e5e7eb",
    fontWeight: 900,
    zIndex: 50,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.62)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
    padding: 18,
  },
  modal: {
    width: "min(560px, 100%)",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.95)",
    padding: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },

  card: {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.35)",
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  },
  cardTitle: { fontWeight: 900, marginBottom: 12 },

  grid4: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 12,
  },

  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.35)",
    color: "#e5e7eb",
    outline: "none",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.35)",
    color: "#e5e7eb",
    outline: "none",
  },

  layout3: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 2.2fr",
    gap: 14,
    alignItems: "stretch",
  },

  panel: {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.35)",
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    minWidth: 0,
  },
  panelTitle: { fontWeight: 950, marginBottom: 8 },

  pool: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
    maxHeight: 260,
    overflow: "auto",
    paddingRight: 4,
  },
  poolItem: {
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(15,23,42,0.35)",
    padding: "10px 12px",
    cursor: "grab",
    fontWeight: 800,
    lineHeight: 1.25,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  hint: { marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.5 },

  btn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(226,232,240,0.55)",
    background: "rgba(226,232,240,0.12)",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 900,
  },
  btnSecondary: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.25)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontWeight: 900,
  },
  btnDanger: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(251,113,133,0.45)",
    background: "rgba(251,113,133,0.10)",
    color: "#fecdd3",
    cursor: "pointer",
    fontWeight: 950,
  },

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(2,6,23,0.35)",
    color: "#e5e7eb",
    fontWeight: 850,
    maxWidth: "100%",
  },
  miniChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 8px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(15,23,42,0.35)",
    color: "#e5e7eb",
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1.2,
    maxWidth: "100%",
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  chipX: {
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.35)",
    color: "#e5e7eb",
    borderRadius: 999,
    width: 24,
    height: 24,
    cursor: "pointer",
    fontWeight: 900,
    lineHeight: "22px",
  },

  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr)) minmax(0, 1.5fr)",
    gap: 10,
    marginBottom: 12,
  },

  tableWrap: {
    overflow: "auto",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.26)",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: 1250,
  },
  th: {
    textAlign: "left",
    padding: "10px 10px",
    fontSize: 12,
    opacity: 0.85,
    borderBottom: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.55)",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  td: {
    padding: "10px 10px",
    fontSize: 13,
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    verticalAlign: "top",
  },
  trActive: {
    outline: "1px solid rgba(52,211,153,0.45)",
    background: "rgba(52,211,153,0.06)",
  },
  trSameCell: {
    outline: "1px solid rgba(148,163,184,0.20)",
    background: "rgba(148,163,184,0.04)",
  },
  link: {
    background: "transparent",
    border: "none",
    padding: 0,
    color: "#93c5fd",
    cursor: "pointer",
    fontWeight: 900,
    textDecoration: "underline",
  },
  rowDel: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(251,113,133,0.35)",
    background: "rgba(251,113,133,0.10)",
    color: "#fecdd3",
    cursor: "pointer",
    fontWeight: 950,
  },

  tabsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },

  fullBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(226,232,240,0.55)",
    background: "rgba(226,232,240,0.12)",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
  },

  boardWrap: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.26)",
    padding: 10,
    overflow: "auto",
  },

  boardTier: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(2,6,23,0.32)",
    padding: 10,
  },
  boardTierHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
    padding: "2px 4px",
  },
  boardTierBody: { display: "grid", gridTemplateColumns: "1fr", gap: 10 },

  boardAcquire: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.25)",
    padding: 10,
  },
  boardAcquireHeader: { fontWeight: 950, marginBottom: 10, opacity: 0.9 },

  boardMaterials: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  boardMaterial: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.25)",
    padding: 10,
    minWidth: 0,
  },
  boardMaterialHeader: { marginBottom: 10, display: "flex", justifyContent: "flex-start" },
  boardParts: { display: "grid", gridTemplateColumns: "1fr", gap: 10 },

  nodeStack: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.18)",
    padding: 10,
  },

  nodeCard: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.38)",
    padding: 10,
    boxShadow: "0 10px 25px rgba(0,0,0,0.22)",
    marginTop: 10,
  },
  nodeCardActive: { outline: "1px solid rgba(52,211,153,0.45)", background: "rgba(52,211,153,0.06)" },

  verPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(15,23,42,0.35)",
    color: "#e5e7eb",
    fontWeight: 950,
    fontSize: 12,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    opacity: 0.9,
  },

  nodeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 },
  nodeBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.22)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  nodeBtnDanger: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(251,113,133,0.38)",
    background: "rgba(251,113,133,0.10)",
    color: "#fecdd3",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  nodeBody: { display: "flex", flexDirection: "column", gap: 4 },
  nodeSectionTitle: { fontSize: 12, fontWeight: 950, opacity: 0.85, marginTop: 2 },
  specialBox: {
    marginTop: 2,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.30)",
    fontSize: 12,
    lineHeight: 1.35,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },

  cmpTier: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(2,6,23,0.32)",
    padding: 10,
  },
  cmpTierHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
    padding: "2px 4px",
  },
  cmpAcquire: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.25)",
    padding: 10,
  },
  cmpAcquireHeader: { fontWeight: 950, marginBottom: 10, opacity: 0.9 },
  cmpGrid: {
    display: "grid",
    gridTemplateColumns: "180px repeat(3, minmax(260px, 1fr))",
    gap: 10,
    alignItems: "stretch",
  },
  cmpCorner: {
    borderRadius: 14,
    border: "1px dashed rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.18)",
  },
  cmpHeaderCell: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.22)",
    padding: 10,
    display: "flex",
    justifyContent: "flex-start",
  },
  cmpRowHeader: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.22)",
    padding: 10,
    display: "flex",
    alignItems: "flex-start",
  },
  cmpCellEmpty: {
    borderRadius: 14,
    border: "1px dashed rgba(148,163,184,0.16)",
    background: "rgba(2,6,23,0.18)",
    padding: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cmpCellStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cmpCell: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.38)",
    padding: 10,
    boxShadow: "0 10px 25px rgba(0,0,0,0.22)",
    minHeight: 140,
  },
  cmpCellActive: {
    outline: "1px solid rgba(52,211,153,0.45)",
    background: "rgba(52,211,153,0.06)",
  },
  cmpCellTop: { display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 8, alignItems: "center" },
  cmpSectionTitle: { fontSize: 12, fontWeight: 950, opacity: 0.85 },

  fullBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    zIndex: 80,
    padding: 16,
  },
  fullModal: {
    height: "100%",
    width: "100%",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.20)",
    background: "rgba(2,6,23,0.92)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
    padding: 14,
    overflow: "hidden",
  },
  fullHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottom: "1px solid rgba(148,163,184,0.16)",
  },
};