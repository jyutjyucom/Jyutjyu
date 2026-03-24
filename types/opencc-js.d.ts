/**
 * OpenCC.js 类型声明
 */

declare module "opencc-js" {
  export type ConversionOption = {
    from: "cn" | "tw" | "twp" | "hk" | "t";
    to: "cn" | "tw" | "twp" | "hk" | "t";
  };

  export type ConverterFunction = (text: string) => string;

  export function Converter(options: ConversionOption): ConverterFunction;
  export function CustomConverter(
    dict: Record<string, string>,
  ): ConverterFunction;
  export function HTMLConverter(
    converter: ConverterFunction,
    startNode: HTMLElement,
    fromLang: string,
    toLang: string,
  ): void;
}
