import { Pool } from "pg";
declare const isDbDisabled: boolean;
declare let inMemoryBrandData: Map<string, any>;
declare let db: any;
declare let pool: Pool | null;
export { db, pool, isDbDisabled, inMemoryBrandData };
export * from "./schema/brand-interface.js";
//# sourceMappingURL=index.d.ts.map