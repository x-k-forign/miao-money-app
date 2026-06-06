# miao~记账软件

二次元浅蓝主题的手机记账 App，使用 React Native + Expo + TypeScript 开发。

## 当前状态

- 已完成本地 MVP 的账单、分析、订阅管理和汇率换算主流程。
- Android APK 已完成本地构建和真机启动验证。
- `dist/miao-money-release.apk` 建议作为阶段测试安装包。
- APK 文件体积超过 GitHub 普通仓库文件限制，建议通过 GitHub Releases 发布。

## 技术栈

- Expo
- React Native
- TypeScript
- Expo Router
- SQLite / Drizzle ORM
- Zustand
- NativeWind
- react-native-gifted-charts

## 常用命令

```bash
npm run typecheck
npm run web
npm run android
```

## Android 包名

```text
com.miaomoney.app
```
