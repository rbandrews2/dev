declare const google: any;

interface Window {
  google: any;
  showOpenFilePicker?: (...args: any[]) => Promise<any>;
  showSaveFilePicker?: (...args: any[]) => Promise<any>;
}

declare module "leaflet-tilelayer-mbtiles-ts";
declare module "jspdf-autotable";
