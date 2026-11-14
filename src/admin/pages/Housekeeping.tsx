import { useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { Tabs } from '../components/ui/Tabs'
import { HousekeepingBoard } from '../components/housekeeping/HousekeepingBoard'
import { HousekeepingHistory } from '../components/housekeeping/HousekeepingHistory'

type View = 'board' | 'history'

const Housekeeping = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const view: View = searchParams.get('view') === 'history' ? 'history' : 'board'
  const setView = (next: View) =>
    setSearchParams(
      (params) => {
        if (next === 'board') params.delete('view')
        else params.set('view', next)
        return params
      },
      { replace: true }
    )

  return (
    <>
      <TopBar
        title="Housekeeping"
        description="Coordinate cleaning tasks across all rooms"
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        <Tabs<View>
          value={view}
          onChange={setView}
          items={[
            { value: 'board', label: 'Board' },
            { value: 'history', label: 'History' },
          ]}
        />
        {view === 'board' ? (
          <>
            <HousekeepingBoard />
            <p className="text-xs text-stone-500">
              Tap the buttons on a room card (or drag it between columns) to update its status. Checking a guest out
              marks their rooms dirty automatically.
            </p>
          </>
        ) : (
          <HousekeepingHistory />
        )}
      </main>
    </>
  )
}

export default Housekeeping
