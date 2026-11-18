import { existsSync } from "node:fs";

// Carrega o .env local pros testes de integração (MinIO e Postgres reais).
// Node 24 tem loadEnvFile nativo — sem dependência de dotenv.
if (existsSync(".env")) process.loadEnvFile(".env");

/**
 * Testes de integração NUNCA tocam o banco de desenvolvimento.
 *
 * Eles truncam tabelas e criam projetos de apoio; apontar pro banco real
 * significa ver "Projeto de Teste" no dashboard e perder dados importados.
 * O banco de teste é criado por: npm run db:test:setup
 */
const url = process.env.DATABASE_URL;
if (url && !url.includes("_test")) {
  process.env.DATABASE_URL = url.replace(/\/([^/?]+)(\?|$)/, "/$1_test$2");
}
