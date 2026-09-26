export type PrivacyAuthorizeResult = 'authorized' | 'denied' | 'unavailable';

type WxLike = {
    getPrivacySetting?: (options: { success?: (res: { needAuthorization?: boolean }) => void; fail?: () => void }) => void;
    requirePrivacyAuthorize?: (options: { success?: () => void; fail?: () => void }) => void;
    openPrivacyContract?: (options?: { success?: () => void; fail?: () => void }) => void;
};

function wxObject(): WxLike | null {
    const g = globalThis as any;
    return g.wx || null;
}

function hasWxRuntime(): boolean {
    return !!wxObject();
}

export async function requireLeaderboardPrivacy(): Promise<PrivacyAuthorizeResult> {
    const wx = wxObject();
    if (!hasWxRuntime()) return 'unavailable';
    if (!wx?.getPrivacySetting || !wx?.requirePrivacyAuthorize) return 'authorized';
    const needAuthorization = await new Promise<boolean>(resolve => {
        try {
            wx.getPrivacySetting?.({
                success: res => resolve(!!res.needAuthorization),
                fail: () => resolve(true),
            });
        } catch {
            resolve(true);
        }
    });
    if (!needAuthorization) return 'authorized';
    return new Promise<PrivacyAuthorizeResult>(resolve => {
        try {
            wx.requirePrivacyAuthorize?.({
                success: () => resolve('authorized'),
                fail: () => resolve('denied'),
            });
        } catch {
            resolve('denied');
        }
    });
}

export async function openPrivacyContract(): Promise<boolean> {
    const wx = wxObject();
    if (!wx?.openPrivacyContract) return false;
    return new Promise<boolean>(resolve => {
        try {
            wx.openPrivacyContract?.({
                success: () => resolve(true),
                fail: () => resolve(false),
            });
        } catch {
            resolve(false);
        }
    });
}
