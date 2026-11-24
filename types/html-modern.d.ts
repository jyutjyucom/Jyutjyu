import "@vue/runtime-dom";

declare module "@vue/runtime-dom" {
  export interface HTMLAttributes {
    popover?: "auto" | "manual" | "hint" | "" | boolean | undefined;
  }

  export interface ButtonHTMLAttributes {
    popovertarget?: string | undefined;
    popovertargetaction?: "toggle" | "show" | "hide" | undefined;
  }

  export interface InputHTMLAttributes {
    popovertarget?: string | undefined;
    popovertargetaction?: "toggle" | "show" | "hide" | undefined;
  }

  export interface IntrinsicElementAttributes {
    search: HTMLAttributes;
  }

  export interface Events {
    onBeforematch: Event;
  }
}

export {};
