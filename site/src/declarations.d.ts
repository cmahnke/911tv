declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.svg?react" {
  import * as React from "react";
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.json" {
  const value: unknown;
  export default value;
}

declare module '@fontsource/press-start-2p';
declare module 'brotli-unicode/js';