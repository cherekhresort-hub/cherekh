import { Trash2 } from 'lucide-react'
import { extraLineTotal, FOOD_MEAL_LABELS, type ExtraCharge } from '../../../utils/bookings'
import { formatServiceDate, groupFoodExtras } from '../../../utils/foodBill'
import { formatBDT } from '../../utils/format'

interface FoodBillListProps {
  extras: ExtraCharge[]
  multiRoom: boolean
  onRemove: (extra: ExtraCharge) => void
}

export const FoodBillList = ({ extras, multiRoom, onRemove }: FoodBillListProps) => {
  const days = groupFoodExtras(extras)
  if (days.length === 0) {
    return <p className="text-xs text-stone-500">No food billed to this stay yet.</p>
  }

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <section key={day.date ?? 'undated'} className="rounded-xl border border-stone-100 overflow-hidden">
          <header className="flex items-center justify-between gap-2 bg-stone-50 px-3 py-2">
            <p className="text-sm font-medium text-stone-800">
              {day.date ? formatServiceDate(day.date, true) : 'Date not recorded'}
            </p>
            <p className="text-sm font-medium tabular-nums text-forest-700">{formatBDT(day.total)}</p>
          </header>
          <div className="space-y-3 px-3 py-2.5">
            {day.meals.map((mealGroup) => (
              <div key={mealGroup.meal ?? 'food'} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">
                    {mealGroup.meal ? FOOD_MEAL_LABELS[mealGroup.meal] : 'Food'}
                  </p>
                  {day.meals.length > 1 && (
                    <p className="text-[11px] tabular-nums text-stone-400">{formatBDT(mealGroup.total)}</p>
                  )}
                </div>
                {mealGroup.rooms.map((room) => (
                  <div key={room.roomName} className="space-y-1">
                    {multiRoom && (
                      <p className="flex items-center justify-between text-xs font-medium text-stone-600">
                        <span>{room.roomName}</span>
                        <span className="tabular-nums text-stone-400 font-normal">{formatBDT(room.total)}</span>
                      </p>
                    )}
                    <ChargeList extras={room.extras} hideRoom onRemove={onRemove} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export const ChargeList = ({
  title,
  extras,
  hideRoom,
  onRemove,
}: {
  title?: string
  extras: ExtraCharge[]
  hideRoom?: boolean
  onRemove: (extra: ExtraCharge) => void
}) => (
  <div className="space-y-1.5">
    {title && <p className="text-[10px] uppercase tracking-wide text-stone-400">{title}</p>}
    <ul className="space-y-1.5">
      {extras.map((extra) => (
        <li
          key={extra.id}
          className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="text-stone-800 truncate">
              {extra.name}
              {extra.quantity > 1 ? ` × ${extra.quantity}` : ''}
            </p>
            {!hideRoom && extra.roomName && <p className="text-[11px] text-stone-500">{extra.roomName}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-medium tabular-nums text-forest-700">{formatBDT(extraLineTotal(extra))}</span>
            <button
              type="button"
              onClick={() => onRemove(extra)}
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              aria-label={`Remove ${extra.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  </div>
)
