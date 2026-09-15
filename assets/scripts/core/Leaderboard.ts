const KEY = 'level';

type WxLike = {
    setUserCloudStorage?: (options: { KVDataList: { key: string; value: string }[]; success?: () => void; fail?: () => void }) => void;
    getOpenDataContext?: () => { postMessage: (message: unknown) => void };
};

function wxObject(): WxLike | null {
    const g = globalThis as any;
    return g.wx || null;
}

export function reportBestLevel(completed: number): void {
    const wx = wxObject();
    if (!wx?.setUserCloudStorage) return;
    const value = String(Math.max(0, Math.floor(completed)));
    wx.setUserCloudStorage({ KVDataList: [{ key: KEY, value }] });
}

export function requestFriendRank(width: number, height: number, completed: number): boolean {
    const context = wxObject()?.getOpenDataContext?.();
    if (!context) return false;
    context.postMessage({ type: 'showRank', width, height, completed: Math.max(0, Math.floor(completed)) });
    return true;
}

export function drawSharedCanvas(x: number, y: number, width: number, height: number): boolean {
    const g = globalThis as any;
    const shared = g.sharedCanvas || (wxObject()?.getOpenDataContext?.() as any)?.canvas;
    const canvas = g.canvas;
    if (!shared || !canvas?.getContext) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx?.drawImage) return false;
    try {
        ctx.drawImage(shared, x, y, width, height);
        return true;
    } catch {
        return false;
    }
}
