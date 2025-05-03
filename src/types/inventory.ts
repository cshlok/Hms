// types/inventory.ts
import { BillableItem } from "./billing";

export interface InventoryItem {
    inventory_item_id: number;
    billable_item_id?: number | null; // Link to BillableItems if sellable
    item_name: string;
    category?: string | null;
    manufacturer?: string | null;
    unit_of_measure?: string | null;
    reorder_level: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Optional expanded details
    billable_item?: Pick<BillableItem, "item_id" | "item_code" | "unit_price">;
    // Optional: Calculated current total stock across all batches
    current_stock?: number;
}

export interface StockBatch {
    batch_id: number;
    inventory_item_id: number;
    batch_number?: string | null;
    expiry_date?: string | null; // YYYY-MM-DD
    quantity_received: number;
    current_quantity: number;
    cost_price_per_unit?: number | null;
    selling_price_per_unit?: number | null; // Can override BillableItem price
    supplier_id?: number | null;
    received_date: string;
    notes?: string | null;
    // Optional expanded details
    inventory_item?: Pick<InventoryItem, "inventory_item_id" | "item_name" | "category">;
}

