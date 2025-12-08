declare module 'bwip-js' {
  interface RenderOptions {
    bcid: string;
    text: string;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: 'offleft' | 'left' | 'center' | 'right' | 'offright' | 'justify';
    textyalign?: 'below' | 'center' | 'above';
    textcolor?: string;
    backgroundcolor?: string;
    barcolor?: string;
    bordercolor?: string;
  }

  export function toBuffer(options: RenderOptions): Promise<Buffer>;
  export function toSVG(options: RenderOptions): string;
}
