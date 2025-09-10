import { useAuth } from '../contexts/AuthContext'
import { 
  TrendingUp, 
  Users, 
  Building2, 
  Store, 
  BarChart3,
  Calendar,
  Activity
} from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()

  // For now, show a simple welcome dashboard without API calls
  // TODO: Implement dashboard API endpoint in backend
  const dashboardData = {
    stats: {
      totalMatches: 0,
      averageScore: 0,
      totalBrands: 0,
      totalRetailers: 0
    }
  }

  const stats = [
    {
      name: 'Total Matches',
      value: dashboardData.stats?.totalMatches || 0,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      name: 'Average Score',
      value: `${dashboardData.stats?.averageScore || 0}%`,
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      name: 'Profile Complete',
      value: dashboardData.profile ? 'Yes' : 'No',
      icon: user?.role === 'brand' ? Building2 : Store,
      color: dashboardData.profile ? 'bg-green-500' : 'bg-yellow-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.first_name || user?.firstName}! 
          {user?.role === 'admin' && ' Manage your RetailVerse platform.'}
          {user?.role === 'brand' && ' Discover retailers and analyze FIT scores.'}
          {user?.role === 'retailer' && ' Manage your product catalog and partnerships.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`inline-flex items-center justify-center p-3 rounded-md ${item.color} text-white`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd className="text-lg font-medium text-gray-900">{item.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user?.role === 'admin' && (
              <>
                <a
                  href="/admin"
                  className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                      <BarChart3 className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Admin Panel
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Manage users, upload data, and monitor system activity.
                    </p>
                  </div>
                </a>
              </>
            )}
            
            {user?.role === 'brand' && (
              <>
                <a
                  href="/fit-analysis"
                  className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                      <TrendingUp className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium">
                      <span className="absolute inset-0" aria-hidden="true" />
                      FIT Analysis
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Analyze retailer compatibility and calculate FIT scores.
                    </p>
                  </div>
                </a>
                <a
                  href="/brand/profile"
                  className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                      <Building2 className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Brand Profile
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Manage your brand information and categories.
                    </p>
                  </div>
                </a>
              </>
            )}
            
            {user?.role === 'retailer' && (
              <>
                <a
                  href="/retailer/profile"
                  className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-orange-50 text-orange-700 ring-4 ring-white">
                      <Store className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Retailer Profile
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Manage your retailer information and locations.
                    </p>
                  </div>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Status */}
      {!dashboardData.profile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Building2 className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Complete your profile
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  To get the most out of RetailVerse, please complete your {user?.role} profile.
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <a
                    href={user?.role === 'brand' ? '/brand/register' : `/${user?.role}/profile`}
                    className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                  >
                    Complete Profile
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <div className="mt-5">
            {dashboardData.recentActivity?.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {dashboardData.recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== dashboardData.recentActivity.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center ring-8 ring-white">
                              <Activity className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                {activity.event_type.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={activity.created_at}>
                                {new Date(activity.created_at).toLocaleDateString()}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href="/discovery"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Explore Discovery</p>
                <p className="text-sm text-gray-500">Find new partners</p>
              </div>
            </a>

            <a
              href={`/${user?.role}/profile`}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <Building2 className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Update Profile</p>
                <p className="text-sm text-gray-500">Manage your information</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 