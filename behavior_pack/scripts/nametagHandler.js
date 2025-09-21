/**
 * Name Tag Handler
 * Handles generation and processing of name tags with creature information
 */

import { world, ItemStack } from '@minecraft/server';

export class NametagHandler {
    constructor() {
        this.nametagItemId = 'minecraft:name_tag';
    }

    /**
     * Create name tag with creature information
     */
    createInfoNametag(mobData, entity = null) {
        if (!mobData) return null;

        try {
            const nametag = new ItemStack(this.nametagItemId, 1);
            
            // Calculate rarity
            const rarity = this.calculateRarity(mobData);
            const rarityConfig = this.getRarityConfig(rarity);
            
            // Get creature's current name: prioritize entity's nameTag, then stored mobData.name
            const currentName = (entity && entity.nameTag) ? entity.nameTag : mobData.name;
            const displayName = `${rarityConfig.name} ${currentName || 'Unnamed Creature'}'s Record§r`;
            nametag.nameTag = displayName;

            // 设置Lore（描述信息）
            const lore = this.generateNametagLore({
                ...mobData,
                name: currentName, // 使用当前名字更新lore
                rarity: rarity // Add rarity information
            });
            if (nametag.setLore) {
                nametag.setLore(lore);
            }

            // Apply rarity visual effects
            this.applyRarityEffects(nametag, rarity);

            // 设置动态属性存储完整数据
            this.setNametagData(nametag, {
                ...mobData,
                name: currentName, // 使用当前名字存储数据
                rarity: rarity // Store rarity
            });

            return nametag;
        } catch (error) {
                        console.error('Failed to apply rarity effects:', error);
            return null;
        }
    }

    /**
     * Generate name tag's lore information
     */
    generateNametagLore(mobData) {
        const hours = Math.floor(mobData.lifetime / 3600);
        const minutes = Math.floor((mobData.lifetime % 3600) / 60);
        const seconds = mobData.lifetime % 60;

        const rarityConfig = this.getRarityConfig(mobData.rarity || 'common');

        return [
            `${rarityConfig.name}§7=== Creature Information Record ===§r`,
            `§eType: §f${mobData.typeId.replace('minecraft:', '')}`,
            `§eSurvival Time: §f${hours}h${minutes}m${seconds}s`,
            `§eAffection: §f${mobData.affection}/100`,
            `§eKill Statistics:§r`,
            `  §7- Players: §f${mobData.killCount.players}`,
            `  §7- Creatures: §f${mobData.killCount.mobs}`,
            `§eInteraction Statistics:§r`,
            `  §7- Fed: §f${mobData.interactions.fed} times`,
            `  §7- Petted: §f${mobData.interactions.petted} times`,
            `  §7- Healed: §f${mobData.interactions.healed} times`,
            `§eSpawn Information:§r`,
            `  §7- Dimension: §f${mobData.location.dimension}`,
            `  §7- Coordinates: §f(${mobData.location.x}, ${mobData.location.y}, ${mobData.location.z})`,
            `§eHealth Information:§r`,
            `  §7- Health: §f${mobData.health.current}/${mobData.health.max}`,
            mobData.owner ? `§eOwner: §f${mobData.owner}` : '',
            `§8Recorded at: ${new Date(mobData.spawnTime).toLocaleString()}§r`
        ].filter(line => line);
    }

    /**
     * Set data on name tag
     */
    setNametagData(nametag, mobData) {
        try {
            // Generate unique ID for data storage
            const uniqueId = `nametag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Compress data
            const compressedData = this.compressData({
                ...mobData,
                version: '1.0.0',
                createdAt: Date.now()
            });
            
            // Store data in world dynamic properties
            const dataString = JSON.stringify(compressedData);
            world.setDynamicProperty(`tagvalhalla:nametag:${uniqueId}`, dataString);
            
            // Store unique ID in name tag's lore (for later retrieval)
            const currentLore = nametag.getLore ? nametag.getLore() : [];
            const idLore = [`§8[ID:${uniqueId}]`];
            const newLore = [...currentLore, ...idLore];
            
            if (nametag.setLore) {
                nametag.setLore(newLore);
            }
            
            return uniqueId;
        } catch (error) {
            console.error('Failed to set name tag data:', error);
            return null;
        }
    }

    /**
     * Get data from name tag
     */
    getNametagData(nametag) {
        try {
            // Extract unique ID from lore
            const lore = nametag.getLore ? nametag.getLore() : [];
            const idLine = lore.find(line => line.startsWith('§8[ID:'));
            if (!idLine) return null;
            
            const idMatch = idLine.match(/§8\[ID:([^\]]+)\]/);
            if (!idMatch) return null;
            
            const uniqueId = idMatch[1];
            
            // Get data from world dynamic properties
            const dataString = world.getDynamicProperty(`tagvalhalla:nametag:${uniqueId}`);
            if (dataString) {
                return JSON.parse(dataString);
            }
        } catch (error) {
            console.error('Failed to get name tag data:', error);
        }
        return null;
    }

    /**
     * Compress data to fit storage limits
     */
    compressData(mobData) {
        return {
            id: mobData.id,
            type: mobData.typeId,
            name: mobData.name,
            spawn: mobData.spawnTime,
            life: mobData.lifetime,
            kills: mobData.killCount,
            affect: mobData.affection,
            inter: mobData.interactions,
            loc: mobData.location,
            hp: mobData.health,
            owner: mobData.owner,
            achievements: mobData.achievements,
            rarity: mobData.rarity || 'common'
        };
    }

    /**
     * Decompress data
     */
    decompressData(compressedData) {
        return {
            id: compressedData.id,
            typeId: compressedData.type,
            name: compressedData.name,
            spawnTime: compressedData.spawn,
            lifetime: compressedData.life,
            killCount: compressedData.kills,
            affection: compressedData.affect,
            interactions: compressedData.inter,
            location: compressedData.loc,
            health: compressedData.hp,
            owner: compressedData.owner,
            achievements: compressedData.achievements || [],
            rarity: compressedData.rarity || 'common'
        };
    }

    /**
     * Check if it's an info name tag
     */
    isInfoNametag(item) {
        if (!item || item.typeId !== this.nametagItemId) return false;
        
        try {
            const lore = item.getLore ? item.getLore() : [];
            return lore.some(line => line.startsWith('§8[ID:'));
        } catch {
            return false;
        }
    }

    /**
     * Generate detailed information for name tag display
     */
    getDetailedInfo(nametag) {
        const data = this.getNametagData(nametag);
        if (!data) return null;

        const decompressed = this.decompressData(data);
        return this.generateDetailedInfoText(decompressed);
    }

    /**
     * Generate detailed information text
     */
    generateDetailedInfoText(mobData) {
        const hours = Math.floor(mobData.lifetime / 3600);
        const minutes = Math.floor((mobData.lifetime % 3600) / 60);
        
        const achievements = this.getAchievementDefinitions();
        
        let info = `§6=== ${mobData.name || 'Unnamed Mob'} Details ===§r\n\n`;
        info += `§eBasic Information:§r\n`;
        info += `§7• Type: §f${mobData.typeId.replace('minecraft:', '')}\n`;
        info += `§7• Survival Time: §f${hours} hours ${minutes} minutes\n`;
        info += `§7• Affection: §f${mobData.affection}/100\n\n`;
        
        info += `§eCombat Statistics:§r\n`;
        info += `§7• Players Killed: §f${mobData.killCount.players}\n`;
        info += `§7• Mobs Killed: §f${mobData.killCount.mobs}\n`;
        
        if (Object.keys(mobData.killCount.specific).length > 0) {
            info += `§7• Detailed Kills:\n`;
            for (const [type, count] of Object.entries(mobData.killCount.specific)) {
                info += `§8  - ${type.replace('minecraft:', '')}: §f${count}\n`;
            }
        }
        
        info += `\n§eInteraction Records:§r\n`;
        info += `§7• Times Fed: §f${mobData.interactions.fed}\n`;
        info += `§7• Times Petted: §f${mobData.interactions.petted}\n`;
        info += `§7• Times Healed: §f${mobData.interactions.healed}\n\n`;
        
        info += `§eLocation Information:§r\n`;
        info += `§7• Spawn Dimension: §f${mobData.location.dimension}\n`;
        info += `§7• Spawn Coordinates: §f(${mobData.location.x}, ${mobData.location.y}, ${mobData.location.z})\n\n`;
        
        info += `§eHealth Status:§r\n`;
        info += `§7• Health: §f${mobData.health.current}/${mobData.health.max}\n\n`;
        
        if (mobData.owner) {
            info += `§eOwnership Information:§r\n`;
            info += `§7• Owner: §f${mobData.owner}\n\n`;
        }
        
        // Display achievements
        if (mobData.achievements && mobData.achievements.length > 0) {
            info += `§eUnlocked Achievements:§r\n`;
            for (const achievementKey of mobData.achievements) {
                const achievement = achievements[achievementKey];
                if (achievement) {
                    info += `§7• ${achievement.icon} ${achievement.name}: §f${achievement.description}\n`;
                }
            }
            info += '\n';
        }
        
        info += `§8Recorded at: ${new Date(mobData.spawnTime).toLocaleString()}§r`;
        
        return info;
    }

    /**
     * Calculate name tag rarity
     */
    calculateRarity(mobData) {
        let score = 0;
        
        // Survival time score (max 20 points)
        const hours = mobData.lifetime / 3600;
        if (hours >= 24) score += 20; // 24 hours+
        else if (hours >= 12) score += 15; // 12 hours+
        else if (hours >= 6) score += 10; // 6 hours+
        else if (hours >= 1) score += 5; // 1 hour+
        
        // Affection score (max 15 points)
        if (mobData.affection >= 90) score += 15;
        else if (mobData.affection >= 70) score += 10;
        else if (mobData.affection >= 50) score += 5;
        
        // Kill statistics score (max 15 points)
        const totalKills = mobData.killCount.players + mobData.killCount.mobs;
        if (totalKills >= 100) score += 15;
        else if (totalKills >= 50) score += 10;
        else if (totalKills >= 20) score += 5;
        
        // Interaction count score (max 10 points)
        const totalInteractions = mobData.interactions.fed + mobData.interactions.petted + mobData.interactions.healed;
        if (totalInteractions >= 50) score += 10;
        else if (totalInteractions >= 20) score += 5;
        
        // Special achievement score (max 10 points)
        if (mobData.achievements && mobData.achievements.length > 0) {
            score += Math.min(10, mobData.achievements.length * 2);
        }
        
        // Rare mob type bonus
        const rareTypes = ['minecraft:ender_dragon', 'minecraft:wither', 'minecraft:elder_guardian'];
        if (rareTypes.includes(mobData.typeId)) score += 20;
        
        // Determine rarity
        if (score >= 60) return 'legendary';
        else if (score >= 40) return 'epic';
        else if (score >= 20) return 'rare';
        else return 'common';
    }

    /**
     * Get rarity configuration
     */
    getRarityConfig(rarity) {
        const configs = {
            common: {
                name: '§7Common§r',
                color: '§7',
                glow: false,
                enchant: false
            },
            rare: {
                name: '§9Rare§r',
                color: '§9',
                glow: true,
                enchant: false
            },
            epic: {
                name: '§5Epic§r',
                color: '§5',
                glow: true,
                enchant: true
            },
            legendary: {
                name: '§6Legendary§r',
                color: '§6',
                glow: true,
                enchant: true
            }
        };
        
        return configs[rarity] || configs.common;
    }

    /**
     * Apply rarity visual effects
     */
    applyRarityEffects(nametag, rarity) {
        try {
            const rarityConfig = this.getRarityConfig(rarity);
            
            // Add enchantment effects for rare and above name tags
            if (rarityConfig.enchant && nametag.setComponent) {
                nametag.setComponent('minecraft:enchantments', {
                    enchantments: {
                        unbreaking: 1
                    }
                });
            }
            
            // Add custom data marker for glowing rarities
            if (rarityConfig.glow) {
                // Use dynamic properties to mark glowing
                const uniqueId = `rarity_glow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                world.setDynamicProperty(`tagvalhalla:glow:${uniqueId}`, rarity);
                
                // Add glow marker to lore
                const currentLore = nametag.getLore ? nametag.getLore() : [];
                const glowLore = [`§8[GLOW:${uniqueId}]`];
                const newLore = [...currentLore, ...glowLore];
                
                if (nametag.setLore) {
                    nametag.setLore(newLore);
                }
            }
        } catch (error) {
            console.error('Failed to apply rarity effects:', error);
        }
    }

    /**
     * Get achievement definitions (from MobDataManager)
     */
    getAchievementDefinitions() {
        // Need to access MobDataManager here, but due to circular dependency, define directly
        return {
            long_liver: { name: 'Long Lived', description: 'Survived over 24 hours', icon: '⏰' },
            friendly: { name: 'Friendly', description: 'Reached 100 affection', icon: '💝' },
            warrior: { name: 'Warrior', description: 'Killed 50 mobs', icon: '⚔️' },
            killer: { name: 'Killer', description: 'Killed 10 players', icon: '💀' },
            beloved: { name: 'Beloved', description: 'Fed 100 times', icon: '🍖' },
            pampered: { name: 'Pampered', description: 'Petted 200 times', icon: '🖐️' },
            legendary_beast: { name: 'Legendary Beast', description: 'Rare mob with legendary name tag', icon: '👑' },
            perfect_companion: { name: 'Perfect Companion', description: 'Achieved both Long Lived and Friendly', icon: '🌟' }
        };
    }
}
