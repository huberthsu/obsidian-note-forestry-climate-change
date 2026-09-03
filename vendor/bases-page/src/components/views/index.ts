import { viewRegistry } from "../../registry";

import { boardViewRegistration } from "./board";
import { calendarViewRegistration } from "./calendar";
import { cardsViewRegistration } from "./cards";
import { galleryViewRegistration } from "./gallery";
import { kanbanViewRegistration } from "./kanban";
import { listViewRegistration } from "./list";
import { tableViewRegistration } from "./table";

export function registerBuiltinViews(): void {
  viewRegistry.register(tableViewRegistration);
  viewRegistry.register(listViewRegistration);
  viewRegistry.register(cardsViewRegistration);
  viewRegistry.register(galleryViewRegistration);
  viewRegistry.register(boardViewRegistration);
  viewRegistry.register(calendarViewRegistration);
  // Obsidian's actual kanban view emits `type: kanban-view` (distinct from
  // this package's own simpler "board" grouping view) and persists manual
  // column/card ordering under groupByProperty/columnOrders/cardOrders — see
  // kanban.tsx for why that needs its own renderer instead of aliasing board.
  viewRegistry.register(kanbanViewRegistration);
}
