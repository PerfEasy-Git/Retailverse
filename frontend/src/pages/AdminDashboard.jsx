import { useQuery } from 'react-query'
import api from '../services/api'
import { 
  Users, 
  Building2, 
  Store, 
  BarChart3,
  TrendingUp,
  Activity,
  Eye,
  Settings
} from 'lucide-react'

const AdminDashboard = () => {
  const { data: adminData, isLoading } = useQuery(
    ['admin-dashboard'],
    () => api.get('/admin/stats').then(res => res.data),
    {
      refetchInterval: 60000 // 1 minute
    }
  )

  const { data: analytics } = useQuery(
    ['admin-analytics'],
    () => api.get('/admin/analytics').then(res => res.data),
    {
      refetchInterval: 300000 // 5 minutes
    }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Users',
      value: adminData?.stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Total Brands',
      value: adminData?.stats?.totalBrands || 0,
      icon: Building2,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Total Retailers',
      value: adminData?.stats?.totalRetailers || 0,
      icon: Store,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive'
    },
    {
      name: 'Active Users',
      value: adminData?.stats?.activeUsers || 0,
      icon: Activity,
      color: 'bg-yellow-500',
      change: '+5%',
      changeType: 'positive'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and analytics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="mt-4">
                <span className={`text-sm font-medium ${
                  item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User Roles Breakdown */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">User Distribution</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {adminData?.stats?.userRoles?.brands || 0}
              </div>
              <div className="text-sm text-gray-500">Brands</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {adminData?.stats?.userRoles?.retailers || 0}
              </div>
              <div className="text-sm text-gray-500">Retailers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {adminData?.stats?.userRoles?.admins || 0}
              </div>
              <div className="text-sm text-gray-500">Admins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories and Regions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Categories */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Categories</h3>
            <div className="space-y-3">
              {adminData?.stats?.categories?.brands?.slice(0, 5).map((category, index) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{category}</span>
                  <span className="text-sm font-medium text-gray-900">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Regions</h3>
            <div className="space-y-3">
              {adminData?.stats?.regions?.brands?.slice(0, 5).map((region, index) => (
                <div key={region} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{region}</span>
                  <span className="text-sm font-medium text-gray-900">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Platform Analytics</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {analytics.analytics?.total_events || 0}
                </div>
                <div className="text-sm text-gray-500">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.analytics?.login_events || 0}
                </div>
                <div className="text-sm text-gray-500">Login Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.analytics?.search_events || 0}
                </div>
                <div className="text-sm text-gray-500">Search Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.analytics?.total_users || 0}
                </div>
                <div className="text-sm text-gray-500">Active Users</div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="#"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">View and edit user accounts</p>
              </div>
            </a>

            <a
              href="#"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-500">Detailed platform analytics</p>
              </div>
            </a>

            <a
              href="#"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <Settings className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Platform Settings</p>
                <p className="text-sm text-gray-500">Configure platform options</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard 