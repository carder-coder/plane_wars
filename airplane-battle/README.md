# 飞机大战游戏

一个基于React + TypeScript + Ant Design开发的策略对战游戏。

## 功能特点

- 🛩️ 双人对战模式
- 🤖 人机对战模式（智能AI）
- 📱 响应式设计，支持各种设备
- 🎮 直观的操作界面
- 📊 实时游戏统计
- 🎯 智能攻击提示

## 游戏规则

1. 玩家在10x10网格中放置飞机
2. 飞机由机头、机翅、机身、机尾组成
3. 轮流攻击对方网格
4. 首先击中对方机头的玩家获胜

## 技术栈

- React 18
- TypeScript
- Ant Design
- Zustand (状态管理)
- Vite (构建工具)

## 开发和运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
src/
├── components/          # React组件
│   ├── GridCell/       # 网格单元格
│   ├── GameGrid/       # 游戏网格
│   ├── ControlPanel/   # 控制面板
│   ├── StatusDisplay/  # 状态显示
│   └── GameContainer/  # 主容器
├── store/              # 状态管理
├── types/              # 类型定义
├── utils/              # 工具函数
└── hooks/              # 自定义Hook
```

## 游戏截图

TODO: 添加游戏截图

## 许可证

MIT License