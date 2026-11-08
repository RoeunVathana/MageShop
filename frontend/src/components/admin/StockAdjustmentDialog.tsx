import React, { useState, useId } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { inventoryService } from '@/services/inventory.service'
import type { MovementType } from '@/types/inventory.types'
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'

interface StockAdjustmentDialogProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: number
    name: string
    sku: string
    quantity_on_hand: number
    quantity_reserved?: number
    available_stock?: number
  } | null
  onSuccess: () => void
}

export function StockAdjustmentDialog({
  isOpen,
  onClose,
  product,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const { toast } = useToast()
  const [movementType, setMovementType] = useState<MovementType>('STOCK_IN')
  const [adjustmentDirection, setAdjustmentDirection] = useState<'add' | 'subtract'>('add')
  const [quantity, setQuantity] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [reference, setReference] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!product) return null

  const currentOnHand = product.quantity_on_hand ?? 0
  const reserved = product.quantity_reserved ?? 0
  const parsedQty = parseInt(quantity, 10) || 0

  // Calculate actual quantity change based on type
  let effectiveChange = 0
  if (movementType === 'STOCK_IN' || movementType === 'RETURN') {
    effectiveChange = Math.abs(parsedQty)
  } else if (movementType === 'STOCK_OUT' || movementType === 'DAMAGE') {
    effectiveChange = -Math.abs(parsedQty)
  } else if (movementType === 'ADJUSTMENT') {
    effectiveChange = adjustmentDirection === 'add' ? Math.abs(parsedQty) : -Math.abs(parsedQty)
  }

  const projectedOnHand = currentOnHand + effectiveChange
  const projectedAvailable = Math.max(0, projectedOnHand - reserved)
  const isNegative = projectedOnHand < 0
  const violatesReserved = projectedOnHand < reserved

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (parsedQty <= 0) {
      setErrorMsg('Please enter a valid quantity greater than 0.')
      return
    }

    if (!reason.trim()) {
      setErrorMsg('A reason for this inventory adjustment is strictly required.')
      return
    }

    if (isNegative) {
      setErrorMsg(`Adjustment would result in negative inventory (${projectedOnHand}). Operation rejected.`)
      return
    }

    if (violatesReserved) {
      setErrorMsg(`Cannot reduce stock below reserved customer allocations (${reserved} reserved).`)
      return
    }

    setIsSubmitting(true)

    // Generate unique client idempotency key to prevent double submits
    const idempotencyKey = `adj_${product.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    try {
      const res = await inventoryService.adjustStock(product.id, {
        movement_type: movementType,
        quantity_change: effectiveChange,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
        idempotency_key: idempotencyKey,
      })

      toast({
        title: 'Inventory Adjusted Successfully',
        description: `${product.name} stock changed from ${res.data.movement.before_quantity} to ${res.data.movement.after_quantity}.`,
        type: 'success',
      })

      // Reset form state
      setQuantity('')
      setReason('')
      setReference('')
      setMovementType('STOCK_IN')
      onSuccess()
      onClose()
    } catch (err: any) {
      const message = err?.message || 'Failed to adjust stock. Please try again.'
      setErrorMsg(message)
      toast({
        title: 'Adjustment Failed',
        description: message,
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Adjust Inventory
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {product.sku}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground truncate">
            {product.name}
          </DialogDescription>
        </DialogHeader>

        {/* Current State Summary Card */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-lg border text-center text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">On Hand</span>
            <span className="font-bold text-base">{currentOnHand}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Reserved</span>
            <span className="font-bold text-base text-amber-600">{reserved}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Available</span>
            <span className="font-bold text-base text-emerald-600">
              {Math.max(0, currentOnHand - reserved)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Movement Type */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Action / Movement Type</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as MovementType)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="STOCK_IN">Stock In (Purchase Order / Restock)</option>
              <option value="STOCK_OUT">Stock Out (Manual Removal / Write-off)</option>
              <option value="RETURN">Customer Return (Restock to Shelf)</option>
              <option value="DAMAGE">Damaged / Expired Goods</option>
              <option value="ADJUSTMENT">Cycle Count Adjustment</option>
            </select>
          </div>

          {/* Adjustment Direction if Cycle Count */}
          {movementType === 'ADJUSTMENT' && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentDirection === 'add' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => setAdjustmentDirection('add')}
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                Add Units (+)
              </Button>
              <Button
                type="button"
                variant={adjustmentDirection === 'subtract' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => setAdjustmentDirection('subtract')}
              >
                <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
                Deduct Units (-)
              </Button>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Quantity Units</label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 25"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Projected Outcome Preview */}
          {parsedQty > 0 && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                isNegative || violatesReserved
                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                  : 'bg-primary/5 border-primary/20 text-foreground'
              }`}
            >
              <span>Projected Stock:</span>
              <div className="font-mono font-bold flex items-center gap-1.5">
                <span>{currentOnHand}</span>
                <span>&rarr;</span>
                <span className={effectiveChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {projectedOnHand}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({effectiveChange >= 0 ? `+${effectiveChange}` : effectiveChange})
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Audit Reason <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Weekly warehouse inventory reconciliation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Reference Document */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground">
              Reference Document (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g., PO-2026-1049 or RMA-8891"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isNegative || violatesReserved || parsedQty <= 0}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Locking & Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Adjustment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

