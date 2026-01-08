#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
展示JSONL文件中词条的结构
"""

import json


def show_entry_structure(filename, num_samples=3):
    """展示词条结构"""
    output_file = "structure_analysis.txt"
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("="*80 + "\n")
        out.write("Wiktionary粤语词条结构分析\n")
        out.write("="*80 + "\n")
        
        with open(filename, 'r', encoding='utf-8') as f:
            for i in range(num_samples):
                line = f.readline().strip()
                if not line:
                    break
                
                entry = json.loads(line)
                
                out.write(f"\n{'='*80}\n")
                out.write(f"词条 {i+1}: {entry.get('word', 'N/A')}\n")
                out.write(f"{'='*80}\n\n")
                
                # 显示词条结构
                out.write(json.dumps(entry, ensure_ascii=False, indent=2))
                out.write("\n\n")
        
        # 显示字段说明
        out.write("="*80 + "\n")
        out.write("字段说明文档\n")
        out.write("="*80 + "\n")
        out.write("""
主要字段结构：

1. word (str): 词条本身，如 "book", "你好" 等

2. lang (str): 语言，通常是 "Chinese"
   lang_code (str): 语言代码，通常是 "zh"

3. pos (str): 词性（Part of Speech）
   常见值: noun, verb, adj, adv, character, name, phrase, proverb, 等

4. sounds (list): 发音信息数组
   每个sound对象包含:
   - zh_pron (str): 中文发音转写（粤拼、拼音等）
   - tags (list): 标签，如 ["Cantonese", "Jyutping"]
   - raw_tags (list): 原始标签，如 ["Standard-Cantonese", "Hong Kong"]
   - ipa (str): 国际音标 (IPA)

5. senses (list): 词义数组
   每个sense对象包含:
   - glosses (list): 释义
   - raw_glosses (list): 原始释义（含标签信息）
   - tags (list): 适用标签，如 ["Cantonese", "Hong-Kong"]
   - links (list): 相关链接
   - categories (list): 分类信息
   - examples (list): 例句（如果有）

6. head_templates (list): 词条头部模板信息
   - name (str): 模板名称
   - args (dict): 模板参数
   - expansion (str): 展开后的文本

7. forms (list): 词形变化
   - form (str): 变化形式
   - tags (list): 该形式的标签

8. etymology_text (str): 词源说明文本
   etymology_templates (list): 词源模板

9. categories (list): 分类信息（顶层）

10. related (list): 相关词汇
    derived (list): 派生词
    synonyms (list): 同义词
    antonyms (list): 反义词

11. id (str): 词条唯一标识符
""")
    
    print(f"结构分析已保存到: {output_file}")


if __name__ == "__main__":
    show_entry_structure("cantonese_entries.jsonl", num_samples=3)

