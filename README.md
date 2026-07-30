# 棋境少女

一个零依赖、响应式的动漫风五子棋网站。玩家执黑先行，与二次元女主「凛」进行中等难度对战。

## 本地运行

```bash
npm test
npm run serve
```

打开 `http://localhost:4173`。

## Cloudflare Pages

- 生产分支：`main`
- 构建命令：留空或 `exit 0`
- 构建输出目录：`public`
- 正式域名：`https://lulisslce.cc.cd/`

游戏数据只保存在浏览器 `localStorage` 中，不会上传到服务器。
