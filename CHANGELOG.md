# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/SemVer).

## [Unreleased]

### Added
- Pet variant system - Use name tags to transform into smaller versions of corresponding creatures
- Full English localization for all features and UI text
- Mob essence crafting system for permanent buffs
- Advanced tracking system to locate named creatures
- Pet summoning feature for rare name tags

### Changed
- Translated all Chinese text to English for international users
- Improved achievement system with more detailed rewards
- Enhanced rarity calculation algorithm

## [1.0.0] - 2025-09-21

### Added
- **Rarity System**: Name tags now have rarity tiers (Common, Rare, Epic, Legendary) based on mob attributes
- **Achievement System**: 8 different achievements with unique rewards including:
  - Long Lived (survive 24+ hours)
  - Friendly Messenger (reach 100 affection)
  - Warrior (kill 50 creatures)
  - Killer (kill 10 players)
  - Beloved (fed 100 times)
  - Pampered (petted 200 times)
  - Legendary Beast (rare mob types)
  - Perfect Companion (achieve both Long Lived and Friendly Messenger)
- **Special Effects**: Rare and above name tags grant visual effects and buffs
- **Interaction System**: Feed and pet mobs to increase affection levels
- **Data Persistence**: All mob information saved using Minecraft's dynamic properties
- **Detailed Information Display**: Right-click name tags to view comprehensive mob statistics
- **Automatic Name Tag Drops**: Mobs drop their information when killed

### Technical Features
- Dynamic property-based data storage for persistence across sessions
- Event-driven architecture for mob tracking and interactions
- Compressed data storage to handle large amounts of mob information
- Modular code structure with separate handlers for different systems

### Dependencies
- Minecraft Bedrock Edition Script API (@minecraft/server)
- Custom items and recipes for enhanced gameplay