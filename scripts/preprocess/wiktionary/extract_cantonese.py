#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 Wiktionary 中文词条中提取粤语内容

数据来源: https://kaikki.org/dictionary/Chinese/
使用方法: python3 extract_cantonese.py [input.json] [output.jsonl]
详细说明: 见 docs/WIKTIONARY_GUIDE.md
"""

import json
import sys


def is_cantonese_entry(entry):
    """判断词条是否包含粤语内容"""
    # 检查sounds数组
    if "sounds" in entry:
        for sound in entry["sounds"]:
            if not isinstance(sound, dict):
                continue
            
            # 检查tags
            tags = sound.get("tags", [])
            if isinstance(tags, list):
                tags_str = [str(t).lower() for t in tags]
                if any("cantonese" in tag or "jyutping" in tag for tag in tags_str):
                    return True
            
            # 检查raw_tags
            raw_tags = sound.get("raw_tags", [])
            if isinstance(raw_tags, list):
                raw_tags_str = [str(t).lower() for t in raw_tags]
                if any("cantonese" in tag for tag in raw_tags_str):
                    return True
    
    # 检查senses数组
    if "senses" in entry:
        for sense in entry["senses"]:
            if not isinstance(sense, dict):
                continue
            
            # 检查sense的tags
            tags = sense.get("tags", [])
            if isinstance(tags, list):
                tags_str = [str(t).lower() for t in tags]
                if any("cantonese" in tag or "hong-kong" in tag or "hong kong" in tag 
                       for tag in tags_str):
                    return True
            
            # 检查raw_glosses
            raw_glosses = sense.get("raw_glosses", [])
            if isinstance(raw_glosses, list):
                for gloss in raw_glosses:
                    if isinstance(gloss, str) and "cantonese" in gloss.lower():
                        return True
    
    # 检查categories
    if "categories" in entry:
        categories = entry["categories"]
        if isinstance(categories, list):
            for cat in categories:
                if isinstance(cat, dict):
                    name = cat.get("name", "")
                    if isinstance(name, str) and "cantonese" in name.lower():
                        return True
                elif isinstance(cat, str) and "cantonese" in cat.lower():
                    return True
    
    return False


def extract_cantonese_entries(input_file, output_file):
    """从 Wiktionary 中文词条中提取粤语词条"""
    print("="*60)
    print("Wiktionary粤语词条提取工具")
    print("="*60)
    print(f"\n输入文件: {input_file}")
    print(f"输出文件: {output_file}\n")
    
    total_entries = 0
    cantonese_entries = 0
    
    try:
        with open(input_file, 'r', encoding='utf-8') as infile, \
             open(output_file, 'w', encoding='utf-8') as outfile:
            
            for line_num, line in enumerate(infile, 1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    entry = json.loads(line)
                    total_entries += 1
                    
                    # 显示进度
                    if total_entries % 10000 == 0:
                        print(f"已处理: {total_entries:,} 条 | "
                              f"提取: {cantonese_entries:,} 条粤语词条", 
                              end='\r')
                    
                    # 判断是否为粤语词条
                    if is_cantonese_entry(entry):
                        cantonese_entries += 1
                        # 写入输出文件
                        outfile.write(json.dumps(entry, ensure_ascii=False) + '\n')
                
                except json.JSONDecodeError as e:
                    print(f"\n警告: 第{line_num}行JSON解析失败: {e}")
                    continue
                except Exception as e:
                    print(f"\n警告: 第{line_num}行处理失败: {e}")
                    continue
        
        print("\n")
        print("="*60)
        print("提取完成！")
        print("="*60)
        print(f"总词条数:     {total_entries:,}")
        print(f"粤语词条数:   {cantonese_entries:,}")
        print(f"筛选率:       {cantonese_entries/total_entries*100:.2f}%")
        print(f"\n输出文件:     {output_file}")
        print("="*60)
    
    except FileNotFoundError:
        print(f"\n错误: 找不到输入文件 '{input_file}'")
        print("\n请先从以下地址下载Wiktionary中文词条数据：")
        print("https://kaikki.org/dictionary/Chinese/")
        print("\n下载文件: kaikki.org-dictionary-Chinese.jsonl")
        sys.exit(1)
    
    except Exception as e:
        print(f"\n错误: {e}")
        sys.exit(1)


def main():
    """主函数"""
    # 默认文件名
    input_file = "kaikki.org-dictionary-Chinese.jsonl"
    output_file = "wiktionary_cantonese_entries.jsonl"
    
    # 支持命令行参数
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    extract_cantonese_entries(input_file, output_file)


if __name__ == "__main__":
    main()
