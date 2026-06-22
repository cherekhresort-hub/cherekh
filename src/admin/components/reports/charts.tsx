import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'

const tickStyle = { fontSize: 11, fill: '#857F70' }
const axisStyle = { stroke: '#E2E1DA' }

interface OccupancyDatum { day: string; occupancy: number }
export const OccupancyAreaChart = ({ data }: { data: OccupancyDatum[] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E4D2B" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#1E4D2B" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="#F1F1ED" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="day" tick={tickStyle} axisLine={axisStyle} tickLine={false} />
      <YAxis tick={tickStyle} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E1DA' }} />
      <Area type="monotone" dataKey="occupancy" stroke="#1E4D2B" strokeWidth={2} fill="url(#occ)" />
    </AreaChart>
  </ResponsiveContainer>
)

interface MonthlyBookingsDatum { month: string; bookings: number }
export const MonthlyBookingsBarChart = ({ data }: { data: MonthlyBookingsDatum[] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data}>
      <CartesianGrid stroke="#F1F1ED" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="month" tick={tickStyle} axisLine={axisStyle} tickLine={false} />
      <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E1DA' }} />
      <Bar dataKey="bookings" fill="#367E7E" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
)

interface SeasonalDatum { period: string; thisYear: number; lastYear: number }
export const SeasonalLineChart = ({ data }: { data: SeasonalDatum[] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <LineChart data={data}>
      <CartesianGrid stroke="#F1F1ED" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="period" tick={tickStyle} axisLine={axisStyle} tickLine={false} />
      <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E1DA' }} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Line type="monotone" dataKey="thisYear" stroke="#1E4D2B" strokeWidth={2.5} dot={{ r: 3 }} name="This year" />
      <Line type="monotone" dataKey="lastYear" stroke="#C8AE72" strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="6 4" name="Last year" />
    </LineChart>
  </ResponsiveContainer>
)

interface ReturnRateDatum { name: string; value: number }
const PIE_COLORS = ['#1E4D2B', '#367E7E', '#C8AE72']

export const ReturnRatePie = ({ data }: { data: ReturnRateDatum[] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <PieChart>
      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E1DA' }} />
      <Pie
        data={data}
        innerRadius={60}
        outerRadius={95}
        paddingAngle={3}
        dataKey="value"
        nameKey="name"
      >
        {data.map((_, idx) => (
          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
        ))}
      </Pie>
      <Legend
        verticalAlign="bottom"
        iconType="circle"
        wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
      />
    </PieChart>
  </ResponsiveContainer>
)

interface RevenueDatum { month: string; revenue: number; refunds: number }
export const RevenueBarChart = ({ data }: { data: RevenueDatum[] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data}>
      <CartesianGrid stroke="#F1F1ED" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="month" tick={tickStyle} axisLine={axisStyle} tickLine={false} />
      <YAxis
        tick={tickStyle}
        axisLine={false}
        tickLine={false}
        tickFormatter={(v: number) =>
          v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${v}`
        }
      />
      <Tooltip
        contentStyle={{ borderRadius: 12, border: '1px solid #E2E1DA' }}
        formatter={(v) => new Intl.NumberFormat('en-BD').format(Number(v) || 0)}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="revenue" fill="#1E4D2B" radius={[8, 8, 0, 0]} name="Revenue" />
      <Bar dataKey="refunds" fill="#DC2626" radius={[8, 8, 0, 0]} name="Refunds" />
    </BarChart>
  </ResponsiveContainer>
)

interface MethodDatum { name: string; value: number }
const METHOD_COLORS = ['#1E4D2B', '#367E7E', '#C8AE72', '#7C3AED', '#0284C7', '#857F70', '#9CA3AF']
export const PaymentMethodPie = ({ data }: { data: MethodDatum[] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <PieChart>
      <Tooltip
        contentStyle={{ borderRadius: 12, border: '1px solid #E2E1DA' }}
        formatter={(v) => new Intl.NumberFormat('en-BD').format(Number(v) || 0)}
      />
      <Pie
        data={data}
        innerRadius={55}
        outerRadius={95}
        paddingAngle={3}
        dataKey="value"
        nameKey="name"
      >
        {data.map((_, idx) => (
          <Cell key={idx} fill={METHOD_COLORS[idx % METHOD_COLORS.length]} />
        ))}
      </Pie>
      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
    </PieChart>
  </ResponsiveContainer>
)
