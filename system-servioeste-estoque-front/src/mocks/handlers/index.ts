// Junta os handlers simulados de todas as áreas.
import { cadastrosHandlers } from "./cadastros"
import { comprasHandlers } from "./compras"
import { estoqueHandlers } from "./estoque"
import { relatoriosHandlers } from "./relatorios"

export const handlers = [...cadastrosHandlers, ...estoqueHandlers, ...comprasHandlers, ...relatoriosHandlers]
