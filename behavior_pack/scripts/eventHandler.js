/**
 * Event Handler
 * Responsible for listening to and processing various game events
 */

import { world, system, Entity, Player } from '@minecraft/server';

export class EventHandler {
    constructor(mobDataManager, nametagHandler) {
        this.mobDataManager = mobDataManager;
        this.nametagHandler = nametagHandler;
    }

    /**
     * Register all event listeners
     */
    registerEvents() {
        this.registerSpawnEvents();
        this.registerDeathEvents();
        this.registerInteractionEvents();
        this.registerItemEvents();
        this.registerPlayerEvents();
    }

    /**
     * Register mob spawn events
     */
    registerSpawnEvents() {
        world.afterEvents.entitySpawn.subscribe((event) => {
            const entity = event.entity;
            
            // Only process living entities, exclude items, experience orbs, etc.
            if (this.isMobEntity(entity)) {
                // Delay registration to ensure entity is fully loaded
                system.runTimeout(() => {
                    try {
                        this.mobDataManager.registerMob(entity);
                        console.log(`Registered new mob: ${entity.typeId} (ID: ${entity.id})`);
                    } catch (error) {
                        console.error('Failed to register new mob:', error);
                    }
                }, 1);
            }
        });
    }

    /**
     * Register death events
     */
    registerDeathEvents() {
        world.afterEvents.entityDie.subscribe((event) => {
            const deadEntity = event.deadEntity;
            const damageSource = event.damageSource;
            
            try {
                // If the deceased is a recorded mob
                if (this.isMobEntity(deadEntity)) {
                    const mobData = this.mobDataManager.getMobData(deadEntity.id);
                    if (mobData) {
                        // Check and unlock achievements
                        const unlockedAchievements = this.mobDataManager.checkAndUnlockAchievements(deadEntity.id);
                        
                        // Apply rewards for each unlocked achievement
                        if (damageSource && damageSource.damagingEntity && damageSource.damagingEntity instanceof Player) {
                            for (const achievement of unlockedAchievements) {
                                this.mobDataManager.applyAchievementReward(damageSource.damagingEntity, achievement, deadEntity);
                            }
                        }
                        
                        // Create info name tag, pass entity to get current name
                        const infoNametag = this.nametagHandler.createInfoNametag(mobData, deadEntity);
                        
                        if (infoNametag) {
                            // Drop name tag at death location
                            this.dropNametagAtLocation(deadEntity, infoNametag);
                            console.log(`${deadEntity.typeId} died, dropped info name tag`);
                        }
                        
                        // Record killer information
                        if (damageSource && damageSource.damagingEntity) {
                            this.handleKillEvent(damageSource.damagingEntity, deadEntity);
                        }
                        
                        // Clean up mob data
                        this.mobDataManager.removeMobData(deadEntity.id);
                    }
                }
                
                // If the killer is a recorded mob, update its kill statistics
                if (damageSource && damageSource.damagingEntity && this.isMobEntity(damageSource.damagingEntity)) {
                    this.mobDataManager.recordKill(damageSource.damagingEntity.id, deadEntity.typeId);
                }
            } catch (error) {
                console.error('Failed to handle death event:', error);
            }
        });
    }

    /**
     * Register interaction events
     */
    registerInteractionEvents() {
        world.afterEvents.playerInteractWithEntity.subscribe((event) => {
            try {
                const player = event.player;
                const entity = event.target;
                const item = event.itemStack;
                
                if (this.isMobEntity(entity)) {
                    const mobData = this.mobDataManager.getMobData(entity.id);
                    if (mobData) {
                        // Determine interaction type based on used item
                        if (item) {
                            if (item.typeId === 'minecraft:name_tag') {
                                // Player names entity — engine may apply name to entity in next tick, delay 1 tick to read entity's nameTag
                                this.mobDataManager.recordInteraction(entity.id, 'named');
                                system.runTimeout(() => {
                                    try {
                                        const appliedName = (entity && entity.nameTag) ? entity.nameTag : (item.nameTag || '');
                                        if (appliedName) {
                                            mobData.name = appliedName;
                                            mobData.isNamed = true;
                                            if (this.mobDataManager.saveData) this.mobDataManager.saveData();
                                        }
                                    } catch (e) {
                                        console.error('更新命名失败:', e);
                                    }
                                }, 1);
                            } else if (this.isFoodItem(item)) {
                                this.mobDataManager.recordInteraction(entity.id, 'fed');
                                this.mobDataManager.updateAffection(entity.id, 5);
                            } else if (this.isHealingItem(item)) {
                                this.mobDataManager.recordInteraction(entity.id, 'healed');
                                this.mobDataManager.updateAffection(entity.id, 10);
                            }
                        } else {
                            // Empty hand interaction counts as petting
                            this.mobDataManager.recordInteraction(entity.id, 'petted');
                            this.mobDataManager.updateAffection(entity.id, 2);
                        }
                        
                        // Set owner (for tameable mobs)
                        if (this.isTameableEntity(entity) && !mobData.owner && player && player.name) {
                            mobData.owner = player.name;
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to handle interaction event:', error);
            }
        });
    }

    /**
     * Register item usage events
     */
    registerItemEvents() {
        world.afterEvents.itemUse.subscribe((event) => {
            const player = event.source;
            const item = event.itemStack;
            
            // If using info name tag, display detailed information and apply special effects
            if (this.nametagHandler.isInfoNametag(item)) {
                const detailedInfo = this.nametagHandler.getDetailedInfo(item);
                if (detailedInfo) {
                    player.sendMessage(detailedInfo);
                    
                    // Check if it's a rare name tag and apply special effects
                    this.applyNametagEffects(player, item);
                }
            }
            // If the item used is mob essence
            else if (item.typeId === 'tagvalhalla:mob_essence') {
                this.applyMobEssenceEffects(player, item);
            }
        });
    }

    /**
     * Register player events
     */
    registerPlayerEvents() {
        world.afterEvents.playerJoin.subscribe((event) => {
            const player = event.player;
            if (player && player.name) {
                console.log(`玩家 ${player.name} 加入游戏`);
            }
        });

        world.afterEvents.playerLeave.subscribe((event) => {
            // playerLeave 事件中 player 可能不可用，使用 playerId
            const playerId = event.playerId;
            console.log(`玩家 ${playerId} 离开游戏`);
        });
    }

    /**
     * Handle kill events
     */
    handleKillEvent(killer, victim) {
        if (killer instanceof Player) {
            // Player kill records can be expanded later
            console.log(`Player ${killer.name} killed ${victim.typeId}`);
        }
    }

    /**
     * Drop name tag at specified location
     */
    dropNametagAtLocation(entity, nametag) {
        try {
            const location = entity.location;
            const dimension = entity.dimension;
            
            // Spawn item entity
            dimension.spawnItem(nametag, location);
        } catch (error) {
            console.error('Failed to drop name tag:', error);
        }
    }

    /**
     * Apply name tag special effects
     */
    applyNametagEffects(player, nametag) {
        try {
            const data = this.nametagHandler.getNametagData(nametag);
            if (!data) return;
            
            const decompressed = this.nametagHandler.decompressData(data);
            const rarity = decompressed.rarity || 'common';
            
            // Apply different effects based on rarity
            switch (rarity) {
                case 'rare':
                    this.applyRareEffects(player);
                    break;
                case 'epic':
                    this.applyEpicEffects(player);
                    break;
                case 'legendary':
                    this.applyLegendaryEffects(player);
                    break;
                default:
                    // Common name tags provide tracking feature
                    this.applyTrackingEffect(player, decompressed.typeId);
                    break;
            }
        } catch (error) {
            console.error('Failed to apply name tag effects:', error);
        }
    }

    /**
     * Apply rare name tag effects
     */
    applyRareEffects(player) {
        try {
            // Glowing effect for 30 seconds
            player.addEffect('minecraft:glowing', 30 * 20, { amplifier: 1 });
            // Speed boost for 15 seconds
            player.addEffect('minecraft:speed', 15 * 20, { amplifier: 1 });
            
            player.sendMessage('§9Rare name tag effects activated: §fGlowing 30s, Speed boost 15s');
        } catch (error) {
            console.error('Failed to apply rare effects:', error);
        }
    }

    /**
     * Apply epic name tag effects
     */
    applyEpicEffects(player) {
        try {
            // Base effects
            player.addEffect('minecraft:glowing', 60 * 20, { amplifier: 1 });
            player.addEffect('minecraft:speed', 30 * 20, { amplifier: 1 });
            player.addEffect('minecraft:strength', 20 * 20, { amplifier: 1 });
            player.addEffect('minecraft:regeneration', 10 * 20, { amplifier: 1 });
            
            player.sendMessage('§5Epic name tag effects activated: §fGlowing 60s, Speed 30s, Strength 20s, Regeneration 10s');
            
            // Pet summoning feature
            this.trySummonPet(player, 'epic');
            
        } catch (error) {
            console.error('Failed to apply epic effects:', error);
        }
    }

    /**
     * Apply legendary name tag effects
     */
    applyLegendaryEffects(player) {
        try {
            // Base effects
            player.addEffect('minecraft:glowing', 120 * 20, { amplifier: 1 });
            player.addEffect('minecraft:speed', 60 * 20, { amplifier: 2 });
            player.addEffect('minecraft:strength', 45 * 20, { amplifier: 2 });
            player.addEffect('minecraft:regeneration', 30 * 20, { amplifier: 2 });
            player.addEffect('minecraft:resistance', 30 * 20, { amplifier: 1 });
            player.addEffect('minecraft:jump_boost', 45 * 20, { amplifier: 1 });
            
            player.sendMessage('§6Legendary name tag effects activated: §fAll buffs for 2 minutes!');
            
            // Play sound effect
            player.playSound('random.levelup');
            
            // Pet summoning feature
            this.trySummonPet(player, 'legendary');
            
        } catch (error) {
            console.error('Failed to apply legendary effects:', error);
        }
    }

    /**
     * Apply mob essence effects
     */
    applyMobEssenceEffects(player, essence) {
        try {
            // Check if player has already used mob essence (via dynamic properties)
            const essenceUsedKey = `tagvalhalla:essence_used:${player.id}`;
            const hasUsedEssence = world.getDynamicProperty(essenceUsedKey);
            
            if (hasUsedEssence) {
                player.sendMessage('§cYou have already used Mob Essence! Each player can only use it once.');
                return;
            }
            
            // Mark as used
            world.setDynamicProperty(essenceUsedKey, true);
            
            // Grant permanent buff effects
            this.grantPermanentBuffs(player);
            
            // Play upgrade sound
            player.playSound('random.levelup');
            
            player.sendMessage('§bMob Essence activated! §fYou have gained permanent mob affinity bonuses!');
            
            // Consume item
            const inventory = player.getComponent('minecraft:inventory');
            if (inventory && inventory.container) {
                // Find and remove mob essence item
                for (let i = 0; i < inventory.container.size; i++) {
                    const item = inventory.container.getItem(i);
                    if (item && item.typeId === 'tagvalhalla:mob_essence') {
                        const newCount = item.amount - 1;
                        if (newCount > 0) {
                            item.amount = newCount;
                            inventory.container.setItem(i, item);
                        } else {
                            inventory.container.setItem(i, undefined);
                        }
                        break;
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to apply mob essence effects:', error);
        }
    }

    /**
     * Grant permanent buffs
     */
    grantPermanentBuffs(player) {
        try {
            // Increase player max health
            const healthComponent = player.getComponent('minecraft:health');
            if (healthComponent) {
                // Note: Minecraft Bedrock API may not support direct max health modification
                // Here we give a very long regeneration effect to simulate
                player.addEffect('minecraft:regeneration', 24 * 60 * 60 * 20, { amplifier: 0 }); // 24 hour regeneration
            }
            
            // Grant luck effect (long duration)
            player.addEffect('minecraft:luck', 30 * 60 * 20, { amplifier: 1 }); // 30 minute luck
            
            // Grant night vision
            player.addEffect('minecraft:night_vision', 60 * 60 * 20, { amplifier: 1 }); // 1 hour night vision
            
            // Grant experience bonus (via temporary effect)
            player.addExperience(1000);
            
            player.sendMessage('§bPermanent buffs activated:§r\n§7• Regeneration for 24 hours\n§7• Luck for 30 minutes\n§7• Night vision for 1 hour\n§7• Gained 1000 experience');
            
        } catch (error) {
            console.error('Failed to grant permanent buffs:', error);
        }
    }

    /**
     * Check if entity is a mob
     */
    isMobEntity(entity) {
        if (!entity || !entity.typeId) return false;
        
        // Exclude players, item entities, experience orbs, etc.
        const excludedTypes = [
            'minecraft:player',
            'minecraft:item',
            'minecraft:xp_orb',
            'minecraft:arrow',
            'minecraft:fishing_hook',
            'minecraft:ender_pearl',
            'minecraft:fireball',
            'minecraft:lightning_bolt'
        ];
        
        return !excludedTypes.includes(entity.typeId) && 
               !entity.typeId.includes('projectile') &&
               !entity.typeId.includes('item');
    }

    /**
     * Check if item is food
     */
    isFoodItem(item) {
        const foodItems = [
            'minecraft:wheat',
            'minecraft:carrot',
            'minecraft:potato',
            'minecraft:beetroot',
            'minecraft:apple',
            'minecraft:bread',
            'minecraft:cooked_beef',
            'minecraft:cooked_porkchop',
            'minecraft:cooked_chicken',
            'minecraft:cooked_fish',
            'minecraft:bone',
            'minecraft:rotten_flesh'
        ];
        
        return foodItems.includes(item.typeId);
    }

    /**
     * Check if item is healing item
     */
    isHealingItem(item) {
        const healingItems = [
            'minecraft:golden_apple',
            'minecraft:enchanted_golden_apple',
            'minecraft:potion',
            'minecraft:splash_potion'
        ];
        
        return healingItems.includes(item.typeId);
    }

    /**
     * Check if entity is tameable
     */
    isTameableEntity(entity) {
        const tameableTypes = [
            'minecraft:wolf',
            'minecraft:cat',
            'minecraft:parrot',
            'minecraft:horse',
            'minecraft:donkey',
            'minecraft:mule',
            'minecraft:llama'
        ];
        
        return tameableTypes.includes(entity.typeId);
    }

    /**
     * Apply tracking effect
     */
    applyTrackingEffect(player, mobTypeId) {
        try {
            // Find nearby mobs of this type
            const nearbyEntities = player.dimension.getEntities({
                location: player.location,
                maxDistance: 100, // Search range 100 blocks
                type: mobTypeId
            });
            
            if (nearbyEntities.length === 0) {
                player.sendMessage(`§7No §f${mobTypeId.replace('minecraft:', '')}§7 found within 100 blocks.`);
                return;
            }
            
            // Find the nearest mob
            let nearestEntity = null;
            let nearestDistance = Infinity;
            
            for (const entity of nearbyEntities) {
                const distance = this.calculateDistance(player.location, entity.location);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEntity = entity;
                }
            }
            
            if (nearestEntity) {
                const direction = this.getDirectionText(player.location, nearestEntity.location);
                const distanceText = Math.floor(nearestDistance);
                
                player.sendMessage(`§aTarget found!§r\n§7Type: §f${mobTypeId.replace('minecraft:', '')}\n§7Distance: §f${distanceText} blocks\n§7Direction: §f${direction}\n§7Coordinates: §f(${Math.floor(nearestEntity.location.x)}, ${Math.floor(nearestEntity.location.y)}, ${Math.floor(nearestEntity.location.z)})`);
                
                // Give temporary tracking effect
                player.addEffect('minecraft:glowing', 30 * 20, { amplifier: 1 });
                
                // For epic or legendary rarity, give stronger tracking effects
                // This can be expanded for more advanced tracking
            }
            
        } catch (error) {
            console.error('Failed to apply tracking effect:', error);
        }
    }

    /**
     * Calculate distance between two positions
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Get direction text
     */
    getDirectionText(fromPos, toPos) {
        const dx = toPos.x - fromPos.x;
        const dz = toPos.z - fromPos.z;
        
        const angle = Math.atan2(dz, dx) * 180 / Math.PI;
        const normalizedAngle = (angle + 360) % 360;
        
        if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return 'East';
        if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 'Southeast';
        if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 'South';
        if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 'Southwest';
        if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 'West';
        if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 'Northwest';
        if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 'North';
        if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return 'Northeast';
        
        return 'Unknown';
    }
    
    /**
     * Try to summon pet
     */
    trySummonPet(player, rarity) {
        try {
            // Check if player already has an active pet
            const activePetKey = `tagvalhalla:active_pet:${player.id}`;
            const activePet = world.getDynamicProperty(activePetKey);
            
            if (activePet) {
                player.sendMessage('§cYou already have an active pet! Please wait for it to disappear before summoning a new one.');
                return;
            }
            
            // Get the name tag data the player is currently using to determine pet type
            // Note: Need to get from current context, but due to API limitations, randomly select a common pet type
            const petTypes = ['minecraft:wolf', 'minecraft:cat', 'minecraft:parrot', 'minecraft:rabbit'];
            const randomPetType = petTypes[Math.floor(Math.random() * petTypes.length)];
            
            // Summon pet near player
            const spawnLocation = {
                x: player.location.x + (Math.random() - 0.5) * 4,
                y: player.location.y,
                z: player.location.z + (Math.random() - 0.5) * 4
            };
            
            const pet = player.dimension.spawnEntity(randomPetType, spawnLocation);
            
            if (pet) {
                // Set pet attributes
                pet.nameTag = `§b${rarity === 'legendary' ? 'Legendary' : 'Epic'} Pet§r`;
                pet.addTag('tagvalhalla_pet');
                pet.addTag(`owner:${player.id}`);
                
                // Give pet special effects
                if (rarity === 'legendary') {
                    pet.addEffect('minecraft:glowing', 30 * 60 * 20, { amplifier: 1 }); // 30 minute glowing
                    pet.addEffect('minecraft:strength', 30 * 60 * 20, { amplifier: 1 }); // 30 minute strength
                } else {
                    pet.addEffect('minecraft:glowing', 15 * 60 * 20, { amplifier: 1 }); // 15 minute glowing
                }
                
                // Record active pet
                world.setDynamicProperty(activePetKey, `${randomPetType}:${pet.id}`);
                
                // Set pet disappearance timer
                const duration = rarity === 'legendary' ? 30 * 60 * 20 : 15 * 60 * 20; // Legendary 30 minutes, Epic 15 minutes
                system.runTimeout(() => {
                    try {
                        if (pet.isValid()) {
                            pet.remove();
                            world.setDynamicProperty(activePetKey, undefined);
                            player.sendMessage('§7Your pet time has expired and has been automatically removed.');
                        }
                    } catch (error) {
                        console.error('Failed to remove pet:', error);
                    }
                }, duration);
                
                player.sendMessage(`§bPet summoned successfully! §fYou have gained a ${rarity === 'legendary' ? 'Legendary' : 'Epic'} pet for ${rarity === 'legendary' ? '30' : '15'} minutes.`);
                
                // Play summoning sound
                player.playSound('random.orb');
                
            } else {
                player.sendMessage('§cPet summoning failed, please try again.');
            }
            
        } catch (error) {
            console.error('Failed to summon pet:', error);
            player.sendMessage('§cPet summoning failed, please try again.');
        }
    }
}
