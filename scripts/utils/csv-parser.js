/**
 * CSV 解析工具
 * 使用 papaparse 解析 CSV 文件
 */

import Papa from "papaparse";
import fs from "fs";
import path from "path";

/**
 * 读取并解析 CSV 文件
 * @param {string} filePath - CSV 文件路径
 * @returns {Promise<Array<Object>>} 解析后的数据数组
 */
export async function parseCSV(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`文件不存在: ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, "utf-8");

  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      encoding: "utf-8",
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV 解析警告:", results.errors);
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(new Error(`CSV 解析失败: ${error.message}`));
      },
    });
  });
}

/**
 * 验证 CSV 必填字段
 * @param {Array<Object>} data - CSV 数据
 * @param {Array<string>} requiredFields - 必填字段列表
 * @returns {Array<Object>} 验证错误列表
 */
export function validateRequiredFields(data, requiredFields) {
  const errors = [];

  data.forEach((row, index) => {
    requiredFields.forEach((field) => {
      if (!row[field] || row[field].trim() === "") {
        errors.push({
          row: index + 2, // +2 因为有表头，且索引从0开始
          field,
          message: `必填字段 "${field}" 为空`,
        });
      }
    });
  });

  return errors;
}

/**
 * 清理字段值（去除首尾空格）
 * @param {Object} row - CSV 行数据
 * @returns {Object} 清理后的数据
 */
export function cleanRow(row) {
  const cleaned = {};
  for (const [key, value] of Object.entries(row)) {
    cleaned[key] = typeof value === "string" ? value.trim() : value;
  }
  return cleaned;
}
