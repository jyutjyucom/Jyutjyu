#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
粤语词条分析脚本
分析cantonese_entries.jsonl中的粤语词条统计信息
"""

import json
from collections import Counter, defaultdict


def analyze_cantonese_entries(input_file: str):
    """
    分析粤语词条的统计信息
    
    参数:
        input_file: 粤语词条JSONL文件路径
    """
    print("="*60)
    print("粤语词条统计分析")
    print("="*60)
    print(f"\n正在分析文件: {input_file}\n")
    
    total_entries = 0
    pos_counter = Counter()  # 词性统计
    word_lengths = []  # 词长统计
    has_jyutping = 0  # 包含粤拼的词条数
    has_ipa = 0  # 包含IPA的词条数
    etymology_sources = Counter()  # 词源统计
    sample_words = []  # 采样词条
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    entry = json.loads(line)
                    total_entries += 1
                    
                    # 词性统计
                    if "pos" in entry:
                        pos_counter[entry["pos"]] += 1
                    
                    # 词长统计
                    if "word" in entry:
                        word_lengths.append(len(entry["word"]))
                        
                        # 采样前20个词
                        if len(sample_words) < 20:
                            sample_words.append(entry["word"])
                    
                    # 检查是否有粤拼
                    if "sounds" in entry:
                        for sound in entry["sounds"]:
                            if isinstance(sound, dict):
                                if "tags" in sound and "Jyutping" in sound["tags"]:
                                    has_jyutping += 1
                                    break
                                if "zh_pron" in sound and any(tag == "Jyutping" for tag in sound.get("tags", [])):
                                    has_jyutping += 1
                                    break
                    
                    # 检查是否有IPA
                    if "sounds" in entry:
                        for sound in entry["sounds"]:
                            if isinstance(sound, dict) and "ipa" in sound:
                                # 检查是否为粤语IPA
                                if "tags" in sound and "Cantonese" in [str(t) for t in sound["tags"]]:
                                    has_ipa += 1
                                    break
                    
                    # 词源统计
                    if "etymology_text" in entry:
                        text = entry["etymology_text"].lower()
                        if "english" in text:
                            etymology_sources["English"] += 1
                        elif "japanese" in text:
                            etymology_sources["Japanese"] += 1
                        elif "portuguese" in text:
                            etymology_sources["Portuguese"] += 1
                
                except json.JSONDecodeError:
                    continue
        
        # 输出统计结果
        print(f"[统计] 总词条数: {total_entries:,}\n")
        
        print("=" * 40)
        print("词性分布 (Top 15):")
        print("=" * 40)
        for pos, count in pos_counter.most_common(15):
            percentage = count / total_entries * 100
            bar = "█" * int(percentage)
            print(f"{pos:15s} {count:6,} ({percentage:5.2f}%) {bar}")
        
        if word_lengths:
            avg_length = sum(word_lengths) / len(word_lengths)
            print(f"\n平均词长: {avg_length:.2f} 字符")
        
        print(f"\n包含粤拼 (Jyutping): {has_jyutping:,} ({has_jyutping/total_entries*100:.2f}%)")
        print(f"包含IPA音标: {has_ipa:,} ({has_ipa/total_entries*100:.2f}%)")
        
        if etymology_sources:
            print("\n词源分布 (Top 10):")
            print("-" * 40)
            for source, count in etymology_sources.most_common(10):
                print(f"  {source:20s} {count:6,}")
        
        if sample_words:
            print("\n词条样本 (前20个):")
            print("-" * 40)
            for i, word in enumerate(sample_words, 1):
                print(f"  {i:2d}. {word}")
        
        print("\n" + "="*60)
        print("分析完成！")
        print("="*60)
        
    except FileNotFoundError:
        print(f"错误: 找不到文件 '{input_file}'")
        return
    except Exception as e:
        print(f"错误: {e}")
        return


def main():
    """主函数"""
    input_file = "cantonese_entries.jsonl"
    analyze_cantonese_entries(input_file)


if __name__ == "__main__":
    main()

