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

type PassiveSlot = StatMod[]; // min 0 max 2 (p1 min 1 for save)
type ArmorKey = { tier: Tier; acquire: Acquire; material: Material; part: Part };

type ArmorConfig = ArmorKey & {
  id: string; // uniqueId = baseId + hash(효과 시그니처)
  passive1: PassiveSlot;
  passive2: PassiveSlot; // optional
  specialType: SpecialType;
  specialEffect: string;
};

type ViewMode = "TABLE" | "BOARD";

const STORAGE_KEY = "armor_effect_distribution_store_v6";

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

const PART_ICON: Record<Part, string> = {
  Armor: "🦺",
  Helm: "🪖",
  Gloves: "🧤",
  Shoes: "👟",
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
  // 1T Proc Passive
  "피격 시 체력 회복 (1T)",
  "일반 공격 시 방어력 증가 (1T)",
  "적 처치 시 체력 회복 (1T)",
  "피격 시 이동속도 증가 (1T)",
  "피격 시 공격력 증가 (1T)",
  "일반 공격 시 치명타 확률 증가 (1T)",
  "적 처치 시 공격 속도 증가 (1T)",
  "피격 시 마나 소모량 감소 (1T)",
  "일반 공격 시 스킬 가속 증가 (1T)",
  "적 처치 시 마나 회복 (1T)",
  // 2T Proc Passive
  "공격 시 체력 회복 (2T)",
  "내 체력이 50% 미만일 경우 피해량 증가 (2T)",
  "공격 시 공격속도 증가 (2T)",
  "내 체력이 30% 미만일 경우 공격력 증가 (2T)",
  "공격 시 스킬 가속 증가 (2T)",
  "내 체력이 100%일 경우 치명타확률 증가 (2T)",
  "기절 시 방어막 생성 (2T)",
  "적 처치 시 치명타피해 증가 (2T)",
  "적 처치 시 마나 회복 (2T)",
  // Active
  "곤의 유산(3초간 무적)",
  "물러서기(도약 후 이속 증가)",
  "정신집중(마력 회복)",
];

/**
 * ✅ 2T 이상부터는 기본제작 카테고리 제거
 */
const AVAILABILITY: Record<Tier, Record<Acquire, boolean>> = {
  1: { BASIC_CRAFT: true, LOOT_CRAFT: false, DUNGEON_CORE: false, BOSS_DROP: false },
  2: { BASIC_CRAFT: false, LOOT_CRAFT: true, DUNGEON_CORE: true, BOSS_DROP: true },
  3: { BASIC_CRAFT: false, LOOT_CRAFT: true, DUNGEON_CORE: true, BOSS_DROP: true },
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

/** ✅ 저장 조건: passive1만 있어도 OK / passive2는 0~2 허용 */
function isValidConfig(cfg: ArmorConfig) {
  const p1 = cfg.passive1.length >= 1 && cfg.passive1.length <= 2;
  const p2 = cfg.passive2.length <= 2;
  const specialOk = cfg.specialType === "NONE" ? true : cfg.specialEffect.trim().length > 0;
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
function makeUniqueId(
  baseId: string,
  cfg: Pick<ArmorConfig, "passive1" | "passive2" | "specialType" | "specialEffect">
) {
  const sig = configSignature(cfg);
  const hx = hashStr(sig).slice(0, 8);
  return `${baseId}|h${hx}`;
}
function getBaseIdFromUniqueId(uniqueId: string) {
  const seg = uniqueId.split("|");
  return seg.slice(0, 4).join("|");
}
function getVerFromUniqueId(uniqueId: string) {
  const parts = uniqueId.split("|h");
  return parts[1] ? parts[1].slice(0, 6) : "";
}

/** ===== Preset Configs (from design sheet B16:H91) ===== */
const PRESET_CONFIGS: ArmorConfig[] = (() => {
  type Def = {
    tier: Tier; acquire: Acquire; material: Material; part: Part;
    passive1: StatMod[]; passive2: StatMod[];
    specialType: SpecialType; specialEffect: string;
  };
  const defs: Def[] = [
    // ── 1T 기본제작 ──────────────────────────────────────────────────────
    { tier: 1, acquire: "BASIC_CRAFT", material: "Plate",   part: "Armor",  passive1: ["DamageDownVaryper"],                        passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 체력 회복 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Plate",   part: "Helm",   passive1: ["RegenHpVary"],                              passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 방어력 증가 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Plate",   part: "Gloves", passive1: ["MaxHpVary"],                                passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 체력 회복 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Plate",   part: "Shoes",  passive1: ["DefenseVary"],                              passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Leather", part: "Armor",  passive1: ["MaxHpVary"],                                passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 공격력 증가 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Leather", part: "Helm",   passive1: ["CriVaryper"],                               passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 치명타 확률 증가 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Leather", part: "Gloves", passive1: ["AtkSpeedVaryper"],                          passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 공격 속도 증가 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Leather", part: "Shoes",  passive1: ["AttackVary"],                               passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Cloth",   part: "Armor",  passive1: ["MaxMpVary"],                                passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 마나 소모량 감소 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Cloth",   part: "Helm",   passive1: ["RegenMpVary"],                              passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 스킬 가속 증가 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Cloth",   part: "Gloves", passive1: ["AttackVary"],                               passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 마나 회복 (1T)" },
    { tier: 1, acquire: "BASIC_CRAFT", material: "Cloth",   part: "Shoes",  passive1: ["CostMpDownVaryper"],                        passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    // ── 2T 전리품제작 ─────────────────────────────────────────────────────
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Plate",   part: "Helm",   passive1: ["RegenHpVary", "MaxHpVary"],                 passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 방어력 증가 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Plate",   part: "Helm",   passive1: ["RegenHpVary", "CriVaryper"],                passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 방어력 증가 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Leather", part: "Helm",   passive1: ["CriVaryper", "MaxHpVary"],                  passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 치명타 확률 증가 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Leather", part: "Helm",   passive1: ["CriVaryper", "AttackVary"],                 passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 치명타 확률 증가 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Cloth",   part: "Helm",   passive1: ["RegenMpVary", "MaxHpVary"],                 passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 스킬 가속 증가 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Cloth",   part: "Helm",   passive1: ["RegenMpVary", "CostMpDownVaryper"],         passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "일반 공격 시 스킬 가속 증가 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Plate",   part: "Gloves", passive1: ["MaxHpVary", "DamageDownVaryper"],           passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 체력 회복 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Leather", part: "Gloves", passive1: ["AtkSpeedVaryper", "SkillCooldownAccVary"],  passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 공격 속도 증가 (1T)" },
    { tier: 2, acquire: "LOOT_CRAFT",  material: "Cloth",   part: "Gloves", passive1: ["AttackVary", "CostMpDownVaryper"],          passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 마나 회복 (1T)" },
    // ── 2T 던전코어 ──────────────────────────────────────────────────────
    { tier: 2, acquire: "DUNGEON_CORE", material: "Plate",   part: "Gloves", passive1: ["MaxHpVary", "AtkSpeedVaryper"],            passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 체력 회복 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Leather", part: "Gloves", passive1: ["AtkSpeedVaryper", "CriDamageVaryper"],     passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 공격 속도 증가 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Cloth",   part: "Gloves", passive1: ["AttackVary", "SkillCooldownAccVary"],      passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 마나 회복 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Plate",   part: "Armor",  passive1: ["DamageDownVaryper", "MaxHpVary"],          passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 체력 회복 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Plate",   part: "Armor",  passive1: ["DamageDownVaryper", "CriVaryper"],         passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 체력 회복 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Leather", part: "Armor",  passive1: ["MaxHpVary", "SkillCooldownAccVary"],       passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 공격력 증가 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Leather", part: "Armor",  passive1: ["MaxHpVary", "CriDamageVaryper"],           passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 공격력 증가 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Cloth",   part: "Armor",  passive1: ["MaxMpVary", "RegenMpVary"],                passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 마나 소모량 감소 (1T)" },
    { tier: 2, acquire: "DUNGEON_CORE", material: "Cloth",   part: "Armor",  passive1: ["MaxMpVary", "CriVaryper"],                 passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 마나 소모량 감소 (1T)" },
    // ── 2T 드랍(Boss) ─────────────────────────────────────────────────────
    { tier: 2, acquire: "BOSS_DROP",   material: "Plate",   part: "Shoes",  passive1: ["DefenseVary", "RegenHpVary"],              passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 2, acquire: "BOSS_DROP",   material: "Plate",   part: "Shoes",  passive1: ["DefenseVary", "SkillCooldownAccVary"],     passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 2, acquire: "BOSS_DROP",   material: "Leather", part: "Shoes",  passive1: ["AttackVary", "MaxHpVary"],                 passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 2, acquire: "BOSS_DROP",   material: "Leather", part: "Shoes",  passive1: ["AttackVary", "CriVaryper"],                passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 2, acquire: "BOSS_DROP",   material: "Cloth",   part: "Shoes",  passive1: ["CostMpDownVaryper", "MaxHpVary"],          passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 2, acquire: "BOSS_DROP",   material: "Cloth",   part: "Shoes",  passive1: ["CostMpDownVaryper", "AttackVary"],         passive2: [],                        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    // ── 3T 전리품제작 ─────────────────────────────────────────────────────
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Plate",   part: "Helm",   passive1: ["RegenHpVary", "CriVaryper"],               passive2: ["SkillCooldownAccVary"],   specialType: "PROC_PASSIVE", specialEffect: "공격 시 체력 회복 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Plate",   part: "Armor",  passive1: ["DamageDownVaryper", "MaxHpVary"],          passive2: ["DefenseVary"],            specialType: "PROC_PASSIVE", specialEffect: "내 체력이 50% 미만일 경우 피해량 증가 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Leather", part: "Helm",   passive1: ["CriVaryper", "MaxHpVary"],                 passive2: ["DamageDownVaryper"],      specialType: "PROC_PASSIVE", specialEffect: "공격 시 공격속도 증가 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Leather", part: "Armor",  passive1: ["MaxHpVary", "SkillCooldownAccVary"],       passive2: ["PVEDamageUpVaryper"],     specialType: "PROC_PASSIVE", specialEffect: "내 체력이 30% 미만일 경우 공격력 증가 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Cloth",   part: "Helm",   passive1: ["RegenMpVary", "MaxHpVary"],                passive2: ["DamageDownVaryper"],      specialType: "PROC_PASSIVE", specialEffect: "공격 시 스킬 가속 증가 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Cloth",   part: "Armor",  passive1: ["MaxMpVary", "RegenMpVary"],                passive2: ["HealAmpVaryper"],         specialType: "PROC_PASSIVE", specialEffect: "내 체력이 100%일 경우 치명타확률 증가 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Plate",   part: "Gloves", passive1: ["MaxHpVary", "DamageDownVaryper"],          passive2: ["HealAcceptVary"],         specialType: "PROC_PASSIVE", specialEffect: "기절 시 방어막 생성 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Plate",   part: "Gloves", passive1: ["MaxHpVary", "DefenseVary"],                passive2: ["SCNegativeRecoveryVary"], specialType: "PROC_PASSIVE", specialEffect: "기절 시 방어막 생성 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Leather", part: "Gloves", passive1: ["AtkSpeedVaryper", "SkillCooldownAccVary"], passive2: ["PVEDamageUpVaryper"],     specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 치명타피해 증가 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Leather", part: "Gloves", passive1: ["AtkSpeedVaryper", "CriVaryper"],           passive2: ["MaxHpVary"],              specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 치명타피해 증가 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Cloth",   part: "Gloves", passive1: ["AttackVary", "CostMpDownVaryper"],         passive2: ["MaxHpVary"],              specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 마나 회복 (2T)" },
    { tier: 3, acquire: "LOOT_CRAFT",  material: "Cloth",   part: "Gloves", passive1: ["SkillCooldownAccVary", "CostMpDownVaryper"], passive2: ["HealAmpVaryper"],       specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 마나 회복 (2T)" },
    // ── 3T 던전코어 ──────────────────────────────────────────────────────
    { tier: 3, acquire: "DUNGEON_CORE", material: "Plate",   part: "Helm",   passive1: ["DamageDownVaryper", "MaxHpVary"],          passive2: ["SkillCooldownAccVary"],   specialType: "PROC_PASSIVE", specialEffect: "공격 시 체력 회복 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Plate",   part: "Armor",  passive1: ["DamageDownVaryper", "SkillCooldownAccVary"], passive2: ["AtkSpeedVaryper"],      specialType: "PROC_PASSIVE", specialEffect: "내 체력이 50% 미만일 경우 피해량 증가 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Leather", part: "Helm",   passive1: ["CriVaryper", "CriDamageVaryper"],          passive2: ["AtkSpeedVaryper"],        specialType: "PROC_PASSIVE", specialEffect: "공격 시 공격속도 증가 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Leather", part: "Armor",  passive1: ["MaxHpVary", "CriVaryper"],                 passive2: ["AttackVary"],             specialType: "PROC_PASSIVE", specialEffect: "내 체력이 30% 미만일 경우 공격력 증가 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Cloth",   part: "Helm",   passive1: ["RegenMpVary", "SkillCooldownAccVary"],     passive2: ["AtkSpeedVaryper"],        specialType: "PROC_PASSIVE", specialEffect: "공격 시 스킬 가속 증가 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Cloth",   part: "Armor",  passive1: ["AttackVary", "CriVaryper"],                passive2: ["SkillCooldownAccVary"],   specialType: "PROC_PASSIVE", specialEffect: "내 체력이 100%일 경우 치명타확률 증가 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Plate",   part: "Gloves", passive1: ["MaxHpVary", "AtkSpeedVaryper"],            passive2: ["CriVaryper"],             specialType: "PROC_PASSIVE", specialEffect: "기절 시 방어막 생성 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Leather", part: "Gloves", passive1: ["AtkSpeedVaryper", "CriDamageVaryper"],     passive2: ["DamageUpVaryper"],        specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 치명타피해 증가 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Cloth",   part: "Gloves", passive1: ["AttackVary", "SkillCooldownAccVary"],      passive2: ["CriVaryper"],             specialType: "PROC_PASSIVE", specialEffect: "적 처치 시 마나 회복 (2T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Plate",   part: "Shoes",  passive1: ["DamageDownVaryper", "SkillCooldownAccVary"], passive2: ["DamageUpVaryper"],      specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Leather", part: "Shoes",  passive1: ["CriVaryper", "CriDamageVaryper"],          passive2: ["SkillCooldownAccVary"],   specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 3, acquire: "DUNGEON_CORE", material: "Cloth",   part: "Shoes",  passive1: ["AttackVary", "CriVaryper"],                passive2: ["SkillCooldownAccVary"],   specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    // ── 3T 드랍(Boss) ─────────────────────────────────────────────────────
    { tier: 3, acquire: "BOSS_DROP",   material: "Plate",   part: "Helm",   passive1: ["RegenHpVary", "MaxHpVary"],                passive2: ["SCNegativeRecoveryVary"], specialType: "PROC_PASSIVE", specialEffect: "공격 시 체력 회복 (2T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Plate",   part: "Armor",  passive1: ["DamageDownVaryper", "CriVaryper"],         passive2: ["CriDamageVaryper"],       specialType: "PROC_PASSIVE", specialEffect: "내 체력이 50% 미만일 경우 피해량 증가 (2T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Leather", part: "Helm",   passive1: ["CriVaryper", "AttackVary"],                passive2: ["SkillCooldownAccVary"],   specialType: "PROC_PASSIVE", specialEffect: "공격 시 공격속도 증가 (2T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Leather", part: "Armor",  passive1: ["MaxHpVary", "CriDamageVaryper"],           passive2: ["AttackVary"],             specialType: "PROC_PASSIVE", specialEffect: "내 체력이 30% 미만일 경우 공격력 증가 (2T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Cloth",   part: "Helm",   passive1: ["RegenMpVary", "CostMpDownVaryper"],        passive2: ["HealAmpVaryper"],         specialType: "PROC_PASSIVE", specialEffect: "공격 시 스킬 가속 증가 (2T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Cloth",   part: "Armor",  passive1: ["MaxMpVary", "CriVaryper"],                 passive2: ["SkillCooldownAccVary"],   specialType: "PROC_PASSIVE", specialEffect: "내 체력이 100%일 경우 치명타확률 증가 (2T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Plate",   part: "Shoes",  passive1: ["DefenseVary", "RegenHpVary"],              passive2: ["MaxHpVary"],              specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Plate",   part: "Shoes",  passive1: ["DefenseVary", "SkillCooldownAccVary"],     passive2: ["PVEDamageUpVaryper"],     specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Leather", part: "Shoes",  passive1: ["AttackVary", "MaxHpVary"],                 passive2: ["DamageDownVaryper"],      specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Leather", part: "Shoes",  passive1: ["AttackVary", "CriVaryper"],                passive2: ["AtkSpeedVaryper"],        specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Cloth",   part: "Shoes",  passive1: ["CostMpDownVaryper", "MaxHpVary"],          passive2: ["HealAmpVaryper"],         specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Cloth",   part: "Shoes",  passive1: ["CostMpDownVaryper", "AttackVary"],         passive2: ["PVEDamageUpVaryper"],     specialType: "PROC_PASSIVE", specialEffect: "피격 시 이동속도 증가 (1T)" },
    // ── 3T 드랍(Boss) Active 특수효과 ────────────────────────────────────
    { tier: 3, acquire: "BOSS_DROP",   material: "Plate",   part: "Shoes",  passive1: ["SkillCooldownAccVary", "DamageUpVaryper"],  passive2: ["AtkSpeedVaryper"],        specialType: "ACTIVE",       specialEffect: "곤의 유산(3초간 무적)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Leather", part: "Shoes",  passive1: ["AttackVary", "CriDamageVaryper"],           passive2: ["AtkSpeedVaryper"],        specialType: "ACTIVE",       specialEffect: "물러서기(도약 후 이속 증가)" },
    { tier: 3, acquire: "BOSS_DROP",   material: "Cloth",   part: "Shoes",  passive1: ["SkillCooldownAccVary", "AttackVary"],       passive2: ["AtkSpeedVaryper"],        specialType: "ACTIVE",       specialEffect: "정신집중(마력 회복)" },
  ];
  return defs.map((d) => {
    const baseId = keyToBaseId({ tier: d.tier, acquire: d.acquire, material: d.material, part: d.part });
    const id = makeUniqueId(baseId, { passive1: d.passive1, passive2: d.passive2, specialType: d.specialType, specialEffect: d.specialEffect });
    return { ...d, id };
  });
})();

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
  const id =
    typeof raw.id === "string" && raw.id.includes("|h")
      ? raw.id
      : makeUniqueId(baseId, { passive1, passive2, specialType, specialEffect });

  const cfg: ArmorConfig = {
    id,
    tier,
    acquire,
    material,
    part,
    passive1,
    passive2,
    specialType,
    specialEffect: specialType === "NONE" ? "" : specialEffect,
  };

  if (!isValidConfig(cfg)) return null;
  return cfg;
}

/** ===== Color Tags ===== */
const MATERIAL_COLOR: Record<Material, { bg: string; fg: string; border: string }> = {
  Plate:   { bg: "rgba(59,130,246,0.12)",  fg: "#93c5fd", border: "rgba(59,130,246,0.55)"  },
  Leather: { bg: "rgba(245,158,11,0.12)",  fg: "#fcd34d", border: "rgba(245,158,11,0.55)" },
  Cloth:   { bg: "rgba(168,85,247,0.12)",  fg: "#d8b4fe", border: "rgba(168,85,247,0.55)" },
};

const PART_COLOR: Record<Part, { bg: string; fg: string; border: string }> = {
  Armor:  { bg: "rgba(16,185,129,0.12)",  fg: "#6ee7b7", border: "rgba(16,185,129,0.55)"  },
  Helm:   { bg: "rgba(236,72,153,0.12)",  fg: "#f9a8d4", border: "rgba(236,72,153,0.55)"  },
  Gloves: { bg: "rgba(239,68,68,0.12)",   fg: "#fca5a5", border: "rgba(239,68,68,0.55)"   },
  Shoes:  { bg: "rgba(14,165,233,0.12)",  fg: "#7dd3fc", border: "rgba(14,165,233,0.55)"  },
};

type Equipped = Record<Part, string | null>; // part -> uniqueId

type DistStackMode = "PART" | "MATERIAL";

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
    if (!AVAILABILITY[tier][acquire]) setAcquire(acquireOptions[0] ?? (tier === 1 ? "BASIC_CRAFT" : "LOOT_CRAFT"));
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
  const [importMode, setImportMode] = useState<"MERGE" | "REPLACE">("MERGE");

  // ✅ Equipped
  const [equipped, setEquipped] = useState<Equipped>({
    Armor: null,
    Helm: null,
    Gloves: null,
    Shoes: null,
  });

  // ✅ localStorage load/save
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // 저장 데이터 없으면 프리셋으로 초기화
        const nextStore: Record<string, ArmorConfig> = {};
        const nextIds = new Set<string>();
        for (const cfg of PRESET_CONFIGS) {
          nextStore[cfg.id] = cfg;
          nextIds.add(cfg.id);
        }
        setStore(nextStore);
        setSavedIds(nextIds);
        return;
      }
      const parsed = JSON.parse(raw) as {
        store: Record<string, ArmorConfig>;
        savedIds: string[];
        equipped?: Equipped;
      };
      if (parsed?.store && Array.isArray(parsed?.savedIds) && parsed.savedIds.length > 0) {
        setStore(parsed.store);
        setSavedIds(new Set(parsed.savedIds));
      } else {
        // savedIds가 비어있으면 프리셋으로 초기화
        const nextStore: Record<string, ArmorConfig> = {};
        const nextIds = new Set<string>();
        for (const cfg of PRESET_CONFIGS) {
          nextStore[cfg.id] = cfg;
          nextIds.add(cfg.id);
        }
        setStore(nextStore);
        setSavedIds(nextIds);
      }
      if (parsed?.equipped) setEquipped(parsed.equipped);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      const payload = { store, savedIds: Array.from(savedIds), equipped };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [store, savedIds, equipped]);

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
      showToast("저장 실패: 패시브1 최소 1개 + (특수 타입 있으면 특수효과 1개 필요)");
      return;
    }

    const uniqueId = makeUniqueId(baseId, draft);
    const existed = savedIds.has(uniqueId);

    const cfg: ArmorConfig = {
      ...draft,
      ...currentKey,
      id: uniqueId,
      passive2: clampSlot(draft.passive2),
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
    const nextStore: Record<string, ArmorConfig> = {};
    const nextIds = new Set<string>();
    for (const cfg of PRESET_CONFIGS) {
      nextStore[cfg.id] = cfg;
      nextIds.add(cfg.id);
    }
    setStore(nextStore);
    setSavedIds(nextIds);
    setConfirmReset(false);
    setEquipped({ Armor: null, Helm: null, Gloves: null, Shoes: null });
    showToast("프리셋으로 초기화했어!");
  }

  function deleteRow(uniqueId: string) {
    const cfg = store[uniqueId];
    if (!cfg) return;

    const ok = window.confirm(
      `이 항목을 삭제할까?\n${cfg.tier}T / ${ACQUIRE_LABEL[cfg.acquire]} / ${MATERIAL_LABEL[cfg.material]} / ${PART_LABEL[cfg.part]}`
    );
    if (!ok) return;

    // if equipped, unequip too
    setEquipped((prev) => {
      const next: Equipped = { ...prev };
      for (const p of PART_ORDER) {
        if (next[p] === uniqueId) next[p] = null;
      }
      return next;
    });

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
      equipped,
    });
  }

  /** ===== Import ===== */
  function openImport() {
    fileRef.current?.click();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

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

      // also import equipped if exists (applied only on REPLACE, or when ids exist on MERGE)
      if (parsed?.equipped) {
        (window as any).__incoming_equipped__ = parsed.equipped;
      } else {
        (window as any).__incoming_equipped__ = null;
      }
    } catch {
      showToast("임포트 실패: JSON 파싱 오류");
    }
  }

  function applyImport() {
    if (!importConfirm) return;
    const incoming = importConfirm.incoming;
    const incomingEquipped: Equipped | null = (window as any).__incoming_equipped__ ?? null;

    if (importMode === "REPLACE") {
      const nextStore: Record<string, ArmorConfig> = {};
      const nextIds = new Set<string>();
      for (const cfg of incoming) {
        nextStore[cfg.id] = cfg;
        nextIds.add(cfg.id);
      }
      setStore(nextStore);
      setSavedIds(nextIds);

      if (incomingEquipped) {
        const sanitized: Equipped = { Armor: null, Helm: null, Gloves: null, Shoes: null };
        for (const p of PART_ORDER) {
          const id = incomingEquipped[p];
          sanitized[p] = id && nextIds.has(id) ? id : null;
        }
        setEquipped(sanitized);
      } else {
        setEquipped({ Armor: null, Helm: null, Gloves: null, Shoes: null });
      }

      setImportConfirm(null);
      showToast(`임포트 완료(덮어쓰기): ${incoming.length}개`);
      return;
    }

    // MERGE
    setStore((prev) => {
      const next = { ...prev };
      for (const cfg of incoming) next[cfg.id] = cfg;
      return next;
    });
    setSavedIds((prev) => {
      const next = new Set(prev);
      for (const cfg of incoming) next.add(cfg.id);
      return next;
    });

    if (incomingEquipped) {
      setEquipped((prev) => {
        const next: Equipped = { ...prev };
        const incomingIds = new Set(incoming.map((c) => c.id));
        for (const p of PART_ORDER) {
          const id = incomingEquipped[p];
          if (id && (savedIds.has(id) || incomingIds.has(id))) {
            next[p] = id;
          }
        }
        return next;
      });
    }

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

  /** ===== Filters (for saved panel + fullscreen) ===== */
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

  /** ===== Equipped Simulator ===== */
  function equipFromSelected(cfg: ArmorConfig) {
    if (!cfg?.id) return;
    setEquipped((prev) => ({ ...prev, [cfg.part]: cfg.id }));
    showToast(`${PART_LABEL[cfg.part]}에 장착됨`);
  }
  function unequip(part: Part) {
    setEquipped((prev) => ({ ...prev, [part]: null }));
  }
  function clearAllEquipped() {
    setEquipped({ Armor: null, Helm: null, Gloves: null, Shoes: null });
    showToast("착용 장비를 모두 해제했어");
  }

  const equippedConfigs: Partial<Record<Part, ArmorConfig>> = useMemo(() => {
    const out: Partial<Record<Part, ArmorConfig>> = {};
    for (const p of PART_ORDER) {
      const id = equipped[p];
      if (id && store[id]) out[p] = store[id];
    }
    return out;
  }, [equipped, store]);

  // ✅ StatMod / Proc / Active 로 분리 + sources 제거
  const equippedEffects = useMemo(() => {
    const statMap = new Map<string, number>();
    const procMap = new Map<string, number>();
    const activeMap = new Map<string, number>();

    const add = (map: Map<string, number>, label: string) => {
      map.set(label, (map.get(label) ?? 0) + 1);
    };

    for (const p of PART_ORDER) {
      const cfg = equippedConfigs[p];
      if (!cfg) continue;

      for (const s of cfg.passive1) add(statMap, STATMOD_LABEL[s]);
      for (const s of cfg.passive2) add(statMap, STATMOD_LABEL[s]);

      if (cfg.specialType === "PROC_PASSIVE" && cfg.specialEffect.trim()) add(procMap, cfg.specialEffect.trim());
      if (cfg.specialType === "ACTIVE" && cfg.specialEffect.trim()) add(activeMap, cfg.specialEffect.trim());
    }

    const toList = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      statmods: toList(statMap),
      proc: toList(procMap),
      active: toList(activeMap),
      totalCount: statMap.size + procMap.size + activeMap.size,
    };
  }, [equippedConfigs]);

  /** ===== ✅ Acquire Distribution (Stacked Bar) ===== */
  const [distShowTier, setDistShowTier] = useState(true);
  const [distStackMode, setDistStackMode] = useState<DistStackMode>("PART");

  type DistRow = {
    acquire: Acquire;
    tier: Tier | "ALL";
    partCounts: Record<Part, number>;
    materialCounts: Record<Material, number>;
    total: number;
  };

  const distRows: DistRow[] = useMemo(() => {
    // savedList 기반
    const map = new Map<string, DistRow>();

    const makeEmpty = (acq: Acquire, t: Tier | "ALL"): DistRow => ({
      acquire: acq,
      tier: t,
      partCounts: { Armor: 0, Helm: 0, Gloves: 0, Shoes: 0 },
      materialCounts: { Plate: 0, Leather: 0, Cloth: 0 },
      total: 0,
    });

    for (const cfg of savedList) {
      // distShowTier가 꺼져있으면 티어는 ALL로 합치기
      const t: Tier | "ALL" = distShowTier ? cfg.tier : "ALL";
      const key = `${cfg.acquire}|${t}`;
      if (!map.has(key)) map.set(key, makeEmpty(cfg.acquire, t));
      const row = map.get(key)!;
      row.partCounts[cfg.part] += 1;
      row.materialCounts[cfg.material] += 1;
      row.total += 1;
    }

    const list = Array.from(map.values());

    // 정렬: acquire order -> tier(ALL last) -> label
    list.sort((a, b) => {
      const ai = ACQUIRE_ORDER.indexOf(a.acquire);
      const bi = ACQUIRE_ORDER.indexOf(b.acquire);
      if (ai !== bi) return ai - bi;

      const at = a.tier === "ALL" ? 999 : a.tier;
      const bt = b.tier === "ALL" ? 999 : b.tier;
      if (at !== bt) return at - bt;

      return 0;
    });

    return list;
  }, [savedList, distShowTier]);

  const distMaxTotal = useMemo(() => {
    let mx = 0;
    for (const r of distRows) mx = Math.max(mx, r.total);
    return mx;
  }, [distRows]);

  const distLegend = useMemo(() => {
    if (distStackMode === "PART") {
      return PART_ORDER.map((p) => ({
        key: p,
        label: PART_LABEL[p],
        color: PART_COLOR[p].border,
      }));
    }
    return MATERIAL_ORDER.map((m) => ({
      key: m,
      label: MATERIAL_LABEL[m],
      color: MATERIAL_COLOR[m].border,
    }));
  }, [distStackMode]);

  /** ===== Board Model (unchanged) ===== */
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

  const contentHeight = "calc(100vh - 360px)";

  /** ===== Filters UI (reused in normal + fullscreen) ===== */
  const FiltersUI = () => (
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

      <input
        style={styles.input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="검색: 효과명/문구/재질/파츠/버전 등"
      />
    </div>
  );

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
        <div style={{ ...styles.tableWrap, height: props.inFullscreen ? "calc(100vh - 260px)" : contentHeight }}>
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
                <Th style={{ width: 170 }}>액션</Th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((cfg) => {
                const rowBaseId = keyToBaseId(cfg);
                const isSameCell = rowBaseId === baseId;
                const isExact = cfg.id === draft.id && draft.id !== "";
                const ver = getVerFromUniqueId(cfg.id);
                const isEquipped = equipped[cfg.part] === cfg.id;

                return (
                  <tr
                    key={cfg.id}
                    style={isExact ? styles.trActive : isSameCell ? styles.trSameCell : undefined}
                    onDoubleClick={() => equipFromSelected(cfg)}
                    title="더블클릭: 장착"
                  >
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
                      {cfg.passive2.length ? (
                        <InlineList items={cfg.passive2.map((s) => STATMOD_LABEL[s])} />
                      ) : (
                        <span style={{ opacity: 0.6 }}>-</span>
                      )}
                    </Td>
                    <Td>{SPECIAL_LABEL[cfg.specialType]}</Td>
                    <Td style={{ maxWidth: 280 }}>
                      <div style={{ whiteSpace: "normal", wordBreak: "break-word", opacity: 0.95 }}>
                        {cfg.specialType === "NONE" ? <span style={{ opacity: 0.6 }}>-</span> : cfg.specialEffect}
                      </div>
                    </Td>
                    <Td style={{ opacity: 0.8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      {ver || "-"}
                    </Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      <button
                        style={{ ...styles.smallBtn, ...(isEquipped ? styles.smallBtnActive : null) }}
                        onClick={() => equipFromSelected(cfg)}
                        title="착용 장비 슬롯에 장착"
                      >
                        {isEquipped ? "장착중" : "장착"}
                      </button>
                      <button style={styles.smallBtnDanger} onClick={() => deleteRow(cfg.id)} title="이 항목 삭제">
                        삭제
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
      <div style={{ ...styles.boardWrap, height: props.inFullscreen ? "calc(100vh - 260px)" : contentHeight }}>
        <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 10 }}>
          보드 모드(다이어그램). <b>표</b>에서 장착/삭제가 빠르다링.
        </div>

        {compareMode ? (
          <div style={{ opacity: 0.75, fontSize: 13, lineHeight: 1.5 }}>
            비교모드는 기존 구현 유지 상태야. 형아가 원하면 보드/비교 카드에도 “장착/해제” 버튼을 같이 붙여줄 수 있어.
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
                                              const ver = getVerFromUniqueId(cfg.id);
                                              const isEquipped = equipped[cfg.part] === cfg.id;

                                              return (
                                                <div
                                                  key={cfg.id}
                                                  style={{
                                                    ...styles.nodeCard,
                                                    ...(isExact ? styles.nodeCardActive : null),
                                                  }}
                                                  onDoubleClick={() => equipFromSelected(cfg)}
                                                  title="더블클릭: 장착"
                                                >
                                                  <div style={styles.nodeHeader}>
                                                    <span style={styles.verPill}>{ver || "-"}</span>
                                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                      <button style={styles.nodeBtn} onClick={() => jumpTo(cfg)}>
                                                        편집
                                                      </button>
                                                      <button
                                                        style={{ ...styles.nodeBtn, ...(isEquipped ? styles.nodeBtnActive : null) }}
                                                        onClick={() => equipFromSelected(cfg)}
                                                      >
                                                        {isEquipped ? "장착중" : "장착"}
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
                                                    {cfg.passive2.length ? (
                                                      <InlineList items={cfg.passive2.map((s) => STATMOD_LABEL[s])} />
                                                    ) : (
                                                      <div style={{ opacity: 0.6, fontSize: 12 }}>-</div>
                                                    )}

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

  /** ===== RPG Slot Renderer ===== */
  const renderRPGSlot = (p: Part) => {
    const id = equipped[p];
    const cfg = id ? store[id] : null;
    const accentColor = PART_COLOR[p].border;

    if (!cfg) {
      return (
        <div style={styles.rpgSlotEmpty}>
          <span style={{ fontSize: 28, opacity: 0.35 }}>{PART_ICON[p]}</span>
          <Tag label={PART_LABEL[p]} bg={PART_COLOR[p].bg} fg={PART_COLOR[p].fg} border={PART_COLOR[p].border} />
          <span style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>빈 슬롯</span>
        </div>
      );
    }

    return (
      <div style={{ ...styles.rpgSlotCard, borderColor: accentColor, boxShadow: `0 0 16px ${accentColor}28, 0 2px 10px rgba(0,0,0,0.6)` }}>
        {/* Header: 아이콘 + 파츠명 + 버전 + 해제 버튼 (한 줄) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{PART_ICON[p]}</span>
            <Tag label={PART_LABEL[p]} bg={PART_COLOR[p].bg} fg={PART_COLOR[p].fg} border={PART_COLOR[p].border} />
            <span style={{ ...styles.verPill, fontSize: 10, flexShrink: 0 }}>v{getVerFromUniqueId(cfg.id) || "-"}</span>
          </div>
          <button style={styles.smallBtnDanger} onClick={() => unequip(p)}>해제</button>
        </div>
        {/* 요약: 티어·획득·재질 */}
        <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.3 }}>
          {cfg.tier}T · {ACQUIRE_LABEL[cfg.acquire]} · {MATERIAL_LABEL[cfg.material]}
        </div>
        {/* 패시브/스페셜 (레이블 없이 인라인) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <InlineList items={cfg.passive1.map((s) => STATMOD_LABEL[s])} />
          {cfg.passive2.length > 0 && <InlineList items={cfg.passive2.map((s) => STATMOD_LABEL[s])} />}
          {cfg.specialType !== "NONE" && (
            <div style={{ ...styles.specialBox, fontSize: 11, padding: "3px 8px" }}>{cfg.specialEffect}</div>
          )}
        </div>
        {/* 액션 버튼 */}
        <div style={{ display: "flex", gap: 5 }}>
          <button style={styles.smallBtn} onClick={() => jumpTo(cfg)}>편집</button>
          <button style={styles.smallBtnDanger} onClick={() => deleteRow(cfg.id)}>삭제</button>
        </div>
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
            선택 → 드래그 배치 → <b>저장</b> → 표/보드에서 비교 + <b>착용 장비</b>로 4파츠 장착 효과 확인 (JSON 공유 가능)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={styles.btnSecondary} onClick={exportSaved} disabled={savedIds.size === 0}>
            저장 JSON
          </button>
          <button style={styles.btnSecondary} onClick={openImport}>
            JSON 임포트
          </button>

          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onPickFile} />

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
                <input type="radio" checked={importMode === "MERGE"} onChange={() => setImportMode("MERGE")} />
                <div>
                  <div style={{ fontWeight: 900 }}>병합(merge)</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>내 데이터 유지 + 같은 id는 업데이트 + 신규는 추가</div>
                </div>
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input type="radio" checked={importMode === "REPLACE"} onChange={() => setImportMode("REPLACE")} />
                <div>
                  <div style={{ fontWeight: 900, color: "#fecdd3" }}>덮어쓰기(replace)</div>
                  <div style={{ opacity: 0.75, fontSize: 12, color: "#fecdd3" }}>현재 저장 데이터를 전부 지우고 임포트로 교체</div>
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

      {/* Fullscreen Modal (✅ filters included) */}
      {fullscreen ? (
        <div style={styles.fullBackdrop} onMouseDown={() => setFullscreen(false)}>
          <div style={styles.fullModal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.fullHeader}>
              <div style={{ fontWeight: 950, fontSize: 14 }}>
                전체화면 - {fullscreenView === "TABLE" ? "표" : "보드"} {fullscreenView === "BOARD" && compareMode ? "(비교모드)" : ""}
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
              {/* ✅ fullscreen에서도 필터 보이게 */}
              <FiltersUI />
              <div style={{ marginTop: 10 }}>
                <RightContent inFullscreen modeOverride={fullscreenView} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ✅ UI 순서 1) 착용 장비 (맨 위) */}
      <section style={{ ...styles.panel, marginTop: 10 }}>
        <div style={styles.equipHeader}>
          <div>
            <div style={{ fontWeight: 950 }}>착용 장비</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
              저장된 방어구를 표/보드에서 <b>장착</b>하면 파츠 슬롯에 들어가고, 우측에 합산 효과가 리스트로 보여진다링.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button style={styles.btnSecondary} onClick={() => equipFromSelected(draft)} disabled={!draft.id}>
              현재 선택 항목 장착
            </button>
            <button style={styles.btnDanger} onClick={clearAllEquipped}>
              전체 해제
            </button>
          </div>
        </div>

        <div style={styles.equipGrid}>
          {/* Left: Character Body Map */}
          <div style={styles.charMapPanel}>
            {/* Atmospheric radial glow */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 14, zIndex: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse 65% 55% at 50% 40%, rgba(185,140,40,0.14) 0%, rgba(120,60,10,0.06) 50%, transparent 80%)",
            }} />

            {/* 3-column slot grid with SVG character in center */}
            <div style={styles.charSlotGrid}>
              {/* Top center: Helm */}
              <div style={{ gridArea: "helm" }}>{renderRPGSlot("Helm")}</div>

              {/* Left: Gloves */}
              <div style={{ gridArea: "gloves" }}>{renderRPGSlot("Gloves")}</div>

              {/* Center: Character SVG */}
              <div style={{ gridArea: "char", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 120 260" style={{ width: 110, height: "auto" }} aria-hidden="true">
                  <defs>
                    <filter id="rpgGlow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3.5" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>

                  {/* HEAD / HELM */}
                  <circle cx="60" cy="28" r="21"
                    fill={equippedConfigs["Helm"] ? `${PART_COLOR["Helm"].border}35` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Helm"].border}
                    strokeWidth={equippedConfigs["Helm"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Helm"] ? "0.95" : "0.22"}
                    filter={equippedConfigs["Helm"] ? "url(#rpgGlow)" : undefined}
                  />
                  <line x1="44" y1="30" x2="76" y2="30" stroke={equippedConfigs["Helm"] ? PART_COLOR["Helm"].border : "rgba(148,163,184,0.14)"} strokeWidth="1" strokeOpacity="0.55"/>

                  {/* NECK */}
                  <rect x="54" y="49" width="12" height="12" rx="2"
                    fill="rgba(148,163,184,0.08)" stroke="rgba(148,163,184,0.18)" strokeWidth="0.8"/>

                  {/* SHOULDERS / ARMOR */}
                  <rect x="16" y="58" width="88" height="12" rx="6"
                    fill={equippedConfigs["Armor"] ? `${PART_COLOR["Armor"].border}25` : "rgba(148,163,184,0.07)"}
                    stroke={PART_COLOR["Armor"].border}
                    strokeWidth={equippedConfigs["Armor"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Armor"] ? "0.75" : "0.18"}
                  />

                  {/* TORSO / ARMOR */}
                  <rect x="28" y="70" width="64" height="74" rx="6"
                    fill={equippedConfigs["Armor"] ? `${PART_COLOR["Armor"].border}30` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Armor"].border}
                    strokeWidth={equippedConfigs["Armor"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Armor"] ? "0.95" : "0.22"}
                    filter={equippedConfigs["Armor"] ? "url(#rpgGlow)" : undefined}
                  />
                  <line x1="60" y1="76" x2="60" y2="134" stroke={equippedConfigs["Armor"] ? PART_COLOR["Armor"].border : "rgba(148,163,184,0.10)"} strokeWidth="1" strokeOpacity="0.45"/>
                  <path d="M 42 92 Q 60 100 78 92" stroke={equippedConfigs["Armor"] ? PART_COLOR["Armor"].border : "rgba(148,163,184,0.10)"} strokeWidth="1" strokeOpacity="0.45" fill="none"/>

                  {/* LEFT ARM / GLOVES */}
                  <rect x="12" y="68" width="16" height="54" rx="5"
                    fill={equippedConfigs["Gloves"] ? `${PART_COLOR["Gloves"].border}30` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Gloves"].border}
                    strokeWidth={equippedConfigs["Gloves"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Gloves"] ? "0.95" : "0.22"}
                    filter={equippedConfigs["Gloves"] ? "url(#rpgGlow)" : undefined}
                  />
                  <rect x="8" y="122" width="20" height="22" rx="4"
                    fill={equippedConfigs["Gloves"] ? `${PART_COLOR["Gloves"].border}40` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Gloves"].border}
                    strokeWidth={equippedConfigs["Gloves"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Gloves"] ? "0.95" : "0.22"}
                  />

                  {/* RIGHT ARM / GLOVES */}
                  <rect x="92" y="68" width="16" height="54" rx="5"
                    fill={equippedConfigs["Gloves"] ? `${PART_COLOR["Gloves"].border}30` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Gloves"].border}
                    strokeWidth={equippedConfigs["Gloves"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Gloves"] ? "0.95" : "0.22"}
                  />
                  <rect x="92" y="122" width="20" height="22" rx="4"
                    fill={equippedConfigs["Gloves"] ? `${PART_COLOR["Gloves"].border}40` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Gloves"].border}
                    strokeWidth={equippedConfigs["Gloves"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Gloves"] ? "0.95" : "0.22"}
                  />

                  {/* WAIST / BELT */}
                  <rect x="30" y="144" width="60" height="14" rx="4"
                    fill="rgba(148,163,184,0.07)" stroke="rgba(148,163,184,0.16)" strokeWidth="0.8"/>

                  {/* LEFT LEG / SHOES */}
                  <rect x="32" y="158" width="22" height="76" rx="5"
                    fill={equippedConfigs["Shoes"] ? `${PART_COLOR["Shoes"].border}28` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Shoes"].border}
                    strokeWidth={equippedConfigs["Shoes"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Shoes"] ? "0.9" : "0.22"}
                    filter={equippedConfigs["Shoes"] ? "url(#rpgGlow)" : undefined}
                  />
                  <rect x="26" y="230" width="30" height="16" rx="4"
                    fill={equippedConfigs["Shoes"] ? `${PART_COLOR["Shoes"].border}40` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Shoes"].border}
                    strokeWidth={equippedConfigs["Shoes"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Shoes"] ? "0.95" : "0.22"}
                  />

                  {/* RIGHT LEG / SHOES */}
                  <rect x="66" y="158" width="22" height="76" rx="5"
                    fill={equippedConfigs["Shoes"] ? `${PART_COLOR["Shoes"].border}28` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Shoes"].border}
                    strokeWidth={equippedConfigs["Shoes"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Shoes"] ? "0.9" : "0.22"}
                  />
                  <rect x="64" y="230" width="30" height="16" rx="4"
                    fill={equippedConfigs["Shoes"] ? `${PART_COLOR["Shoes"].border}40` : "rgba(148,163,184,0.08)"}
                    stroke={PART_COLOR["Shoes"].border}
                    strokeWidth={equippedConfigs["Shoes"] ? "1.5" : "0.8"}
                    strokeOpacity={equippedConfigs["Shoes"] ? "0.95" : "0.22"}
                  />
                </svg>
              </div>

              {/* Right: Armor */}
              <div style={{ gridArea: "armor" }}>{renderRPGSlot("Armor")}</div>

              {/* Bottom center: Shoes */}
              <div style={{ gridArea: "shoes" }}>{renderRPGSlot("Shoes")}</div>
            </div>
          </div>

          {/* Right: aggregated effects */}
          <div style={styles.effectCol}>
            <div style={styles.effectHeader}>
              <div style={{ fontWeight: 950 }}>장착 효과(합산)</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>동일 효과가 여러 부위에 있으면 <b>×N</b>으로 누적 표시</div>
            </div>

            {equippedEffects.totalCount === 0 ? (
              <div style={styles.effectEmpty}>아직 장착된 장비가 없어. 표/보드에서 장착해보라링.</div>
            ) : (
              <div style={styles.effectList}>
                <EffectGroup title="StatMod" items={equippedEffects.statmods} />
                <EffectGroup title="Proc Passive" items={equippedEffects.proc} />
                <EffectGroup title="Active" items={equippedEffects.active} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ✅ UI 순서 2) 획득 방식 별 분포도 (스택 막대그래프) */}
      <section style={{ ...styles.panel, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>획득 방식 별 분포도(저장 데이터 기반)</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
              저장된 방어구({savedList.length}개)를 기준으로, 획득 방식{distShowTier ? "/티어" : ""}별{" "}
              {distStackMode === "PART" ? "파츠" : "재질"} 분포를 <b>스택 막대그래프</b>로 본다링.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            <label style={styles.checkPill}>
              <input type="checkbox" checked={distShowTier} onChange={(e) => setDistShowTier(e.target.checked)} />
              <span style={{ fontWeight: 950 }}>티어 분리</span>
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={tabBtn(distStackMode === "PART")} onClick={() => setDistStackMode("PART")}>
                파츠 스택
              </button>
              <button style={tabBtn(distStackMode === "MATERIAL")} onClick={() => setDistStackMode("MATERIAL")}>
                재질 스택
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 950 }}>Legend</div>
          {distLegend.map((it) => (
            <div key={String(it.key)} style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: it.color }} />
              <span style={{ fontWeight: 900, fontSize: 13 }}>{it.label}</span>
            </div>
          ))}
        </div>

        {/* Bars */}
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {distRows.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 13, padding: 10 }}>아직 저장된 방어구가 없어. 저장하면 분포가 보인다링.</div>
          ) : (
            distRows.map((r) => {
              const labelLeft = `${ACQUIRE_LABEL[r.acquire]}${distShowTier ? ` · ${r.tier === "ALL" ? "전체" : `${r.tier}T`}` : ""}`;
              const denom = Math.max(1, r.total);
              const barScale = distMaxTotal ? r.total / distMaxTotal : 0; // 길이(행별 total)도 비교되게

              const segments =
                distStackMode === "PART"
                  ? PART_ORDER.map((p) => ({
                      key: p,
                      label: PART_LABEL[p],
                      count: r.partCounts[p] || 0,
                      color: PART_COLOR[p].border,
                    }))
                  : MATERIAL_ORDER.map((m) => ({
                      key: m,
                      label: MATERIAL_LABEL[m],
                      count: r.materialCounts[m] || 0,
                      color: MATERIAL_COLOR[m].border,
                    }));

              return (
                <div key={`${r.acquire}_${r.tier}`} style={styles.barRow}>
                  <div style={styles.barLeft}>
                    <div style={{ fontWeight: 950, fontSize: 14 }}>{labelLeft}</div>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ opacity: 0.55, fontSize: 11 }}>합계</span>
                      <span style={{ fontWeight: 950, fontSize: 15, color: "#e2e8f0" }}>{r.total}</span>
                    </div>
                  </div>

                  <div style={styles.barRight}>
                    <div style={styles.barTrack} title={`총 ${r.total}개`}>
                      {/* 전체 길이 스케일 (행 total 비교) */}
                      <div style={{ ...styles.barScaledWrap, width: `${Math.max(4, barScale * 100)}%` }}>
                        {segments.map((s) => {
                          const w = (s.count / denom) * 100;
                          if (w <= 0) return null;
                          return (
                            <div
                              key={String(s.key)}
                              style={{ ...styles.barSeg, width: `${w}%`, background: s.color }}
                              title={`${s.label}: ${s.count}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* 숫자 라벨 */}
                    <div style={styles.barNumbers}>
                      {segments.filter((s) => s.count > 0).map((s) => (
                        <div key={String(s.key)} style={{ ...styles.barNumChip, borderLeft: `3px solid ${s.color}` }} title={s.label}>
                          <span style={{ opacity: 0.85 }}>{s.label}</span>
                          <span style={{ fontWeight: 950 }}>{s.count}</span>
                          <span style={{ opacity: 0.55, fontSize: 11 }}>({Math.round((s.count / denom) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ✅ UI 순서 3) 선택 (한 칸 아래로) */}
      <section style={{ ...styles.card, marginTop: 14 }}>
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

      {/* ✅ UI 순서 4) StatModified 풀 / 현재 선택 항목 설정 / 저장된 방어구 */}
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
            title="패시브 1 (1~2개)"
            ok={draft.passive1.length >= 1 && draft.passive1.length <= 2}
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
            optional
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
                <div style={{ opacity: 0.65, fontSize: 13 }}>특수 타입이 “없음”이야. (드롭해도 자동으로 Proc Passive로 바뀜)</div>
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

          <FiltersUI />

          <RightContent />

          <div style={{ marginTop: 10, ...styles.hint }}>
            표/보드에서 <b>장착</b> 버튼 또는 <b>더블클릭</b>으로 해당 파츠 슬롯에 끼울 수 있다링. (같은 파츠는 자동 교체)
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
  optional?: boolean;
}) {
  const { title, ok, slot, onDragOver, onDrop, onRemoveText, optional } = props;

  const showWarn = !ok && !optional;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {showWarn ? <span style={{ color: "#fb7185", fontSize: 12, fontWeight: 800 }}>❗ 최소 1개 필요</span> : null}
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
function Td({ children, style, colSpan }: { children: React.ReactNode; style?: React.CSSProperties; colSpan?: any }) {
  return (
    <td style={{ ...styles.td, ...style }} colSpan={colSpan}>
      {children}
    </td>
  );
}

// 합산 효과 그룹 렌더러
function EffectGroup(props: { title: string; items: Array<{ label: string; count: number }> }) {
  const { title, items } = props;

  return (
    <div style={styles.effectGroup}>
      <div style={styles.effectGroupHeader}>
        <div style={{ fontWeight: 950 }}>{title}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>{items.length}개</div>
      </div>

      {items.length === 0 ? (
        <div style={styles.effectGroupEmpty}>-</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((e) => (
            <div key={e.label} style={styles.effectItem}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, lineHeight: 1.35 }}>{e.label}</div>
                <div style={styles.countPill}>×{e.count}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
    color: "#e2e8f0",
    background: "#111318",
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
  h1: { fontSize: 24, fontWeight: 700, letterSpacing: -0.2, color: "#f1f5f9" },
  sub: { marginTop: 6, lineHeight: 1.4, color: "#64748b" },

  toast: {
    position: "fixed",
    right: 18,
    bottom: 18,
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#1e2230",
    color: "#f1f5f9",
    fontWeight: 600,
    zIndex: 50,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.60)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
    padding: 18,
  },
  modal: {
    width: "min(560px, 100%)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "#1a1d27",
    padding: 16,
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
  },

  card: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#1a1d27",
    padding: 16,
  },
  cardTitle: { fontWeight: 600, marginBottom: 12, color: "#f1f5f9" },

  grid4: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 12,
  },

  select: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "#0f1117",
    color: "#e2e8f0",
    outline: "none",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "#0f1117",
    color: "#e2e8f0",
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
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#1a1d27",
    padding: 16,
    minWidth: 0,
  },
  panelTitle: { fontWeight: 600, marginBottom: 8, color: "#f1f5f9" },

  pool: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 6,
    maxHeight: 260,
    overflow: "auto",
    paddingRight: 4,
  },
  poolItem: {
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0f1117",
    padding: "9px 12px",
    cursor: "grab",
    fontWeight: 400,
    lineHeight: 1.4,
    whiteSpace: "normal",
    wordBreak: "break-word",
    color: "#cbd5e1",
    fontSize: 13,
  },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 1.5, color: "#475569" },

  btn: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.13)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 500,
  },
  btnSecondary: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: 500,
  },
  btnDanger: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1px solid rgba(248,113,113,0.30)",
    background: "rgba(248,113,113,0.07)",
    color: "#fca5a5",
    cursor: "pointer",
    fontWeight: 500,
  },

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "#0f1117",
    color: "#e2e8f0",
    fontWeight: 400,
    maxWidth: "100%",
  },
  miniChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#0f1117",
    color: "#cbd5e1",
    fontWeight: 400,
    fontSize: 12,
    lineHeight: 1.3,
    maxWidth: "100%",
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  chipX: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#64748b",
    borderRadius: 999,
    width: 22,
    height: 22,
    cursor: "pointer",
    fontWeight: 500,
    lineHeight: "20px",
  },

  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr)) minmax(0, 1.5fr)",
    gap: 10,
    marginBottom: 12,
  },

  tableWrap: {
    overflow: "auto",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0f1117",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: 1250,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 500,
    color: "#475569",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "#13151f",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  td: {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    verticalAlign: "top",
    color: "#cbd5e1",
  },
  trActive: {
    outline: "1px solid rgba(74,222,128,0.28)",
    background: "rgba(74,222,128,0.04)",
  },
  trSameCell: {
    outline: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
  },
  link: {
    background: "transparent",
    border: "none",
    padding: 0,
    color: "#60a5fa",
    cursor: "pointer",
    fontWeight: 500,
    textDecoration: "underline",
  },

  tabsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },

  fullBtn: {
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 12,
  },

  boardWrap: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0f1117",
    padding: 10,
    overflow: "auto",
  },

  boardTier: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "#13151f",
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
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.05)",
    background: "#1a1d27",
    padding: 10,
  },
  boardAcquireHeader: { fontWeight: 600, marginBottom: 10, color: "#64748b", fontSize: 13 },

  boardMaterials: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  boardMaterial: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.05)",
    background: "#0f1117",
    padding: 10,
    minWidth: 0,
  },
  boardMaterialHeader: { marginBottom: 10, display: "flex", justifyContent: "flex-start" },
  boardParts: { display: "grid", gridTemplateColumns: "1fr", gap: 10 },

  nodeStack: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.05)",
    background: "#13151f",
    padding: 10,
  },

  nodeCard: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#1a1d27",
    padding: 10,
    marginTop: 8,
  },
  nodeCardActive: { outline: "1px solid rgba(74,222,128,0.30)", background: "rgba(74,222,128,0.04)" },

  verPill: {
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#475569",
    fontWeight: 500,
    fontSize: 11,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    whiteSpace: "nowrap",
  },

  nodeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 },
  nodeBtn: {
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  nodeBtnActive: {
    border: "1px solid rgba(74,222,128,0.30)",
    background: "rgba(74,222,128,0.08)",
    color: "#86efac",
  },
  nodeBtnDanger: {
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(248,113,113,0.28)",
    background: "rgba(248,113,113,0.06)",
    color: "#fca5a5",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  nodeBody: { display: "flex", flexDirection: "column", gap: 4 },
  nodeSectionTitle: { fontSize: 12, fontWeight: 500, color: "#475569", marginTop: 2 },
  specialBox: {
    marginTop: 2,
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
    fontSize: 12,
    lineHeight: 1.4,
    whiteSpace: "normal",
    wordBreak: "break-word",
    color: "#64748b",
  },

  fullBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.70)",
    zIndex: 80,
    padding: 16,
  },
  fullModal: {
    height: "100%",
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0f1117",
    boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
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

  // equip
  charMapPanel: {
    position: "relative" as "relative",
    borderRadius: 14,
    border: "1px solid rgba(185,148,55,0.32)",
    background: "rgba(16,9,2,0.80)",
    padding: 14,
    overflow: "hidden" as "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(185,148,55,0.10)",
  },
  charSlotGrid: {
    display: "grid",
    gridTemplateAreas: '". helm ." "gloves char armor" ". shoes ."',
    gridTemplateColumns: "1fr 120px 1fr",
    gridTemplateRows: "auto auto auto",
    gap: 12,
    alignItems: "center",
    position: "relative" as "relative",
    zIndex: 1,
  },
  rpgSlotCard: {
    borderRadius: 10,
    border: "1px solid",
    borderColor: "rgba(185,148,55,0.30)",
    background: "rgba(12,7,2,0.82)",
    padding: "9px 11px",
    display: "flex" as "flex",
    flexDirection: "column" as "column",
    gap: 6,
    backdropFilter: "blur(4px)",
  },
  rpgSlotEmpty: {
    borderRadius: 10,
    border: "1.5px dashed rgba(185,148,55,0.22)",
    background: "rgba(12,7,2,0.40)",
    padding: "18px 10px",
    display: "flex" as "flex",
    flexDirection: "column" as "column",
    alignItems: "center" as "center",
    justifyContent: "center" as "center",
    gap: 8,
    textAlign: "center" as "center",
    minHeight: 110,
  },
  equipHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  equipGrid: {
    display: "grid",
    gridTemplateColumns: "1.35fr 1fr",
    gap: 12,
    alignItems: "stretch",
  },
  slotCol: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  slotBox: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.30)",
    padding: 12,
    minHeight: 170,
  },
  slotEmpty: {
    marginTop: 10,
    borderRadius: 12,
    border: "1px dashed rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.20)",
    padding: 12,
    opacity: 0.8,
    lineHeight: 1.45,
    fontSize: 13,
  },
  slotTitle: {
    fontWeight: 900,
    lineHeight: 1.35,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  slotSection: { fontSize: 12, fontWeight: 950, opacity: 0.85, marginBottom: 4 },

  effectCol: {
    borderRadius: 14,
    border: "1px solid rgba(185,148,55,0.25)",
    background: "rgba(20,12,4,0.70)",
    padding: 12,
    minHeight: 200,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  effectHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 10 },
  effectEmpty: { opacity: 0.75, fontSize: 13, lineHeight: 1.55, padding: 10 },
  effectList: { overflow: "auto", paddingRight: 6, display: "grid", gap: 10 },
  effectItem: {
    borderRadius: 14,
    border: "1px solid rgba(185,148,55,0.18)",
    background: "rgba(18,11,3,0.50)",
    padding: 12,
  },
  countPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.35)",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  effectGroup: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.18)",
    padding: 12,
  },
  effectGroupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 10,
  },
  effectGroupEmpty: { opacity: 0.6, fontSize: 13, padding: "6px 2px" },

  smallBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(185,148,55,0.28)",
    background: "rgba(18,11,3,0.40)",
    color: "#d4c49a",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
    marginRight: 8,
  },
  smallBtnActive: {
    border: "1px solid rgba(52,211,153,0.45)",
    background: "rgba(52,211,153,0.14)",
    color: "#e2e8f0",
  },
  smallBtnDanger: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(251,113,133,0.38)",
    background: "rgba(251,113,133,0.10)",
    color: "#fecdd3",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
  },

  // ✅ distribution chart
  checkPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(185,148,55,0.28)",
    background: "rgba(18,11,3,0.40)",
    cursor: "pointer",
    userSelect: "none",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(185,148,55,0.22)",
    background: "rgba(18,11,3,0.50)",
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    flexShrink: 0,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset",
  },
  barRow: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 260px) 1fr",
    gap: 16,
    alignItems: "center",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(185,148,55,0.22)",
    background: "rgba(20,12,4,0.60)",
  },
  barLeft: {
    minWidth: 0,
    lineHeight: 1.3,
  },
  barRight: {
    minWidth: 0,
    display: "grid",
    gap: 8,
  },
  barTrack: {
    height: 30,
    borderRadius: 8,
    border: "1px solid rgba(185,148,55,0.20)",
    background: "rgba(10,6,1,0.70)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    padding: 3,
  },
  barScaledWrap: {
    height: "100%",
    borderRadius: 6,
    overflow: "hidden",
    display: "flex",
    gap: 2,
  },
  barSeg: {
    height: "100%",
    minWidth: 4,
    transition: "width 0.2s ease",
  },
  barNumbers: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  barNumChip: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "5px 10px 5px 8px",
    borderRadius: 8,
    borderTop: "1px solid rgba(185,148,55,0.18)",
    borderRight: "1px solid rgba(185,148,55,0.18)",
    borderBottom: "1px solid rgba(185,148,55,0.18)",
    borderLeft: "3px solid rgba(185,148,55,0.18)",
    background: "rgba(18,11,3,0.55)",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
};