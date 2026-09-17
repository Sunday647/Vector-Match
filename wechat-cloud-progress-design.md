# 微信用户云端进度方案

## 目标

为《萌箭消消》增加微信用户级别的云端进度存储。不同微信用户进入同一个小游戏时，只能看到自己的关卡进度。

核心体验：

- 用户 A 已通关 10 关，下次进入首页时显示已通关 10 关，点击开始游戏直接进入第 11 关。
- 用户 B 已通关 100 关，下次进入首页时显示已通关 100 关，点击开始游戏直接进入第 101 关。
- 用户 A 和用户 B 的进度互不影响。
- 本地缓存仍保留，弱网或云端失败时不阻塞游戏。

## 推荐技术路径

使用微信小游戏云开发存储进度。

客户端使用：

- `wx.cloud.init({ env })`
- `wx.cloud.database()`

用户身份使用云开发自动注入的 `_openid`。客户端不直接管理 openid，也不把 openid 写在本地缓存里。

这样可以避免自己搭服务端，也能天然做到“同一个微信用户一条进度记录”。

## 数据集合

集合名建议：

```text
player_progress
```

每个微信用户只保存一条记录。记录通过 `_openid` 归属到当前微信用户。

建议字段：

```json
{
  "_id": "auto",
  "_openid": "微信云开发自动注入",
  "schemaVersion": 1,
  "completed": 10,
  "currentLevel": 10,
  "wins": {
    "0": true,
    "1": true,
    "2": true
  },
  "attempts": {
    "generated-v2-11-contour-v4": {
      "levelId": "generated-v2-11-contour-v4",
      "version": 4,
      "attemptId": "abc",
      "removed": [],
      "penalized": [],
      "hearts": 3,
      "hintUsed": false
    }
  },
  "settings": {
    "sound": true
  },
  "adRewards": {
    "date": "2026-09-13",
    "dailyCount": 0,
    "levelRewardCount": {}
  },
  "updatedAt": 1790000000000
}
```

字段说明：

- `completed`：连续通关数量。首页“开始游戏”使用这个字段决定下一关。
- `currentLevel`：最近一次停留的关卡索引，主要用于恢复中途挑战。
- `wins`：已通关关卡集合，避免用户跳关试玩后误判连续进度。
- `attempts`：未完成或失败中的关卡快照。
- `settings.sound`：声音开关等轻量设置。
- `adRewards`：激励视频奖励次数记录。
- `updatedAt`：云端合并和冲突处理用。

关卡索引从 0 开始存储。展示时加 1：

- `completed = 10`
- 下一关索引是 `10`
- 展示为“第 11 关”

## 首页开始游戏逻辑

首页不要直接使用固定本地关卡，而是先经过进度解析：

```text
启动游戏
  -> 读取本地进度
  -> 初始化首页，先用本地进度展示
  -> 静默读取云端进度
  -> 合并本地和云端
  -> 更新首页展示
  -> 点击开始游戏进入 completed + 1
```

示例：

用户 A 云端记录：

```json
{ "completed": 10 }
```

首页显示：

```text
已通关10关
开始游戏
第11关
```

点击进入：

```text
levelIndex = 10
```

用户 B 云端记录：

```json
{ "completed": 100 }
```

首页显示：

```text
已通关100关
开始游戏
第101关
```

点击进入：

```text
levelIndex = 100
```

## 本地与云端合并规则

合并原则：保护用户更高进度，不让旧设备覆盖新设备。

建议规则：

```text
completed = max(local.completed, cloud.completed)
wins = local.wins ∪ cloud.wins
attempts = 按 levelId 合并，updatedAt 新的优先
settings = updatedAt 新的优先
```

合并完成后：

1. 写回本地缓存。
2. 如果本地合并结果比云端新或更完整，再上传云端。

这样可以覆盖这些场景：

- 用户换手机后恢复最高关卡。
- 用户清空本地缓存后仍能从云端恢复。
- 弱网时本地先继续玩，网络恢复后补传。
- A 用户和 B 用户在同一台手机切换微信账号时不会串进度。

## 保存时机

不要每点一根箭头就上传云端，频率太高，也没有必要。

建议保存时机：

- 游戏启动后读取一次云端。
- 通关时立即上传。
- 失败时上传。
- 返回首页时上传。
- 小游戏切后台时上传。
- 声音开关变更时可以延迟上传。

本地缓存仍然可以更频繁保存，保证中途退出不丢。

## 客户端模块设计

新增模块：

```text
assets/scripts/core/CloudProgress.ts
```

建议接口：

```ts
export type ProgressSave = {
  schemaVersion: number;
  completed: number;
  currentLevel: number;
  wins: Record<string, true>;
  attempts: Record<string, unknown>;
  settings: {
    sound: boolean;
  };
  adRewards: {
    date: string;
    dailyCount: number;
    levelRewardCount: Record<string, number>;
  };
  updatedAt: number;
};

export async function initCloud(envId: string): Promise<boolean>;
export async function loadCloudProgress(): Promise<ProgressSave | null>;
export async function saveCloudProgress(progress: ProgressSave): Promise<void>;
export function mergeProgress(local: ProgressSave, cloud: ProgressSave | null): ProgressSave;
```

`Main.ts` 只负责调用，不直接写数据库细节。

## 云数据库读写策略

读取当前用户记录：

```text
db.collection('player_progress')
  .where({ _openid: '{openid}' })
  .limit(1)
  .get()
```

云开发安全规则可以限制用户只能读写自己的记录。实际实现时，推荐用云函数或数据库权限规则完成 `_openid` 限制，避免客户端伪造。

写入策略：

- 如果记录存在，执行 `update`。
- 如果记录不存在，执行 `add`。

为了避免多条记录，可以增加一个逻辑字段：

```json
{
  "owner": "self"
}
```

然后当前用户查询自己的唯一记录。更严格的唯一性可以通过云函数保证。

## 权限与隐私

这个功能不需要用户授权头像昵称。

只保存游戏进度，不保存手机号、昵称、头像等个人资料。

首页可以静默同步进度。如果云端同步失败，不弹阻塞窗口，只在必要时轻提示：

```text
云端进度暂时无法同步，已保存到本地
```

## 失败降级

如果云开发初始化失败：

- 游戏继续使用本地进度。
- 首页仍然可以开始游戏。
- 下次启动再尝试云端同步。

如果上传失败：

- 保留本地缓存。
- 标记 `pendingCloudSync = true`。
- 下次启动、通关、切后台时重试。

## 激励视频广告加爱心

### 功能目标

用户在关卡中可以通过观看微信激励视频广告获得 1 颗爱心。

核心体验：

- 用户完整看完广告后，当前关卡爱心值 +1。
- 用户中途关闭广告，不发放爱心。
- 广告奖励按微信用户隔离，用户 A 的领取次数不影响用户 B。
- 奖励结果同时写本地缓存和云端进度，换设备后仍能正确识别当天次数。

### 入口设计

第一版建议先放在失败弹窗中。

用户失去所有爱心后，弹窗显示：

```text
慢慢来，再试一次

[看广告 +1 心继续]
[重新挑战]
[回到主页]
```

完整看完广告后：

```text
hearts = min(maxHearts, hearts + 1)
关闭失败弹窗
回到当前关卡继续玩
保存本地进度
上传云端进度
```

后续也可以在关卡页爱心旁边加一个轻量入口，但第一版不建议让主界面变复杂。

### 推荐限制

建议第一版使用温和限制：

```text
每局最多 1 次广告复活
每天最多 5 次广告奖励
每次奖励 +1 心
爱心上限 3
```

这样既能救一次局，也不会让用户无限刷广告把难度完全打穿。

后续如果数据证明难关流失高，可以调成：

```text
普通关每局 1 次
高难关每局 2 次
每天最多 8 次
```

### 微信广告 API

新增模块：

```text
assets/scripts/core/RewardedAd.ts
```

建议接口：

```ts
export type RewardedAdResult = 'rewarded' | 'closed' | 'unavailable' | 'error';

export function initRewardedAd(adUnitId: string): void;
export function showRewardedAd(): Promise<RewardedAdResult>;
```

微信小游戏侧使用激励视频广告：

```ts
const ad = wx.createRewardedVideoAd({ adUnitId });

ad.show();
ad.onClose((res) => {
  if (res && res.isEnded) {
    // 完整观看，发放奖励
  } else {
    // 中途关闭，不发放奖励
  }
});
```

广告加载失败时不阻塞游戏，提示：

```text
广告暂时加载失败，请稍后再试
```

### 云端数据结构补充

在 `player_progress` 中增加广告奖励记录：

```json
{
  "adRewards": {
    "date": "2026-09-13",
    "dailyCount": 2,
    "levelRewardCount": {
      "generated-v2-11-contour-v4": 1
    }
  }
}
```

字段说明：

- `date`：统计日期。
- `dailyCount`：当天已领取广告奖励次数。
- `levelRewardCount`：每个关卡已领取广告奖励次数。

如果日期切换，`dailyCount` 和 `levelRewardCount` 重置。

更稳的实现是用云函数发放奖励，由云端检查次数并更新 `adRewards`。第一版也可以先由客户端检查和写入，但客户端逻辑更容易被绕过。

### 本地与云端合并

广告奖励记录合并规则：

```text
如果 local.date 和 cloud.date 相同：
  dailyCount = max(local.dailyCount, cloud.dailyCount)
  levelRewardCount 每个关卡取最大值

如果日期不同：
  使用日期更新的那份记录
```

爱心本身属于单局状态，继续保存在 `attempts[levelId].hearts` 中。

广告领取次数属于用户当天额度，保存在 `adRewards` 中。

### 状态流转

```text
用户失败
  -> hearts = 0
  -> 显示失败弹窗
  -> 用户点击“看广告 +1 心继续”
  -> 检查当天次数和本局次数
  -> 拉起激励视频
  -> 完整看完
  -> hearts = 1
  -> 本局广告复活次数 +1
  -> 当天广告奖励次数 +1
  -> 写本地
  -> 写云端
  -> 继续游戏
```

如果用户中途关闭广告：

```text
不加心
不增加广告奖励次数
仍停留失败弹窗
```

如果广告不可用：

```text
不加心
提示广告暂时不可用
允许用户重新挑战或回首页
```

## 验收用例

1. 新用户首次进入

预期：

```text
已通关0关
开始游戏 第1关
```

2. 用户 A 通关到第 10 关后重进

预期：

```text
已通关10关
开始游戏 第11关
```

3. 用户 B 通关到第 100 关后重进

预期：

```text
已通关100关
开始游戏 第101关
```

4. 同一台手机切换微信用户

预期：

```text
用户 A 看到 A 的进度
用户 B 看到 B 的进度
```

5. 清除本地缓存后重新进入

预期：

```text
从云端恢复该微信用户的 completed
开始游戏进入对应下一关
```

6. 断网通关后再联网

预期：

```text
断网时本地进度正常推进
联网后云端补传
```

7. 旧设备进度低，新设备进度高

预期：

```text
旧设备重新进入后同步到高进度
不会把云端进度覆盖回低进度
```

8. 完整观看激励视频

预期：

```text
当前关卡 hearts +1
本局回到 playing
本地和云端都记录广告奖励次数
```

9. 中途关闭激励视频

预期：

```text
不增加 hearts
不增加广告奖励次数
仍停留失败弹窗
```

10. 用户 A 和用户 B 广告额度隔离

预期：

```text
用户 A 当天已看 5 次，不影响用户 B 继续看广告领奖励
```

## 实施步骤

1. 在微信开发者工具中开通云开发环境。
2. 创建 `player_progress` 集合。
3. 配置集合权限为当前用户只能读写自己的记录。
4. 在项目配置中填入云开发 `envId`。
5. 新增 `CloudProgress.ts`。
6. 改造 `Main.ts` 的启动、保存、切后台逻辑。
7. 增加本地和云端合并测试。
8. 新增 `RewardedAd.ts`，接入微信激励视频广告。
9. 在失败弹窗中增加“看广告 +1 心继续”。
10. 增加广告奖励次数限制和合并测试。
11. 用两个微信账号做真机验收。

## 需要你提供的信息

开始实现前，需要确认：

```text
微信云开发 envId
微信激励视频广告 adUnitId
```

如果还没有 envId，需要先在微信开发者工具里开通云开发环境。

如果还没有 `adUnitId`，需要先在微信公众平台流量主或广告能力中创建激励视频广告位。
