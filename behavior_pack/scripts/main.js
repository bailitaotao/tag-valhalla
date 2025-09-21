/**
 * TagValhalla - Creature Information Recording System
 * 主入口文件
 */

import { world, system, Entity, Player, ItemStack } from '@minecraft/server';
import { MobDataManager } from './mobDataManager.js';
import { NametagHandler } from './nametagHandler.js';
import { EventHandler } from './eventHandler.js';

class TagValhalla {
    constructor() {
        this.mobDataManager = new MobDataManager();
        this.nametagHandler = new NametagHandler();
        this.eventHandler = new EventHandler(this.mobDataManager, this.nametagHandler);
        
        this.init();
    }

    init() {
        console.log('TagValhalla 插件已加载');
        
        // Register event listeners
        this.eventHandler.registerEvents();
        
        // 启动定时任务
        this.startPeriodicTasks();
        
        // Display usage tips
        system.runTimeout(() => {
            console.log('=== TagValhalla 使用说明 ===');
            console.log('1. Use name tags to name creatures, they will be recorded by the system');
            console.log('2. When creatures die, they will drop name tags containing detailed information');
            console.log('3. Right-click to use info name tags to view creature survival records');
            console.log('4. Interact with creatures (feed/pet) to increase affection');
        }, 60); // Display usage tips after 3 seconds
    }

    startPeriodicTasks() {
        // Update mob survival time every second
        system.runInterval(() => {
            this.mobDataManager.updateMobLifetime();
        }, 20); // 20 ticks = 1 second
        
        // 每5秒保存一次数据
        system.runInterval(() => {
            this.mobDataManager.saveData();
        }, 100); // 100 ticks = 5 seconds
    }
}

// 启动插件
new TagValhalla();
