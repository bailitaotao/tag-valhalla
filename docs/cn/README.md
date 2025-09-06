<div align="center">

<h1>生平录</h1>
可掉落的命名牌
<br><br>

[![madewithlove](https://img.shields.io/badge/made_with-%E2%9D%A4-red?style=for-the-badge&labelColor=orange)](https://github.com/Bailitaotao/TagValhalla)

[![简体中文](https://img.shields.io/badge/简体中文-阅读文档-blue?style=for-the-badge&logo=googledocs&logoColor=white)](https://github.com/Bailitaotao/TagValhalla)
[![English](https://img.shields.io/badge/English-Read%20Docs-blue?style=for-the-badge&logo=googledocs&logoColor=white)](https://github.com/Bailitaotao/TagValhalla)
[![Change Log](https://img.shields.io/badge/Change%20Log-View%20Updates-blue?style=for-the-badge&logo=googledocs&logoColor=white)](https://github.com/Bailitaotao/TagValhalla)
[![License](https://img.shields.io/badge/LICENSE-MIT-green.svg?style=for-the-badge&logo=opensourceinitiative)](https://github.com/Bailitaotao/TagValhalla/blob/main/LICENSE)

[**English**](./README.md) | **中文简体** | [**日本語**](./docs/ja/README.md) | [**한국어**](./docs/ko/README.md) | [**Türkçe**](./docs/tr/README.md)

</div>

## 项目简介

还在为你的宠物亡逝无从纪念而感到烦恼吗？TagValhalla｜生平录可以为你的世界铭刻每一段传奇。本Addon可以在生物死亡时掉落带有详细信息记录的名牌（nametag）。这些名牌会记录生物的各种信息，包括生存时长、好感度、击杀统计等数据。
![Screenshot-2025-08-26-001738](https://github.com/user-attachments/assets/bef7751e-ee8d-4f95-b256-73d8bb3a7fbe)

## 功能特性

- 🏷️ **生物死亡掉落信息名牌**: 当命名的生物死亡时，会掉落一个包含其详细信息的名牌
- ⏱️ **生存时长记录**: 记录生物从生成到死亡的具体时间
- ❤️ **好感度系统**: 通过喂食、抚摸、治疗等互动提升好感度
- ⚔️ **击杀统计**: 记录生物击杀玩家和其他生物的详细数据
- 🤝 **互动记录**: 统计喂食、抚摸、治疗等互动次数
- 📍 **位置信息**: 记录生物的生成位置和维度
- 🩺 **健康状态**: 记录生物的血量信息
- 👥 **主人系统**: 对于可驯服生物，记录其主人信息

## 项目结构

```
TagValhalla/
├── behavior_pack/                 # 行为包
│   ├── manifest.json             # 行为包配置文件
│   ├── scripts/                  # JavaScript脚本文件
│   │   ├── main.js               # 主入口文件
│   │   ├── mobDataManager.js     # 生物数据管理器
│   │   ├── nametagHandler.js     # 名牌处理器
│   │   └── eventHandler.js       # 事件处理器
│   ├── items/                    # 物品定义
│   │   └── info_nametag.json     # 信息名牌物品定义
│   ├── entities/                 # 实体定义文件夹
│   └── loot_tables/              # 战利品表
│       └── mob_death_nametag.json
├── resource_pack/                # 资源包
│   ├── manifest.json             # 资源包配置文件
│   ├── textures/                 # 贴图文件
│   │   └── items/                # 物品贴图
│   └── models/                   # 模型文件
│       └── entity/               # 实体模型
├── README.md                     # 项目说明文档
└── USAGE.md                      # 使用说明
```

## 核心组件

### 1. MobDataManager (生物数据管理器)
- 负责存储和管理所有生物的数据
- 提供数据的增删改查功能
- 处理数据的保存和加载
- 格式化生物信息为可读文本

### 2. NametagHandler (名牌处理器)
- 创建带有生物信息的特殊名牌
- 处理名牌的数据存储和读取
- 生成名牌的显示信息和详细描述
- 提供数据压缩和解压缩功能

### 3. EventHandler (事件处理器)
- 监听游戏中的各种事件
- 处理生物生成、死亡、互动等事件
- 管理击杀统计和好感度更新
- 控制名牌的掉落逻辑

## 数据结构

每个被记录的生物包含以下信息：

```javascript
{
  id: "实体ID",
  typeId: "生物类型",
  name: "生物名称",
  spawnTime: "生成时间戳",
  lifetime: "生存秒数",
  killCount: {
    players: "击杀玩家数",
    mobs: "击杀生物数",
    specific: {} // 具体击杀类型统计
  },
  affection: "好感度(0-100)",
  interactions: {
    fed: "喂食次数",
    petted: "抚摸次数",
    healed: "治疗次数"
  },
  location: {
    dimension: "生成维度",
    x: "X坐标",
    y: "Y坐标", 
    z: "Z坐标"
  },
  health: {
    max: "最大血量",
    current: "当前血量"
  },
  owner: "主人名称",
  achievements: [], // 成就列表
  customData: {} // 自定义数据
}
```

## 安装和使用

1. 将 `behavior_pack` 文件夹复制到你的世界存档的 `behavior_packs` 目录
2. 将 `resource_pack` 文件夹复制到你的世界存档的 `resource_packs` 目录
3. 在世界设置中启用这两个包
4. **重要**：启用实验性功能中的 "Beta APIs" 和 "Script API"
5. 启动世界，addon将自动开始工作

## 使用说明

1. **为生物命名**: 使用普通名牌为生物命名，这样它们就会被系统记录
2. **与生物互动**: 通过喂食、抚摸、治疗等方式与生物互动，提升好感度
3. **查看信息**: 生物死亡后会掉落信息名牌，右键使用可查看详细信息
4. **收集记录**: 收集不同生物的信息名牌，建立你的生物档案

详细使用方法请参考 [USAGE.md](USAGE.md)

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

本项目采用MIT许可证。
