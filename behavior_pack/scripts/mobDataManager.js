/**
 * Mob Data Manager
 * Responsible for storing and managing various creature information
 */

import { world, Entity } from '@minecraft/server';

export class MobDataManager {
    constructor() {
        this.mobData = new Map(); // Store mob data
        this.playerData = new Map(); // Store player data
        this.loadData();
    }

    /**
     * Get mob data structure
     */
    createMobData(entity) {
        if (!entity) return null;
        
        try {
            const healthComponent = entity.getComponent('minecraft:health');
            const dimension = entity.dimension;
            const location = entity.location;
            
            return {
                id: entity.id || 'unknown',
                typeId: entity.typeId || 'unknown',
                name: entity.nameTag || '',
                spawnTime: Date.now(),
                lifetime: 0,
                killCount: {
                    players: 0,
                    mobs: 0,
                    specific: {} // Specific kill type statistics
                },
                affection: 0, // Affection level
                interactions: {
                    fed: 0, // Feeding count
                    petted: 0, // Petting count
                    healed: 0 // Healing count
                },
                location: {
                    dimension: dimension ? dimension.id : 'unknown',
                    x: location ? Math.floor(location.x) : 0,
                    y: location ? Math.floor(location.y) : 0,
                    z: location ? Math.floor(location.z) : 0
                },
                health: {
                    max: healthComponent ? healthComponent.maxValue : 20,
                    current: healthComponent ? healthComponent.currentValue : 20
                },
                owner: null, // Record owner if it's a pet
                isNamed: !!entity.nameTag,
                achievements: [], // Achievement list
                customData: {} // Custom data
            };
        } catch (error) {
            console.error('Failed to create mob data:', error);
            return null;
        }
    }

    /**
     * Register new mob
     */
    registerMob(entity) {
        if (!entity || !entity.id) return false;
        
        try {
            if (!this.mobData.has(entity.id)) {
                const mobData = this.createMobData(entity);
                if (mobData) {
                    this.mobData.set(entity.id, mobData);
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to register mob:', error);
        }
        return false;
    }

    /**
     * Get mob data
     */
    getMobData(entityId) {
        return this.mobData.get(entityId);
    }

    /**
     * Update mob lifetime
     */
    updateMobLifetime() {
        const currentTime = Date.now();
        for (const [entityId, data] of this.mobData) {
            data.lifetime = Math.floor((currentTime - data.spawnTime) / 1000); // seconds
        }
    }

    /**
     * Record kill event
     */
    recordKill(killerEntityId, victimTypeId) {
        const killerData = this.mobData.get(killerEntityId);
        if (killerData) {
            if (victimTypeId.includes('player')) {
                killerData.killCount.players++;
            } else {
                killerData.killCount.mobs++;
            }
            
            if (!killerData.killCount.specific[victimTypeId]) {
                killerData.killCount.specific[victimTypeId] = 0;
            }
            killerData.killCount.specific[victimTypeId]++;
        }
    }

    /**
     * Update affection
     */
    updateAffection(entityId, amount) {
        const data = this.mobData.get(entityId);
        if (data) {
            data.affection += amount;
            data.affection = Math.max(0, Math.min(100, data.affection)); // Limit between 0-100
        }
    }

    /**
     * Record interaction
     */
    recordInteraction(entityId, type) {
        const data = this.mobData.get(entityId);
        if (data && data.interactions[type] !== undefined) {
            data.interactions[type]++;
        }
    }

    /**
     * Remove mob data
     */
    removeMobData(entityId) {
        return this.mobData.delete(entityId);
    }

    /**
     * Save data to world storage
     */
    saveData() {
        try {
            const dataToSave = {
                mobData: Object.fromEntries(this.mobData),
                playerData: Object.fromEntries(this.playerData),
                lastSaved: Date.now()
            };

            const fullString = JSON.stringify(dataToSave);
            const MAX_LEN = 32767; // dynamic property max length in Minecraft

            // Clear any previous stored keys first (single key, count, and chunked keys)
            world.setDynamicProperty('tagvalhalla:data', undefined);
            world.setDynamicProperty('tagvalhalla:data:count', undefined);
            let i = 0;
            while (world.getDynamicProperty(`tagvalhalla:data:${i}`) !== undefined) {
                world.setDynamicProperty(`tagvalhalla:data:${i}`, undefined);
                i++;
            }

            if (fullString.length <= MAX_LEN) {
                world.setDynamicProperty('tagvalhalla:data', fullString);
                // ensure no leftover chunked props
                world.setDynamicProperty('tagvalhalla:data:count', 1);
                return;
            }

            // Save as numbered chunks
            const chunks = [];
            for (let offset = 0; offset < fullString.length; offset += MAX_LEN) {
                chunks.push(fullString.slice(offset, offset + MAX_LEN));
            }

            for (let idx = 0; idx < chunks.length; idx++) {
                world.setDynamicProperty(`tagvalhalla:data:${idx}`, chunks[idx]);
            }
            world.setDynamicProperty('tagvalhalla:data:count', chunks.length);
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    /**
     * Load data from world storage
     */
    loadData() {
        try {
            // Try single-property first
            const single = world.getDynamicProperty('tagvalhalla:data');
            let savedData = null;
            if (single) {
                savedData = single;
            } else {
                const count = world.getDynamicProperty('tagvalhalla:data:count');
                if (typeof count === 'number' && count > 0) {
                    let parts = [];
                    for (let idx = 0; idx < count; idx++) {
                        const part = world.getDynamicProperty(`tagvalhalla:data:${idx}`);
                        if (typeof part !== 'string') {
                            throw new Error(`Missing dynamic property chunk: tagvalhalla:data:${idx}`);
                        }
                        parts.push(part);
                    }
                    savedData = parts.join('');
                }
            }

            if (savedData) {
                const data = JSON.parse(savedData);
                this.mobData = new Map(Object.entries(data.mobData || {}));
                this.playerData = new Map(Object.entries(data.playerData || {}));
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    /**
     * Get formatted mob info text
     */
    getFormattedMobInfo(entityId) {
        const data = this.getMobData(entityId);
        if (!data) return null;

        const hours = Math.floor(data.lifetime / 3600);
        const minutes = Math.floor((data.lifetime % 3600) / 60);
        const seconds = data.lifetime % 60;

        return [
            `§e=== ${data.name || 'Unnamed Creature'} ===§r`,
            `§7Type: §f${data.typeId.replace('minecraft:', '')}`,
            `§7Survival Time: §f${hours}h${minutes}m${seconds}s`,
            `§7Affection: §f${data.affection}/100`,
            `§7Kill Stats: §fPlayers ${data.killCount.players} | Creatures ${data.killCount.mobs}`,
            `§7Interactions: §fFed ${data.interactions.fed} | Petted ${data.interactions.petted}`,
            `§7Spawn Location: §f${data.location.dimension} (${data.location.x}, ${data.location.y}, ${data.location.z})`,
            `§7Current Health: §f${data.health.current}/${data.health.max}`,
            data.owner ? `§7Owner: §f${data.owner}` : '',
            `§8Recorded: ${new Date(data.spawnTime).toLocaleString()}`
        ].filter(line => line).join('\n');
    }

    /**
     * Achievement definitions
     */
    getAchievementDefinitions() {
        return {
            // Survival achievements
            long_liver: {
                name: 'Long Lived',
                description: 'Survive for more than 24 hours',
                icon: '⏰',
                condition: (mobData) => mobData.lifetime >= 86400, // 24 hours
                reward: { type: 'affection', value: 10 }
            },
            friendly: {
                name: 'Friendly Messenger',
                description: 'Reach 100 affection',
                icon: '💝',
                condition: (mobData) => mobData.affection >= 100,
                reward: { type: 'experience', value: 50 }
            },
            
            // Combat achievements
            warrior: {
                name: 'Warrior',
                description: 'Kill 50 creatures',
                icon: '⚔️',
                condition: (mobData) => (mobData.killCount.players + mobData.killCount.mobs) >= 50,
                reward: { type: 'health_boost', value: 5 }
            },
            killer: {
                name: 'Killer',
                description: 'Kill 10 players',
                icon: '💀',
                condition: (mobData) => mobData.killCount.players >= 10,
                reward: { type: 'damage_boost', value: 2 }
            },
            
            // Interaction achievements
            beloved: {
                name: 'Beloved',
                description: 'Fed 100 times',
                icon: '🍖',
                condition: (mobData) => mobData.interactions.fed >= 100,
                reward: { type: 'regeneration', value: 30 }
            },
            pampered: {
                name: 'Pampered',
                description: 'Petted 200 times',
                icon: '🖐️',
                condition: (mobData) => mobData.interactions.petted >= 200,
                reward: { type: 'speed_boost', value: 60 }
            },
            
            // Special achievements
            legendary_beast: {
                name: 'Legendary Beast',
                description: 'Legendary name tag for rare creatures',
                icon: '👑',
                condition: (mobData) => {
                    const rareTypes = ['minecraft:ender_dragon', 'minecraft:wither', 'minecraft:elder_guardian'];
                    return rareTypes.includes(mobData.typeId);
                },
                reward: { type: 'glow', value: true }
            },
            perfect_companion: {
                name: 'Perfect Companion',
                description: 'Achieve both Long Lived and Friendly Messenger',
                icon: '🌟',
                condition: (mobData) => mobData.lifetime >= 86400 && mobData.affection >= 100,
                reward: { type: 'all_buffs', value: true }
            }
        };
    }

    /**
     * Check and unlock achievements
     */
    checkAndUnlockAchievements(entityId) {
        const mobData = this.getMobData(entityId);
        if (!mobData) return [];
        
        const achievements = this.getAchievementDefinitions();
        const unlockedAchievements = [];
        
        for (const [key, achievement] of Object.entries(achievements)) {
            if (!mobData.achievements.includes(key) && achievement.condition(mobData)) {
                mobData.achievements.push(key);
                unlockedAchievements.push({
                    key: key,
                    ...achievement
                });
            }
        }
        
        return unlockedAchievements;
    }

    /**
     * Apply achievement reward
     */
    applyAchievementReward(player, achievement, entity) {
        try {
            const reward = achievement.reward;
            
            switch (reward.type) {
                case 'affection':
                    // Increase affection
                    if (entity) {
                        this.updateAffection(entity.id, reward.value);
                        player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: Affection +${reward.value}`);
                    }
                    break;
                    
                case 'experience':
                    // Give experience
                    player.addExperience(reward.value);
                    player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: Gained ${reward.value} experience`);
                    break;
                    
                case 'health_boost':
                    // Temporary health boost
                    if (entity) {
                        const healthComponent = entity.getComponent('minecraft:health');
                        if (healthComponent) {
                            const newMaxHealth = healthComponent.maxValue + reward.value;
                            healthComponent.setCurrentValue(Math.min(healthComponent.currentValue, newMaxHealth));
                            player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: Max health increased by ${reward.value} points`);
                        }
                    }
                    break;
                    
                case 'damage_boost':
                    // Temporary damage boost (via effect)
                    player.addEffect('minecraft:strength', reward.value * 20, { amplifier: 1 });
                    player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: Strength effect for ${reward.value} seconds`);
                    break;
                    
                case 'regeneration':
                    // Regeneration effect
                    if (entity) {
                        entity.addEffect('minecraft:regeneration', reward.value * 20, { amplifier: 1 });
                        player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: Regeneration effect for ${reward.value} seconds`);
                    }
                    break;
                    
                case 'speed_boost':
                    // Speed boost
                    if (entity) {
                        entity.addEffect('minecraft:speed', reward.value * 20, { amplifier: 1 });
                        player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: Speed effect for ${reward.value} seconds`);
                    }
                    break;
                    
                case 'glow':
                    // Glow effect
                    if (entity) {
                        entity.addEffect('minecraft:glowing', 600 * 20, { amplifier: 1 }); // 10 minutes
                        player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: Glowing effect for 10 minutes`);
                    }
                    break;
                    
                case 'all_buffs':
                    // All buff effects
                    if (entity) {
                        entity.addEffect('minecraft:regeneration', 300 * 20, { amplifier: 1 });
                        entity.addEffect('minecraft:speed', 300 * 20, { amplifier: 1 });
                        entity.addEffect('minecraft:strength', 300 * 20, { amplifier: 1 });
                        entity.addEffect('minecraft:glowing', 300 * 20, { amplifier: 1 });
                        player.sendMessage(`§aAchievement unlocked: ${achievement.icon} ${achievement.name}§r\n§7Reward: All buff effects for 5 minutes`);
                    }
                    break;
            }
        } catch (error) {
            console.error('Failed to apply achievement reward:', error);
        }
    }
}
