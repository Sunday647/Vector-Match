type AttemptSave = {
    levelId: string;
    version: number;
    attemptId: string;
    removed: string[];
    penalized: string[];
    hearts: number;
    hintUsed: boolean;
};

export type AdRewards = {
    date: string;
    dailyCount: number;
    levelRewardCount: Record<string, number>;
};

export type ProgressSave = {
    schemaVersion: number;
    index: number;
    completed: number;
    wins: Record<string, true>;
    attempts: Record<string, AttemptSave>;
    sound: boolean;
    music: boolean;
    adRewards: AdRewards;
    updatedAt: number;
    pendingCloudSync?: boolean;
};

const COLLECTION = 'player_progress';
const SCHEMA_VERSION = 1;
const MAX_DAILY_REWARDS = 5;
const MAX_LEVEL_REWARDS = 1;

type WxLike = {
    cloud?: {
        init?: (options: unknown) => void;
        database?: () => {
            collection: (name: string) => {
                where: (query: unknown) => { limit: (count: number) => { get: () => Promise<{ data: any[] }> } };
                doc: (id: string) => { update: (options: { data: unknown }) => Promise<unknown> };
                add: (options: { data: unknown }) => Promise<unknown>;
            };
        };
    };
};

let wxApi: WxLike | null = null;
let cloudReady = false;
let recordId = '';

function now(): number { return Date.now(); }
function today(): string { return new Date().toISOString().slice(0, 10); }

function wxObject(): WxLike | null {
    const g = globalThis as any;
    return g.wx || null;
}

export function emptyAdRewards(date = today()): AdRewards {
    return { date, dailyCount: 0, levelRewardCount: {} };
}

export function normalizeProgress(raw: any = {}): ProgressSave {
    const wins = raw.wins && typeof raw.wins === 'object' ? raw.wins : {};
    const attempts = raw.attempts && typeof raw.attempts === 'object' ? raw.attempts : {};
    const adRewards = raw.adRewards && typeof raw.adRewards === 'object' ? raw.adRewards : emptyAdRewards();
    return {
        schemaVersion: SCHEMA_VERSION,
        index: Math.max(0, Number(raw.index) || 0),
        completed: Math.max(0, Number(raw.completed) || 0),
        wins,
        attempts,
        sound: raw.sound !== false,
        music: raw.music !== false,
        adRewards: {
            date: typeof adRewards.date === 'string' ? adRewards.date : today(),
            dailyCount: Math.max(0, Number(adRewards.dailyCount) || 0),
            levelRewardCount: adRewards.levelRewardCount && typeof adRewards.levelRewardCount === 'object' ? adRewards.levelRewardCount : {},
        },
        updatedAt: Math.max(0, Number(raw.updatedAt) || 0),
        pendingCloudSync: !!raw.pendingCloudSync,
    };
}

export function mergeProgress(localRaw: any, cloudRaw: any | null): ProgressSave {
    const local = normalizeProgress(localRaw);
    if (!cloudRaw) return { ...local, updatedAt: local.updatedAt || now() };
    const cloud = normalizeProgress(cloudRaw);
    const completed = Math.max(local.completed, cloud.completed);
    const wins = { ...cloud.wins, ...local.wins };
    const attempts = cloud.updatedAt > local.updatedAt ? { ...local.attempts, ...cloud.attempts } : { ...cloud.attempts, ...local.attempts };
    const newer = cloud.updatedAt > local.updatedAt ? cloud : local;
    return {
        schemaVersion: SCHEMA_VERSION,
        index: Math.max(local.index, cloud.index, completed),
        completed,
        wins,
        attempts,
        sound: newer.sound,
        music: newer.music,
        adRewards: mergeAdRewards(local.adRewards, cloud.adRewards),
        updatedAt: Math.max(local.updatedAt, cloud.updatedAt, now()),
        pendingCloudSync: local.pendingCloudSync || completed > cloud.completed || Object.keys(wins).length > Object.keys(cloud.wins).length,
    };
}

function mergeAdRewards(a: AdRewards, b: AdRewards): AdRewards {
    if (a.date !== b.date) return a.date > b.date ? a : b;
    const keys = new Set([...Object.keys(a.levelRewardCount), ...Object.keys(b.levelRewardCount)]);
    const levelRewardCount: Record<string, number> = {};
    keys.forEach(k => levelRewardCount[k] = Math.max(Number(a.levelRewardCount[k]) || 0, Number(b.levelRewardCount[k]) || 0));
    return { date: a.date, dailyCount: Math.max(a.dailyCount, b.dailyCount), levelRewardCount };
}

export function canClaimAdReward(progressRaw: any, levelId: string): boolean {
    const p = normalizeProgress(progressRaw);
    const rewards = p.adRewards.date === today() ? p.adRewards : emptyAdRewards();
    return rewards.dailyCount < MAX_DAILY_REWARDS && (Number(rewards.levelRewardCount[levelId]) || 0) < MAX_LEVEL_REWARDS;
}

export function markAdReward(progressRaw: any, levelId: string): ProgressSave {
    const p = normalizeProgress(progressRaw);
    const rewards = p.adRewards.date === today() ? p.adRewards : emptyAdRewards();
    p.adRewards = {
        date: rewards.date,
        dailyCount: rewards.dailyCount + 1,
        levelRewardCount: { ...rewards.levelRewardCount, [levelId]: (Number(rewards.levelRewardCount[levelId]) || 0) + 1 },
    };
    p.updatedAt = now();
    p.pendingCloudSync = true;
    return p;
}

export function initCloud(envId: string): boolean {
    wxApi = wxObject();
    if (!envId || !wxApi?.cloud?.init || !wxApi.cloud.database) return false;
    try {
        wxApi.cloud.init({ env: envId });
        cloudReady = true;
        return true;
    } catch {
        cloudReady = false;
        return false;
    }
}

export async function loadCloudProgress(): Promise<ProgressSave | null> {
    if (!cloudReady || !wxApi?.cloud?.database) return null;
    const db = wxApi.cloud.database();
    const res = await db.collection(COLLECTION).where({}).limit(1).get();
    const doc = res.data && res.data[0];
    if (!doc) return null;
    recordId = doc._id || '';
    return normalizeProgress(doc);
}

export async function saveCloudProgress(progressRaw: any): Promise<void> {
    if (!cloudReady || !wxApi?.cloud?.database) return;
    const db = wxApi.cloud.database();
    const progress = normalizeProgress(progressRaw);
    progress.updatedAt = now();
    progress.pendingCloudSync = false;
    const { schemaVersion, index, completed, wins, attempts, sound, music, adRewards, updatedAt, pendingCloudSync } = progress;
    const data = { schemaVersion, index, completed, wins, attempts, sound, music, adRewards, updatedAt, pendingCloudSync };
    if (!recordId) {
        const existing = await db.collection(COLLECTION).where({}).limit(1).get();
        recordId = existing.data?.[0]?._id || '';
    }
    if (recordId) await db.collection(COLLECTION).doc(recordId).update({ data });
    else await db.collection(COLLECTION).add({ data });
}
