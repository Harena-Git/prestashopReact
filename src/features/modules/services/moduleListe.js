import Papa from "papaparse";
import { XMLBuilder } from "fast-xml-parser";
import { fetchModuleRecord } from "../../../api/prestashop.api";
import { MODULE_REGISTRY } from "../constants/moduleRegistry"; 

export function listModules() {
  return Object.keys(MODULE_REGISTRY);
}
