/**
 * 名牌处理器
 * 负责生成和处理带有生物信息的名牌
 */

import { world, ItemStack } from '@minecraft/server';

export class NametagHandler {
    constructor() {
        this.nametagItemId = 'minecraft:name_tag';
    }

    /**
     * 创建带有生物信息的名牌
     */
    createInfoNametag(mobData, entity = null) {
        if (!mobData) return null;

        try {
            const nametag = new ItemStack(this.nametagItemId, 1);
            
            // 获取生物的当前名字：优先使用实体的nameTag，然后是存储的mobData.name
            const currentName = (entity && entity.nameTag) ? entity.nameTag : mobData.name;
            const displayName = `§6${currentName || '未命名生物'}的记录§r`;
            nametag.nameTag = displayName;

            // 设置Lore（描述信息）
            const lore = this.generateNametagLore({
                ...mobData,
                name: currentName // 使用当前名字更新lore
            });
            if (nametag.setLore) {
                nametag.setLore(lore);
            }

            // 设置动态属性存储完整数据
            this.setNametagData(nametag, {
                ...mobData,
                name: currentName // 使用当前名字存储数据
            });

            return nametag;
        } catch (error) {
            console.error('创建信息名牌失败:', error);
            return null;
        }
    }

    /**
     * 生成名牌的Lore信息
     */
    generateNametagLore(mobData) {
        const hours = Math.floor(mobData.lifetime / 3600);
        const minutes = Math.floor((mobData.lifetime % 3600) / 60);
        const seconds = mobData.lifetime % 60;

        return [
            `§7=== 生物信息记录 ===§r`,
            `§e类型: §f${mobData.typeId.replace('minecraft:', '')}`,
            `§e生存时间: §f${hours}时${minutes}分${seconds}秒`,
            `§e好感度: §f${mobData.affection}/100`,
            `§e击杀统计:§r`,
            `  §7- 玩家: §f${mobData.killCount.players}`,
            `  §7- 生物: §f${mobData.killCount.mobs}`,
            `§e互动统计:§r`,
            `  §7- 喂食: §f${mobData.interactions.fed}次`,
            `  §7- 抚摸: §f${mobData.interactions.petted}次`,
            `  §7- 治疗: §f${mobData.interactions.healed}次`,
            `§e生成信息:§r`,
            `  §7- 维度: §f${mobData.location.dimension}`,
            `  §7- 坐标: §f(${mobData.location.x}, ${mobData.location.y}, ${mobData.location.z})`,
            `§e健康信息:§r`,
            `  §7- 血量: §f${mobData.health.current}/${mobData.health.max}`,
            mobData.owner ? `§e主人: §f${mobData.owner}` : '',
            `§8记录于: ${new Date(mobData.spawnTime).toLocaleString()}§r`
        ].filter(line => line);
    }

    /**
     * 在名牌上设置数据
     */
    setNametagData(nametag, mobData) {
        try {
            // 生成唯一ID用于存储数据
            const uniqueId = `nametag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 压缩数据
            const compressedData = this.compressData({
                ...mobData,
                version: '1.0.0',
                createdAt: Date.now()
            });
            
            // 将数据存储到世界动态属性中
            const dataString = JSON.stringify(compressedData);
            world.setDynamicProperty(`tagvalhalla:nametag:${uniqueId}`, dataString);
            
            // 在名牌的lore中存储唯一ID（用于后续检索）
            const currentLore = nametag.getLore ? nametag.getLore() : [];
            const idLore = [`§8[ID:${uniqueId}]`];
            const newLore = [...currentLore, ...idLore];
            
            if (nametag.setLore) {
                nametag.setLore(newLore);
            }
            
            return uniqueId;
        } catch (error) {
            console.error('设置名牌数据失败:', error);
            return null;
        }
    }

    /**
     * 从名牌获取数据
     */
    getNametagData(nametag) {
        try {
            // 从lore中提取唯一ID
            const lore = nametag.getLore ? nametag.getLore() : [];
            const idLine = lore.find(line => line.startsWith('§8[ID:'));
            if (!idLine) return null;
            
            const idMatch = idLine.match(/§8\[ID:([^\]]+)\]/);
            if (!idMatch) return null;
            
            const uniqueId = idMatch[1];
            
            // 从世界动态属性中获取数据
            const dataString = world.getDynamicProperty(`tagvalhalla:nametag:${uniqueId}`);
            if (dataString) {
                return JSON.parse(dataString);
            }
        } catch (error) {
            console.error('获取名牌数据失败:', error);
        }
        return null;
    }

    /**
     * 压缩数据以适应存储限制
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
            achievements: mobData.achievements
        };
    }

    /**
     * 解压缩数据
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
            achievements: compressedData.achievements || []
        };
    }

    /**
     * 检查是否是信息名牌
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
     * 生成名牌显示的详细信息
     */
    getDetailedInfo(nametag) {
        const data = this.getNametagData(nametag);
        if (!data) return null;

        const decompressed = this.decompressData(data);
        return this.generateDetailedInfoText(decompressed);
    }

    /**
     * 生成详细信息文本
     */
    generateDetailedInfoText(mobData) {
        const hours = Math.floor(mobData.lifetime / 3600);
        const minutes = Math.floor((mobData.lifetime % 3600) / 60);
        
        let info = `§6=== ${mobData.name || '未命名生物'} 详细信息 ===§r\n\n`;
        info += `§e基础信息:§r\n`;
        info += `§7• 类型: §f${mobData.typeId.replace('minecraft:', '')}\n`;
        info += `§7• 生存时间: §f${hours}小时${minutes}分钟\n`;
        info += `§7• 好感度: §f${mobData.affection}/100\n\n`;
        
        info += `§e战斗统计:§r\n`;
        info += `§7• 击杀玩家: §f${mobData.killCount.players}\n`;
        info += `§7• 击杀生物: §f${mobData.killCount.mobs}\n`;
        
        if (Object.keys(mobData.killCount.specific).length > 0) {
            info += `§7• 详细击杀:\n`;
            for (const [type, count] of Object.entries(mobData.killCount.specific)) {
                info += `§8  - ${type.replace('minecraft:', '')}: §f${count}\n`;
            }
        }
        
        info += `\n§e互动记录:§r\n`;
        info += `§7• 喂食次数: §f${mobData.interactions.fed}\n`;
        info += `§7• 抚摸次数: §f${mobData.interactions.petted}\n`;
        info += `§7• 治疗次数: §f${mobData.interactions.healed}\n\n`;
        
        info += `§e位置信息:§r\n`;
        info += `§7• 生成维度: §f${mobData.location.dimension}\n`;
        info += `§7• 生成坐标: §f(${mobData.location.x}, ${mobData.location.y}, ${mobData.location.z})\n\n`;
        
        info += `§e健康状态:§r\n`;
        info += `§7• 血量: §f${mobData.health.current}/${mobData.health.max}\n\n`;
        
        if (mobData.owner) {
            info += `§e归属信息:§r\n`;
            info += `§7• 主人: §f${mobData.owner}\n\n`;
        }
        
        info += `§8记录时间: ${new Date(mobData.spawnTime).toLocaleString()}§r`;
        
        return info;
    }
}
