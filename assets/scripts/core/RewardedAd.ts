export type RewardedAdResult = 'rewarded' | 'closed' | 'unavailable' | 'error';

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
    if (!ad) return 'unavailable';
    if (loading) await loading.catch(() => null);
    return new Promise<RewardedAdResult>(resolve => {
        let settled = false;
        const finish = (result: RewardedAdResult) => {
            if (settled) return;
            settled = true;
            ad?.offClose?.(onClose);
            ad?.offError?.(onError);
            loading = ad?.load ? ad.load().catch(() => null) : null;
            resolve(result);
        };
        const onClose = (res?: { isEnded?: boolean }) => finish(res?.isEnded ? 'rewarded' : 'closed');
        const onError = () => finish('error');
        ad.onClose(onClose);
        ad.onError?.(onError);
        ad.show().catch(async () => {
            try {
                await ad?.load?.();
                await ad?.show();
            } catch {
                finish('error');
            }
        });
    });
}
