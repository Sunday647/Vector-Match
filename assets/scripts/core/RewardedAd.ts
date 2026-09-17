export type RewardedAdResult = 'rewarded' | 'closed' | 'unavailable' | 'error' | 'busy';

type RewardedAd = {
    load?: () => Promise<unknown>;
    show: () => Promise<unknown>;
    onClose: (handler: (res?: { isEnded?: boolean }) => void) => void;
    offClose?: (handler: (res?: { isEnded?: boolean }) => void) => void;
    onError?: (handler: (err: unknown) => void) => void;
    offError?: (handler: (err: unknown) => void) => void;
};

type WxLike = {
    createRewardedVideoAd?: (options: { adUnitId: string }) => RewardedAd;
};

let ad: RewardedAd | null = null;
let loading: Promise<unknown> | null = null;
let showing = false;

function wxObject(): WxLike | null {
    const g = globalThis as any;
    return g.wx || null;
}

export function initRewardedAd(adUnitId: string): boolean {
    const wx = wxObject();
    if (!adUnitId || !wx?.createRewardedVideoAd) return false;
    try {
        ad = wx.createRewardedVideoAd({ adUnitId });
        loading = ad.load ? ad.load().catch(() => null) : null;
        return true;
    } catch {
        ad = null;
        loading = null;
        return false;
    }
}

export async function showRewardedAd(): Promise<RewardedAdResult> {
    if (showing) return 'busy';
    if (!ad) return 'unavailable';
    showing = true;
    const current = ad;
    try {
        if (loading) await loading.catch(() => null);
        return await new Promise<RewardedAdResult>(resolve => {
            let settled = false;
            let phase: 'requesting' | 'playing' = 'requesting';
            let requestError = false;
            const finish = (result: RewardedAdResult) => {
                if (settled) return;
                settled = true;
                current.offClose?.(onClose);
                current.offError?.(onError);
                // A later invocation can load again; do not start work after settlement.
                loading = null;
                resolve(result);
            };
            const onClose = (res?: { isEnded?: boolean }) => finish(res?.isEnded === true ? 'rewarded' : 'closed');
            const onError = () => {
                if (phase === 'playing') finish('error');
                else requestError = true; // The request promise owns retry/termination.
            };
            const play = async () => {
                for (let attempt = 0; attempt < 2 && !settled; attempt++) {
                    requestError = false;
                    try {
                        if (attempt > 0) await current.load?.();
                        if (settled) return;
                        if (requestError) throw new Error('Ad load failed');
                        await current.show();
                        if (settled) return;
                        if (requestError) throw new Error('Ad show failed');
                        phase = 'playing';
                        return;
                    } catch {
                        if (settled) return;
                        if (attempt === 1) finish('error');
                    }
                }
            };
            current.onClose(onClose);
            current.onError?.(onError);
            void play();
        });
    } catch {
        return 'error';
    } finally {
        showing = false;
    }
}
