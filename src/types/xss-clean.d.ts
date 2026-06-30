declare module "xss-clean" {
  import { RequestHandler } from "express";
  function xss(): RequestHandler;
  export default xss;
}

declare module "xss-clean/lib/xss" {
  export function clean(data: any): any;
}
