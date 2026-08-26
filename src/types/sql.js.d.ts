/**
 * sql.js ne publie pas de types. On décrit ici la surface réellement utilisée
 * (ouverture d'une base en mémoire + requêtes préparées) plutôt que de laisser
 * le module en `any` implicite.
 */
declare module 'sql.js' {
  export interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  }

  export interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): { columns: string[]; values: unknown[][] }[];
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
