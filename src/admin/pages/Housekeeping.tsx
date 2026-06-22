import { TopBar } from '../components/layout/TopBar'
import { HousekeepingBoard } from '../components/housekeeping/HousekeepingBoard'

const Housekeeping = () => (
  <>
    <TopBar
      title="Housekeeping"
      description="Coordinate cleaning tasks across all rooms"
    />
    <main className="px-4 lg:px-8 py-6">
      <HousekeepingBoard />
      <p className="text-xs text-stone-500 mt-4">
        Tip: drag a task card between columns to update its status.
      </p>
    </main>
  </>
)

export default Housekeeping
